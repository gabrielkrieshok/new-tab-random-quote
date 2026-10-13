// Baserow Module - Baserow integration (cloud or self-hosted)

export const DEFAULT_BASEROW_URL = 'https://api.baserow.io';

export const Baserow = {
    // Normalize the instance URL (strip trailing slashes, default to cloud)
    baseUrl(settings) {
        return (settings?.baserowUrl || DEFAULT_BASEROW_URL).trim().replace(/\/+$/, '');
    },

    rowsUrl(settings, page, size) {
        const url = new URL(`${this.baseUrl(settings)}/api/database/rows/table/${encodeURIComponent(settings.baserowTableId)}/`);
        url.searchParams.set('user_field_names', 'true');
        url.searchParams.set('page', String(page));
        url.searchParams.set('size', String(size));
        return url.toString();
    },

    async request(settings, url) {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Token ${settings.baserowToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const detail = typeof errorData.detail === 'string' ? errorData.detail : errorData.error;
            throw new Error(detail || `HTTP ${response.status}`);
        }

        return response.json();
    },

    // Test connection to Baserow
    async testConnection(settings) {
        try {
            if (!settings?.baserowToken || !settings?.baserowTableId) {
                throw new Error('Missing required Baserow configuration');
            }

            await this.request(settings, this.rowsUrl(settings, 1, 1));
            return { success: true, message: 'Connection successful!' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Fetch all quotes from Baserow (with pagination)
    async fetchQuotes(settings) {
        const allQuotes = [];
        let page = 1;

        while (true) {
            const data = await this.request(settings, this.rowsUrl(settings, page, 200));

            const quotes = (data.results || [])
                .map(row => this.processRow(row, settings))
                .filter(quote => quote.text && quote.author);

            allQuotes.push(...quotes);

            if (!data.next) break;
            page++;
            await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
        }

        return allQuotes;
    },

    // Convert a Baserow cell value to text. Select, link-row and lookup
    // fields come back as objects or arrays of { value } / { name }.
    toText(value) {
        if (value === null || value === undefined) return '';
        if (Array.isArray(value)) {
            return value.map(item => this.toText(item)).filter(Boolean).join(', ');
        }
        if (typeof value === 'object') {
            return this.toText(value.value ?? value.name ?? '');
        }
        return value.toString();
    },

    // Process a single Baserow row
    processRow(row, settings) {
        const text = this.toText(row[settings.quoteField] ?? row.Quote ?? row.quote);
        const author = this.toText(row[settings.authorField] ?? row.Author ?? row.author) || 'Unknown';

        return {
            id: `baserow_${row.id}`,
            text: text.trim(),
            author: author.trim(),
            source: 'baserow'
        };
    }
};
