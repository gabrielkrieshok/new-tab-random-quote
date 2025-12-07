// Quotes Module - Quote loading and management
import { Storage } from './storage.js';

export const Quotes = {
    // Load all quotes from all sources
    async loadAll() {
        try {
            const data = await Storage.getAll();
            const quotes = [];

            // Add custom quotes
            if (data.customQuotes.length > 0) {
                quotes.push(...data.customQuotes);
            }

            // Add AirTable quotes if enabled
            if (data.airtableSettings.enabled) {
                const airtableQuotes = await Storage.getAirtableQuotes(data.airtableData);
                if (airtableQuotes.length > 0) {
                    quotes.push(...airtableQuotes);
                }
            }

            // Add stock quotes if enabled
            if (data.settings.useStock) {
                const stockQuotes = await this.loadStockQuotes();
                quotes.push(...stockQuotes);
            }

            // Fallback if no quotes available
            if (quotes.length === 0) {
                return [{
                    text: "Welcome! Add your own quotes, enable stock quotes, or connect AirTable in settings.",
                    author: "Quote Extension"
                }];
            }

            return quotes;
        } catch (error) {
            console.error('Failed to load quotes:', error);
            return [{
                text: "Something went wrong loading quotes. Please check your settings.",
                author: "System"
            }];
        }
    },

    // Load stock quotes from JSON file
    async loadStockQuotes() {
        try {
            const response = await fetch(chrome.runtime.getURL('quotes/default.json'));
            if (!response.ok) throw new Error('Failed to fetch stock quotes');
            return await response.json();
        } catch (error) {
            console.error('Failed to load stock quotes:', error);
            return [];
        }
    },

    // Get random quote from array
    getRandom(quotes) {
        if (!quotes || quotes.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * quotes.length);
        return quotes[randomIndex];
    },

    // Add custom quote
    async add(text, author) {
        if (!text?.trim() || !author?.trim()) {
            throw new Error('Quote text and author are required');
        }

        const data = await Storage.get(['customQuotes']);
        const customQuotes = data.customQuotes || [];

        // Check for duplicates
        const duplicate = customQuotes.find(q =>
            q.text.toLowerCase() === text.toLowerCase() &&
            q.author.toLowerCase() === author.toLowerCase()
        );

        if (duplicate) {
            throw new Error('This quote already exists');
        }

        customQuotes.push({ text: text.trim(), author: author.trim() });
        await Storage.set({ customQuotes });
        return true;
    },

    // Delete custom quote by index
    async delete(index) {
        const data = await Storage.get(['customQuotes']);
        const customQuotes = data.customQuotes || [];

        if (index < 0 || index >= customQuotes.length) {
            throw new Error('Invalid quote index');
        }

        customQuotes.splice(index, 1);
        await Storage.set({ customQuotes });
        return true;
    },

    // Export custom quotes
    async export() {
        const data = await Storage.get(['customQuotes']);
        return data.customQuotes || [];
    },

    // Clear all custom quotes
    async clearAll() {
        await Storage.set({ customQuotes: [] });
        return true;
    }
};
