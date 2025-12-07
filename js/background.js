// Background Service Worker - Simplified AirTable Sync
import { AirTable } from './core/airtable.js';
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
                this.updateSyncSchedule().then(() => sendResponse({ success: true }));
                return true;
            }

            if (message.type === 'TEST_CONNECTION') {
                this.testConnection().then(sendResponse);
                return true;
            }

            return false;
        });
    }

    async updateSyncSchedule() {
        try {
            const data = await Storage.get(['airtableSettings']);
            const settings = data.airtableSettings || {};

            // Clear existing alarms
            await chrome.alarms.clear('airtableSync');

            if (settings.enabled && settings.autoSync) {
                const periodInMinutes = {
                    hourly: 60,
                    daily: 24 * 60,
                    weekly: 7 * 24 * 60
                }[settings.syncFrequency];

                if (periodInMinutes) {
                    await chrome.alarms.create('airtableSync', {
                        delayInMinutes: 1,
                        periodInMinutes
                    });
                    console.log(`AirTable sync scheduled: ${settings.syncFrequency}`);
                }
            }
        } catch (error) {
            console.error('Failed to update sync schedule:', error);
        }
    }

    async testConnection() {
        try {
            const data = await Storage.get(['airtableSettings']);
            return await AirTable.testConnection(data.airtableSettings);
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async performSync() {
        if (this.syncInProgress) {
            return { success: false, error: 'Sync already in progress' };
        }

        this.syncInProgress = true;
        console.log('Starting AirTable sync');

        try {
            const result = await AirTable.sync();

            if (result.success) {
                console.log(`AirTable sync completed: ${result.recordCount} quotes`);
            }

            return result;
        } catch (error) {
            console.error('AirTable sync failed:', error);
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
