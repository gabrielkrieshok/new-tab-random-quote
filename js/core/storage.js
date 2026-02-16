// Storage Module - Centralized storage management
// Settings sync across devices via chrome.storage.sync
// Quotes and credentials stored locally via chrome.storage.local
export const Storage = {
    defaults: {
        settings: {
            useStock: true,
            theme: 'system',
            darkModeStyle: 'blue-gray',
            fontFamily: "'EB Garamond', Georgia, serif",
            fontSize: 'medium',
            colorScheme: 'default',
            customLightBg: '#f8fafc',
            customLightText: '#0f172a',
            customDarkBg: '#0f172a',
            customDarkText: '#f1f5f9'
        },
        customQuotes: [],
        airtableSettings: {
            enabled: false,
            apiToken: '',
            baseId: '',
            tableName: '',
            quoteField: 'Quote',
            authorField: 'Author',
            autoSync: false,
            syncFrequency: 'daily'
        },
        airtableData: {}
    },

    _migrated: false,

    // One-time migration from sync to local storage for quotes and API token
    async _migrate() {
        if (this._migrated) return;
        this._migrated = true;

        try {
            const [syncData, localData] = await Promise.all([
                chrome.storage.sync.get(['customQuotes', 'airtableSettings']),
                chrome.storage.local.get(['customQuotes', 'airtableApiToken'])
            ]);

            const syncRemoveKeys = [];
            const localWrites = {};
            const syncWrites = {};

            // Migrate customQuotes from sync to local
            if (syncData.customQuotes?.length > 0 && !localData.customQuotes?.length) {
                localWrites.customQuotes = syncData.customQuotes;
                syncRemoveKeys.push('customQuotes');
            }

            // Migrate apiToken from sync airtableSettings to local
            if (syncData.airtableSettings?.apiToken && !localData.airtableApiToken) {
                localWrites.airtableApiToken = syncData.airtableSettings.apiToken;
                const { apiToken, ...rest } = syncData.airtableSettings;
                syncWrites.airtableSettings = rest;
            }

            const promises = [];
            if (Object.keys(localWrites).length > 0) {
                promises.push(chrome.storage.local.set(localWrites));
            }
            if (Object.keys(syncWrites).length > 0) {
                promises.push(chrome.storage.sync.set(syncWrites));
            }
            if (syncRemoveKeys.length > 0) {
                promises.push(chrome.storage.sync.remove(syncRemoveKeys));
            }

            if (promises.length > 0) {
                await Promise.all(promises);
                console.log('Storage migration completed');
            }
        } catch (error) {
            console.warn('Storage migration failed:', error);
        }
    },

    // Get all data from storage
    async getAll() {
        try {
            await this._migrate();

            const [syncResult, localResult] = await Promise.all([
                chrome.storage.sync.get(['settings', 'airtableSettings', 'airtableData']),
                chrome.storage.local.get(['customQuotes', 'airtableApiToken'])
            ]);

            return {
                settings: { ...this.defaults.settings, ...syncResult.settings },
                customQuotes: localResult.customQuotes || [],
                airtableSettings: {
                    ...this.defaults.airtableSettings,
                    ...syncResult.airtableSettings,
                    apiToken: localResult.airtableApiToken || ''
                },
                airtableData: syncResult.airtableData || {}
            };
        } catch (error) {
            console.warn('Failed to load storage:', error);
            return { ...this.defaults };
        }
    },

    // Get specific keys from storage
    async get(keys) {
        try {
            await this._migrate();

            const syncKeys = [];
            const localKeys = [];

            for (const key of keys) {
                if (key === 'customQuotes') {
                    localKeys.push('customQuotes');
                } else if (key === 'airtableSettings') {
                    syncKeys.push('airtableSettings');
                    localKeys.push('airtableApiToken');
                } else {
                    syncKeys.push(key);
                }
            }

            const [syncResult, localResult] = await Promise.all([
                syncKeys.length > 0 ? chrome.storage.sync.get(syncKeys) : {},
                localKeys.length > 0 ? chrome.storage.local.get(localKeys) : {}
            ]);

            const result = { ...syncResult };

            if (localKeys.includes('customQuotes')) {
                result.customQuotes = localResult.customQuotes || [];
            }

            if (keys.includes('airtableSettings')) {
                result.airtableSettings = {
                    ...this.defaults.airtableSettings,
                    ...result.airtableSettings,
                    apiToken: localResult.airtableApiToken || ''
                };
            }

            return result;
        } catch (error) {
            console.warn('Failed to get from storage:', error);
            return {};
        }
    },

    // Save to storage - routes keys to appropriate storage area
    async set(data) {
        try {
            const syncData = {};
            const localData = {};

            for (const [key, value] of Object.entries(data)) {
                if (key === 'customQuotes') {
                    localData.customQuotes = value;
                } else if (key === 'airtableSettings') {
                    const { apiToken, ...rest } = value;
                    syncData.airtableSettings = rest;
                    if (apiToken !== undefined) {
                        localData.airtableApiToken = apiToken;
                    }
                } else {
                    syncData[key] = value;
                }
            }

            const promises = [];
            if (Object.keys(syncData).length > 0) {
                promises.push(chrome.storage.sync.set(syncData));
            }
            if (Object.keys(localData).length > 0) {
                promises.push(chrome.storage.local.set(localData));
            }

            await Promise.all(promises);
            return true;
        } catch (error) {
            console.error('Failed to save to storage:', error);
            throw new Error('Failed to save. Storage may be full.');
        }
    },

    // Get AirTable quotes from chunked storage
    async getAirtableQuotes(airtableData) {
        try {
            if (!airtableData.chunks) {
                const localData = await chrome.storage.local.get(['airtableQuotesLocal']);
                return localData.airtableQuotesLocal || [];
            }

            const chunkKeys = [];
            for (let i = 0; i < airtableData.chunks; i++) {
                chunkKeys.push(`airtableQuotes_${i}`);
            }

            const chunkData = await chrome.storage.sync.get(chunkKeys);

            const allQuotes = [];
            for (let i = 0; i < airtableData.chunks; i++) {
                const chunk = chunkData[`airtableQuotes_${i}`];
                if (chunk && Array.isArray(chunk)) {
                    allQuotes.push(...chunk);
                }
            }

            return allQuotes;
        } catch (error) {
            console.error('Failed to load AirTable quotes:', error);
            try {
                const localData = await chrome.storage.local.get(['airtableQuotesLocal']);
                return localData.airtableQuotesLocal || [];
            } catch {
                return [];
            }
        }
    },

    // Store AirTable quotes in chunks
    async setAirtableQuotes(quotes) {
        try {
            await this.clearAirtableQuotes();

            const chunkSize = 50;
            const chunks = [];
            for (let i = 0; i < quotes.length; i += chunkSize) {
                chunks.push(quotes.slice(i, i + chunkSize));
            }

            const storePromises = chunks.map((chunk, index) =>
                chrome.storage.sync.set({ [`airtableQuotes_${index}`]: chunk })
            );

            await Promise.all(storePromises);

            await this.set({
                airtableData: {
                    lastSync: new Date().toISOString(),
                    recordCount: quotes.length,
                    chunks: chunks.length
                }
            });

            console.log(`Stored ${quotes.length} quotes in ${chunks.length} chunks`);
            return true;
        } catch (error) {
            console.error('Failed to store AirTable quotes:', error);
            try {
                await chrome.storage.local.set({ airtableQuotesLocal: quotes });
                console.log('Stored quotes in local storage as fallback');
                return true;
            } catch {
                return false;
            }
        }
    },

    // Clear AirTable quotes
    async clearAirtableQuotes() {
        try {
            const allData = await chrome.storage.sync.get(null);
            const chunkKeys = Object.keys(allData).filter(key => key.startsWith('airtableQuotes_'));

            if (chunkKeys.length > 0) {
                await chrome.storage.sync.remove(chunkKeys);
            }

            await chrome.storage.local.remove(['airtableQuotesLocal']);
        } catch (error) {
            console.warn('Failed to clear AirTable quotes:', error);
        }
    },

    // Listen for storage changes (both sync and local)
    onChange(callback) {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync' || namespace === 'local') {
                callback(changes);
            }
        });
    }
};
