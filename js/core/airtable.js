// AirTable Module - Simplified AirTable integration
import { Storage } from './storage.js';

export const AirTable = {
    // Test connection to AirTable
    async testConnection(settings) {
        try {
            if (!settings?.apiToken || !settings?.baseId || !settings?.tableName) {
                throw new Error('Missing required AirTable configuration');
            }

            const url = `https://api.airtable.com/v0/${settings.baseId}/${settings.tableName}?maxRecords=1`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${settings.apiToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }

            return { success: true, message: 'Connection successful!' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Fetch all quotes from AirTable (with pagination)
    async fetchQuotes(settings, offset = null, allQuotes = []) {
        const url = new URL(`https://api.airtable.com/v0/${settings.baseId}/${settings.tableName}`);

        if (offset) url.searchParams.set('offset', offset);
        url.searchParams.set('pageSize', '100');

        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': `Bearer ${settings.apiToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();

        // Process records into quote format
        const quotes = data.records
            .map(record => this.processRecord(record, settings))
            .filter(quote => quote.text && quote.author);

        allQuotes.push(...quotes);

        // Handle pagination
        if (data.offset) {
            await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
            return this.fetchQuotes(settings, data.offset, allQuotes);
        }

        return allQuotes;
    },

    // Process a single AirTable record
    processRecord(record, settings) {
        const fields = record.fields || {};

        const text = fields[settings.quoteField] ||
            fields.Quote ||
            fields.quote ||
            '';

        const author = fields[settings.authorField] ||
            fields.Author ||
            fields.author ||
            'Unknown';

        return {
            id: record.id,
            text: text.toString().trim(),
            author: author.toString().trim(),
            source: 'airtable'
        };
    },

    // Sync quotes from AirTable
    async sync() {
        try {
            const data = await Storage.get(['airtableSettings']);
            const settings = data.airtableSettings || {};

            if (!settings.enabled) {
                throw new Error('AirTable integration is disabled');
            }

            const quotes = await this.fetchQuotes(settings);
            await Storage.setAirtableQuotes(quotes);

            return {
                success: true,
                recordCount: quotes.length,
                lastSync: new Date().toISOString()
            };
        } catch (error) {
            console.error('AirTable sync failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
};
