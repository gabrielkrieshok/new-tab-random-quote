// Background Service Worker - Remote quote sync (AirTable / Baserow)
import { Remote } from './core/remote.js';
import { Storage } from './core/storage.js';

class SyncManager {
    constructor() {
        this.syncInProgress = false;
        this.setupListeners();
        this.updateSyncSchedule();
    }

    setupListeners() {
        // Handle alarm events
        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'airtableSync') {
                this.performSync();
            }
        });

        // Handle messages from frontend
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'MANUAL_SYNC') {
                this.performSync().then(sendResponse);
                return true; // Keep channel open for async response
            }

            if (message.type === 'UPDATE_SYNC_SCHEDULE') {
                this.updateSyncSchedule({ reset: true }).then(() => sendResponse({ success: true }));
                return true;
            }

            if (message.type === 'TEST_CONNECTION') {
                this.testConnection().then(sendResponse);
                return true;
            }

            return false;
        });
    }

    // Make the alarm match the settings. The service worker restarts (and
    // re-runs this) every time an alarm fires, so an existing alarm with the
    // right period is left alone — recreating it would reset its 1-minute
    // delay and make it fire every minute regardless of the chosen frequency.
    // `reset` forces a fresh alarm after the user changes sync settings.
    async updateSyncSchedule({ reset = false } = {}) {
        try {
            const data = await Storage.get(['airtableSettings']);
            const settings = data.airtableSettings || {};
            const existing = await chrome.alarms.get('airtableSync');

            const periodInMinutes = settings.enabled && settings.autoSync
                ? { hourly: 60, daily: 24 * 60, weekly: 7 * 24 * 60 }[settings.syncFrequency || 'daily']
                : null;

            if (!periodInMinutes) {
                if (existing) await chrome.alarms.clear('airtableSync');
                return;
            }

            if (existing && !reset && existing.periodInMinutes === periodInMinutes) {
                return;
            }

            await chrome.alarms.clear('airtableSync');
            await chrome.alarms.create('airtableSync', {
                delayInMinutes: 1,
                periodInMinutes
            });
            console.log(`${Remote.provider(settings).name} sync scheduled: ${settings.syncFrequency}`);
        } catch (error) {
            console.error('Failed to update sync schedule:', error);
        }
    }

    async testConnection() {
        try {
            const data = await Storage.get(['airtableSettings']);
            return await Remote.testConnection(data.airtableSettings);
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async performSync() {
        if (this.syncInProgress) {
            return { success: false, error: 'Sync already in progress' };
        }

        this.syncInProgress = true;
        console.log('Starting remote quote sync');

        try {
            const result = await Remote.sync();

            if (result.success) {
                console.log(`Remote sync completed: ${result.recordCount} quotes`);
            }

            return result;
        } catch (error) {
            console.error('Remote sync failed:', error);
            return { success: false, error: error.message };
        } finally {
            this.syncInProgress = false;
        }
    }
}

// Initialize sync manager
console.log('Background service worker started');
const syncManager = new SyncManager();

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log('Extension started');
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed/updated');
});
