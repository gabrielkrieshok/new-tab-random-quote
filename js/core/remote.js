// Remote Module - Dispatches to the configured remote quote provider
import { Storage } from './storage.js';
import { AirTable } from './airtable.js';
import { Baserow } from './baserow.js';

const PROVIDERS = {
    airtable: { name: 'AirTable', module: AirTable },
    baserow: { name: 'Baserow', module: Baserow }
};

export const Remote = {
    provider(settings) {
        return PROVIDERS[settings?.provider] || PROVIDERS.airtable;
    },

    // Origin pattern the extension needs host permission for, or null if
    // it is already covered by the manifest's host_permissions.
    requiredOrigin(settings) {
        if (settings?.provider !== 'baserow') return null;
        try {
            return `${new URL(Baserow.baseUrl(settings)).origin}/*`;
        } catch {
            return null;
        }
    },

    async testConnection(settings) {
        return this.provider(settings).module.testConnection(settings);
    },

    // Sync quotes from the configured provider
    async sync() {
        const data = await Storage.get(['airtableSettings']);
        const settings = data.airtableSettings || {};
        const { name, module } = this.provider(settings);

        try {
            if (!settings.enabled) {
                throw new Error('Remote quote integration is disabled');
            }

            // Baserow hosts are optional permissions granted from the settings
            // page; background syncs can't prompt, so fail with a clear message.
            const origin = this.requiredOrigin(settings);
            if (origin && !(await chrome.permissions.contains({ origins: [origin] }))) {
                throw new Error(`No permission to access ${origin.replace('/*', '')}. Open settings and click Test Connection to grant it.`);
            }

            const quotes = await module.fetchQuotes(settings);
            await Storage.setAirtableQuotes(quotes);

            return {
                success: true,
                recordCount: quotes.length,
                lastSync: new Date().toISOString()
            };
        } catch (error) {
            console.error(`${name} sync failed:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }
};
