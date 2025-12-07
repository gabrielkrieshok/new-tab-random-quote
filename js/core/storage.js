// Storage Module - Centralized storage management
export const Storage = {
    // Default settings
    defaults: {
        settings: {
            useStock: true,
            theme: 'system',
            darkModeStyle: 'blue-gray',
            fontFamily: "'EB Garamond', Georgia, serif",
            fontSize: 'medium'
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

    // Get all data from storage
    async getAll() {
        try {
            const result = await chrome.storage.sync.get([
                'settings',
                'customQuotes',
                'airtableSettings',
                'airtableData'
            ]);

            return {
                settings: { ...this.defaults.settings, ...result.settings },
                customQuotes: result.customQuotes || [],
                airtableSettings: { ...this.defaults.airtableSettings, ...result.airtableSettings },
                airtableData: result.airtableData || {}
            };
        } catch (error) {
            console.warn('Failed to load storage:', error);
            return this.defaults;
        }
    },

    // Get specific key from storage
    async get(keys) {
        try {
            return await chrome.storage.sync.get(keys);
        } catch (error) {
            console.warn('Failed to get from storage:', error);
            return {};
        }
    },

    // Save to storage
    async set(data) {
        try {
            await chrome.storage.sync.set(data);
            return true;
        } catch (error) {
            console.warn('Failed to save to storage:', error);
            return false;
        }
    },

    // Get AirTable quotes from chunked storage
    async getAirtableQuotes(airtableData) {
        try {
            if (!airtableData.chunks) {
                // Fallback to local storage if chunks not found
                const localData = await chrome.storage.local.get(['airtableQuotesLocal']);
                return localData.airtableQuotesLocal || [];
            }

            // Load all chunks
            const chunkKeys = [];
            for (let i = 0; i < airtableData.chunks; i++) {
                chunkKeys.push(`airtableQuotes_${i}`);
            }

            const chunkData = await chrome.storage.sync.get(chunkKeys);

            // Combine chunks
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
            // Try local storage fallback
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
            // Clear existing chunks
            await this.clearAirtableQuotes();

            // Split into chunks of 50
            const chunkSize = 50;
            const chunks = [];
            for (let i = 0; i < quotes.length; i += chunkSize) {
                chunks.push(quotes.slice(i, i + chunkSize));
            }

            // Store each chunk
            const storePromises = chunks.map((chunk, index) =>
                chrome.storage.sync.set({ [`airtableQuotes_${index}`]: chunk })
            );

            await Promise.all(storePromises);

            // Store metadata
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
            // Fallback to local storage
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

    // Listen for storage changes
    onChange(callback) {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync') {
                callback(changes);
            }
        });
    }
};
