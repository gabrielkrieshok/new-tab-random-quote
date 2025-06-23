// Background Service Worker for AirTable Sync
console.log('Background script starting...');

class AirTableSyncManager {
    constructor() {
        console.log('AirTableSyncManager constructor called');
        this.syncInProgress = false;
        this.maxRetries = 3;
        this.baseDelay = 1000; // 1 second
        
        try {
            this.setupAlarms();
            this.setupMessageHandlers();
            console.log('AirTableSyncManager setup complete');
        } catch (error) {
            console.error('Error in AirTableSyncManager constructor:', error);
            throw error;
        }
    }

    setupAlarms() {
        // Listen for alarm events
        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'airtableSync') {
                this.performSync('scheduled');
            }
        });

        // Set up initial sync schedule
        this.updateSyncSchedule();
    }

    setupMessageHandlers() {
        // The message handler is set up globally, this method handles specific sync messages
        this.handleSyncMessages = (message, sender, sendResponse) => {
            console.log('Sync manager handling message:', message.type);
            
            if (message.type === 'MANUAL_SYNC') {
                this.performSync('manual').then(result => {
                    sendResponse(result);
                }).catch(error => {
                    sendResponse({ success: false, error: error.message });
                });
                return true; // Keep message channel open for async response
            }

            if (message.type === 'UPDATE_SYNC_SCHEDULE') {
                this.updateSyncSchedule().then(() => {
                    sendResponse({ success: true });
                }).catch(error => {
                    sendResponse({ success: false, error: error.message });
                });
                return true;
            }

            if (message.type === 'TEST_CONNECTION') {
                this.testAirTableConnection().then(result => {
                    sendResponse(result);
                }).catch(error => {
                    sendResponse({ success: false, error: error.message });
                });
                return true;
            }

            return false; // Let other handlers deal with unknown messages
        };
    }

    async updateSyncSchedule() {
        try {
            const result = await chrome.storage.sync.get(['airtableSettings']);
            const settings = result.airtableSettings || {};

            // Clear existing alarms
            await chrome.alarms.clear('airtableSync');

            if (settings.enabled && settings.autoSync && settings.syncFrequency !== 'off') {
                let periodInMinutes;
                switch (settings.syncFrequency) {
                    case 'hourly':
                        periodInMinutes = 60;
                        break;
                    case 'daily':
                        periodInMinutes = 24 * 60;
                        break;
                    case 'weekly':
                        periodInMinutes = 7 * 24 * 60;
                        break;
                    default:
                        return; // No sync scheduled
                }

                // Create new alarm
                await chrome.alarms.create('airtableSync', {
                    delayInMinutes: 1, // First sync in 1 minute
                    periodInMinutes: periodInMinutes
                });

                console.log(`AirTable sync scheduled: ${settings.syncFrequency}`);
            }
        } catch (error) {
            console.error('Failed to update sync schedule:', error);
        }
    }

    async testAirTableConnection() {
        try {
            const result = await chrome.storage.sync.get(['airtableSettings']);
            const settings = result.airtableSettings || {};

            if (!settings.apiToken || !settings.baseId || !settings.tableName) {
                throw new Error('Missing required AirTable configuration');
            }

            // Test connection with a simple list request (limit 1 record)
            const url = `https://api.airtable.com/v0/${settings.baseId}/${settings.tableName}?maxRecords=1`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${settings.apiToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            return {
                success: true,
                message: 'Connection successful!',
                recordCount: data.records?.length || 0
            };
        } catch (error) {
            console.error('AirTable connection test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async performSync(trigger = 'manual') {
        if (this.syncInProgress) {
            return { success: false, error: 'Sync already in progress' };
        }

        this.syncInProgress = true;
        console.log(`Starting AirTable sync (${trigger})`);

        try {
            const result = await chrome.storage.sync.get(['airtableSettings', 'airtableData']);
            const settings = result.airtableSettings || {};
            const existingData = result.airtableData || {};

            if (!settings.enabled || !settings.apiToken || !settings.baseId || !settings.tableName) {
                throw new Error('AirTable not configured or disabled');
            }

            // Update badge to show syncing
            await this.updateBadge('...', '#orange');

            const quotes = await this.fetchAllQuotes(settings);
            
            // Store the fetched quotes using chunked storage
            await this.storeAirTableQuotes(quotes);
            
            // Store metadata separately
            const airtableData = {
                lastSync: new Date().toISOString(),
                syncTrigger: trigger,
                recordCount: quotes.length,
                chunks: Math.ceil(quotes.length / 50) // 50 quotes per chunk
            };

            await chrome.storage.sync.set({ airtableData });

            // Update badge to show success
            await this.updateBadge('✓', '#green');
            setTimeout(() => this.updateBadge('', ''), 3000);

            console.log(`AirTable sync completed: ${quotes.length} quotes`);

            return {
                success: true,
                recordCount: quotes.length,
                lastSync: airtableData.lastSync
            };

        } catch (error) {
            console.error('AirTable sync failed:', error);
            
            // Update badge to show error
            await this.updateBadge('!', '#red');
            setTimeout(() => this.updateBadge('', ''), 5000);

            return {
                success: false,
                error: error.message
            };
        } finally {
            this.syncInProgress = false;
        }
    }

    async fetchAllQuotes(settings, offset = null, allQuotes = []) {
        const url = new URL(`https://api.airtable.com/v0/${settings.baseId}/${settings.tableName}`);
        
        // Add pagination
        if (offset) {
            url.searchParams.set('offset', offset);
        }
        
        // Set reasonable page size
        url.searchParams.set('pageSize', '100');

        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': `Bearer ${settings.apiToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Process records into quote format
        const quotes = data.records
            .map(record => this.processRecord(record, settings))
            .filter(quote => quote.text && quote.author); // Only include complete quotes

        allQuotes.push(...quotes);

        // Handle pagination
        if (data.offset) {
            // Rate limiting: wait 200ms between requests (well under 5 req/sec limit)
            await new Promise(resolve => setTimeout(resolve, 200));
            return this.fetchAllQuotes(settings, data.offset, allQuotes);
        }

        return allQuotes;
    }

    processRecord(record, settings) {
        const fields = record.fields || {};
        
        // Get field values with fallbacks
        const text = fields[settings.quoteField] || 
                    fields[settings.quoteField?.toLowerCase()] ||
                    fields.Quote || 
                    fields.quote || 
                    fields.Text || 
                    fields.text || 
                    '';

        const author = fields[settings.authorField] || 
                      fields[settings.authorField?.toLowerCase()] ||
                      fields.Author || 
                      fields.author || 
                      fields.Source || 
                      fields.source || 
                      'Unknown';

        return {
            id: record.id,
            text: text.toString().trim(),
            author: author.toString().trim(),
            source: 'airtable',
            createdTime: record.createdTime
        };
    }

    async storeAirTableQuotes(quotes) {
        try {
            // Clear existing chunked quotes
            await this.clearAirTableQuotes();
            
            // Split quotes into chunks of 50 (well under storage limits)
            const chunkSize = 50;
            const chunks = [];
            
            for (let i = 0; i < quotes.length; i += chunkSize) {
                chunks.push(quotes.slice(i, i + chunkSize));
            }
            
            // Store each chunk separately
            const storePromises = chunks.map(async (chunk, index) => {
                const chunkKey = `airtableQuotes_${index}`;
                return chrome.storage.sync.set({ [chunkKey]: chunk });
            });
            
            await Promise.all(storePromises);
            console.log(`Stored ${quotes.length} quotes in ${chunks.length} chunks`);
            
        } catch (error) {
            console.error('Failed to store AirTable quotes:', error);
            
            // Fallback: try to store in local storage if sync fails
            try {
                await chrome.storage.local.set({ 
                    airtableQuotesLocal: quotes,
                    airtableLocalFallback: true 
                });
                console.log('Stored quotes in local storage as fallback');
            } catch (localError) {
                console.error('Local storage fallback also failed:', localError);
                throw new Error('Unable to store quotes: ' + error.message);
            }
        }
    }

    async clearAirTableQuotes() {
        try {
            // Get all storage keys to find existing chunks
            const allData = await chrome.storage.sync.get(null);
            const chunkKeys = Object.keys(allData).filter(key => key.startsWith('airtableQuotes_'));
            
            if (chunkKeys.length > 0) {
                await chrome.storage.sync.remove(chunkKeys);
                console.log(`Cleared ${chunkKeys.length} existing quote chunks`);
            }
            
            // Also clear local fallback
            await chrome.storage.local.remove(['airtableQuotesLocal', 'airtableLocalFallback']);
            
        } catch (error) {
            console.warn('Failed to clear existing quotes:', error);
        }
    }

    async updateBadge(text, color) {
        try {
            await chrome.action.setBadgeText({ text });
            await chrome.action.setBadgeBackgroundColor({ color });
        } catch (error) {
            // Ignore badge errors - not critical
            console.warn('Failed to update badge:', error);
        }
    }
}

// Initialize the sync manager
let syncManager = null;

// Simple message handler for keep-alive (always available)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message.type);
    
    if (message.type === 'KEEP_ALIVE') {
        sendResponse({ alive: true, timestamp: Date.now() });
        return false;
    }
    
    // For other messages, ensure sync manager is initialized
    if (!syncManager) {
        initializeSyncManager();
    }
    
    if (syncManager && syncManager.handleSyncMessages) {
        // Let the sync manager handle the message
        return syncManager.handleSyncMessages(message, sender, sendResponse);
    } else {
        sendResponse({ success: false, error: 'Sync manager not available' });
        return false;
    }
});

function initializeSyncManager() {
    if (!syncManager) {
        try {
            console.log('Initializing sync manager...');
            syncManager = new AirTableSyncManager();
            console.log('AirTable sync manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize sync manager:', error);
            syncManager = null;
        }
    }
}

// Initialize on startup
console.log('Background script loaded, initializing...');
initializeSyncManager();

// Handle extension startup and installation
chrome.runtime.onStartup.addListener(() => {
    console.log('Extension started');
    initializeSyncManager();
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed/updated');
    initializeSyncManager();
});


// Add error handling for unhandled promise rejections
self.addEventListener('unhandledrejection', event => {
    console.error('Unhandled promise rejection in background script:', event.reason);
});