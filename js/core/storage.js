// Storage Module - Centralized storage management
// Settings sync across devices via chrome.storage.sync
// Quotes, synced remote quotes, and credentials stored locally via chrome.storage.local
// (remote quotes are re-fetchable and often exceed sync's 8KB-per-item quota)
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
        // Remote quote source settings (key name kept for backward compatibility)
        airtableSettings: {
            enabled: false,
            provider: 'airtable',
            apiToken: '',
            baseId: '',
            tableName: '',
            baserowToken: '',
            baserowUrl: 'https://api.baserow.io',
            baserowTableId: '',
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
                chrome.storage.sync.get(null),
                chrome.storage.local.get(['customQuotes', 'airtableApiToken', 'airtableQuotesLocal', 'airtableData'])
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

            // Migrate remote quotes (chunked in sync, pre-4.2) and their sync metadata to local
            const chunkKeys = Object.keys(syncData).filter(key => key.startsWith('airtableQuotes_'));
            if (chunkKeys.length > 0 || syncData.airtableData) {
                if (!localData.airtableQuotesLocal?.length && chunkKeys.length > 0) {
                    const chunks = syncData.airtableData?.chunks || chunkKeys.length;
                    const quotes = [];
                    for (let i = 0; i < chunks; i++) {
                        const chunk = syncData[`airtableQuotes_${i}`];
                        if (Array.isArray(chunk)) quotes.push(...chunk);
                    }
                    if (quotes.length > 0) {
                        localWrites.airtableQuotesLocal = quotes;
                        localWrites.airtableData = {
                            lastSync: syncData.airtableData?.lastSync || new Date().toISOString(),
                            recordCount: quotes.length
                        };
                    }
                } else if (!localData.airtableData && syncData.airtableData) {
                    localWrites.airtableData = syncData.airtableData;
                }
                syncRemoveKeys.push(...chunkKeys);
                if (syncData.airtableData) syncRemoveKeys.push('airtableData');
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
                chrome.storage.sync.get(['settings', 'airtableSettings']),
                chrome.storage.local.get(['customQuotes', 'airtableApiToken', 'baserowApiToken', 'airtableData'])
            ]);

            return {
                settings: { ...this.defaults.settings, ...syncResult.settings },
                customQuotes: localResult.customQuotes || [],
                airtableSettings: {
                    ...this.defaults.airtableSettings,
                    ...syncResult.airtableSettings,
                    apiToken: localResult.airtableApiToken || '',
                    baserowToken: localResult.baserowApiToken || ''
                },
                airtableData: localResult.airtableData || {}
            };
        } catch (error) {
            console.warn('Failed to load storage:', error);
            return structuredClone(this.defaults);
        }
    },

    // Get specific keys from storage
    async get(keys) {
        try {
            await this._migrate();

            const syncKeys = [];
            const localKeys = [];

            for (const key of keys) {
                if (key === 'customQuotes' || key === 'airtableData') {
                    localKeys.push(key);
                } else if (key === 'airtableSettings') {
                    syncKeys.push('airtableSettings');
                    localKeys.push('airtableApiToken', 'baserowApiToken');
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

            if (localKeys.includes('airtableData')) {
                result.airtableData = localResult.airtableData || {};
            }

            if (keys.includes('airtableSettings')) {
                result.airtableSettings = {
                    ...this.defaults.airtableSettings,
                    ...result.airtableSettings,
                    apiToken: localResult.airtableApiToken || '',
                    baserowToken: localResult.baserowApiToken || ''
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
                if (key === 'customQuotes' || key === 'airtableData') {
                    localData[key] = value;
                } else if (key === 'airtableSettings') {
                    const { apiToken, baserowToken, ...rest } = value;
                    syncData.airtableSettings = rest;
                    if (apiToken !== undefined) {
                        localData.airtableApiToken = apiToken;
                    }
                    if (baserowToken !== undefined) {
                        localData.baserowApiToken = baserowToken;
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

    // Get synced remote quotes (AirTable / Baserow)
    async getAirtableQuotes() {
        try {
            const localData = await chrome.storage.local.get(['airtableQuotesLocal']);
            return localData.airtableQuotesLocal || [];
        } catch (error) {
            console.error('Failed to load remote quotes:', error);
            return [];
        }
    },

    // Store synced remote quotes and their sync metadata
    async setAirtableQuotes(quotes) {
        await chrome.storage.local.set({
            airtableQuotesLocal: quotes,
            airtableData: {
                lastSync: new Date().toISOString(),
                recordCount: quotes.length
            }
        });
        console.log(`Stored ${quotes.length} remote quotes`);
        return true;
    },

    // Clear synced remote quotes
    async clearAirtableQuotes() {
        try {
            await chrome.storage.local.remove(['airtableQuotesLocal', 'airtableData']);
        } catch (error) {
            console.warn('Failed to clear remote quotes:', error);
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
