// Popup Script - Settings launcher
import { Storage } from './core/storage.js';

class PopupManager {
    constructor() {
        this.settings = {};
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.applyTheme();
        this.setupEventListeners();
    }

    async loadSettings() {
        const data = await Storage.getAll();
        this.settings = data.settings;
    }

    applyTheme() {
        let effectiveTheme = this.settings.theme || 'system';

        if (effectiveTheme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            effectiveTheme = prefersDark ? 'dark' : 'light';
        }

        document.documentElement.setAttribute('data-theme', effectiveTheme);

        if (effectiveTheme === 'dark') {
            const darkStyle = this.settings.darkModeStyle || 'blue-gray';
            document.documentElement.setAttribute('data-dark-style', darkStyle);
        } else {
            document.documentElement.removeAttribute('data-dark-style');
        }
    }

    setupEventListeners() {
        // Settings button - opens new tab with settings modal
        document.getElementById('settingsBtn').addEventListener('click', () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html?settings=true') });
            window.close();
        });

        // Open new tab button
        document.getElementById('openTabBtn').addEventListener('click', () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
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
