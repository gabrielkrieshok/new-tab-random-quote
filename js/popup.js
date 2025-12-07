// Popup Script - Minimal interface
import { Quotes } from './core/quotes.js';
import { Storage } from './core/storage.js';

class PopupManager {
    constructor() {
        this.quotes = [];
        this.currentQuote = null;
        this.settings = {};
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.applyTheme();
        this.quotes = await Quotes.loadAll();
        this.displayRandomQuote();
        this.setupEventListeners();
    }

    async loadSettings() {
        const data = await Storage.getAll();
        this.settings = data.settings;
    }

    applyTheme() {
        let effectiveTheme = this.settings.theme || 'system';

        // If theme is 'system', detect the system preference
        if (effectiveTheme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            effectiveTheme = prefersDark ? 'dark' : 'light';
        }

        document.documentElement.setAttribute('data-theme', effectiveTheme);

        // Apply dark mode style if in dark mode
        if (effectiveTheme === 'dark') {
            const darkStyle = this.settings.darkModeStyle || 'blue-gray';
            document.documentElement.setAttribute('data-dark-style', darkStyle);
        } else {
            document.documentElement.removeAttribute('data-dark-style');
        }
    }

    displayRandomQuote() {
        this.currentQuote = Quotes.getRandom(this.quotes);

        const quoteText = document.getElementById('quoteText');
        const quoteAuthor = document.getElementById('quoteAuthor');

        if (this.currentQuote) {
            quoteText.textContent = this.currentQuote.text;
            quoteAuthor.textContent = `— ${this.currentQuote.author}`;
        }
    }

    setupEventListeners() {
        // New quote button
        document.getElementById('newQuoteBtn').addEventListener('click', () => {
            this.displayRandomQuote();
        });

        // Open new tab button
        document.getElementById('openTabBtn').addEventListener('click', () => {
            chrome.tabs.create({ url: 'chrome://newtab/' });
            window.close();
        });

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (this.settings.theme === 'system') {
                this.applyTheme();
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
});
