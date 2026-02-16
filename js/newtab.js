// New Tab Random Quote - Simplified Main Script
import { Storage } from './core/storage.js';
import { Quotes } from './core/quotes.js';
import { AirTable } from './core/airtable.js';

class QuoteManager {
    constructor() {
        this.currentQuote = null;
        this.quotes = [];
        this.settings = {};
        this.customQuotes = [];
        this.airtableSettings = {};
        this.airtableData = {};
        this.selectedCsvFile = null;
        this.editingIndex = null;
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.applyTheme();
        await this.loadAndDisplayQuote();

        // Auto-open settings if launched with ?settings=true (from popup)
        const params = new URLSearchParams(window.location.search);
        if (params.get('settings') === 'true') {
            this.openSettingsModal();
        }
    }

    async loadData() {
        const data = await Storage.getAll();
        this.settings = data.settings;
        this.customQuotes = data.customQuotes;
        this.airtableSettings = data.airtableSettings;
        this.airtableData = data.airtableData;
    }

    async loadAndDisplayQuote() {
        this.quotes = await Quotes.loadAll();
        this.displayRandomQuote();
    }

    displayRandomQuote() {
        if (this.quotes.length === 0) return;

        this.currentQuote = Quotes.getRandom(this.quotes);

        const quoteText = document.getElementById('quoteText');
        const quoteAuthor = document.getElementById('quoteAuthor');
        const container = document.getElementById('quoteContainer');

        container.style.opacity = '0.5';
        container.style.transform = 'translateY(10px)';

        requestAnimationFrame(() => {
            setTimeout(() => {
                quoteText.textContent = this.currentQuote.text;
                quoteAuthor.textContent = this.currentQuote.author;
                container.style.opacity = '1';
                container.style.transform = 'translateY(0)';
            }, 150);
        });
    }

    // Color palette definitions
    static COLOR_PALETTES = {
        warm:   { lightBg: '#faf6f1', lightText: '#3d2c1e', darkBg: '#2c1f14', darkText: '#f0e6d8' },
        ocean:  { lightBg: '#f0f7fa', lightText: '#1a3a4a', darkBg: '#0c2233', darkText: '#d0e8f2' },
        forest: { lightBg: '#f2f7f0', lightText: '#1e3a1e', darkBg: '#142214', darkText: '#d0e8d0' },
        rose:   { lightBg: '#faf0f2', lightText: '#4a1a2a', darkBg: '#2d0f18', darkText: '#f2d0d8' },
    };

    applyTheme() {
        let effectiveTheme = this.settings.theme;

        // If theme is 'system', detect the system preference
        if (this.settings.theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            effectiveTheme = prefersDark ? 'dark' : 'light';
        }

        document.documentElement.setAttribute('data-theme', effectiveTheme);

        // Apply dark mode style if in dark mode and using default color scheme
        const scheme = this.settings.colorScheme || 'default';
        if (effectiveTheme === 'dark' && scheme === 'default') {
            const darkStyle = this.settings.darkModeStyle || 'blue-gray';
            document.documentElement.setAttribute('data-dark-style', darkStyle);
        } else {
            document.documentElement.removeAttribute('data-dark-style');
        }

        // Apply color scheme
        this.applyColorScheme(effectiveTheme);
        this.applyTypography();
    }

    applyColorScheme(effectiveTheme) {
        const root = document.documentElement;
        const scheme = this.settings.colorScheme || 'default';

        if (scheme === 'default') {
            // Remove any custom color overrides, let CSS handle it
            root.style.removeProperty('--bg-color');
            root.style.removeProperty('--quote-color');
            root.style.removeProperty('--text-color');
            root.style.removeProperty('--author-color');
            return;
        }

        let bg, text;

        if (scheme === 'custom') {
            if (effectiveTheme === 'dark') {
                bg = this.settings.customDarkBg || '#0f172a';
                text = this.settings.customDarkText || '#f1f5f9';
            } else {
                bg = this.settings.customLightBg || '#f8fafc';
                text = this.settings.customLightText || '#0f172a';
            }
        } else {
            const palette = QuoteManager.COLOR_PALETTES[scheme];
            if (!palette) return;
            if (effectiveTheme === 'dark') {
                bg = palette.darkBg;
                text = palette.darkText;
            } else {
                bg = palette.lightBg;
                text = palette.lightText;
            }
        }

        root.style.setProperty('--bg-color', bg);
        root.style.setProperty('--quote-color', text);
        root.style.setProperty('--text-color', text);
        // Author color: same as text but at 60% opacity
        root.style.setProperty('--author-color', text + '99');
    }

    applyTypography() {
        const root = document.documentElement;

        // Apply font family - always set with fallback to default
        const fontFamily = this.settings.fontFamily || "'EB Garamond', Georgia, serif";
        root.style.setProperty('--quote-font-family', fontFamily);

        // Apply font size
        const sizeMap = {
            small: '--quote-font-size-small',
            medium: '--quote-font-size-medium',
            large: '--quote-font-size-large'
        };

        const sizeVar = sizeMap[this.settings.fontSize] || '--quote-font-size-medium';
        root.style.setProperty('--quote-font-size', `var(${sizeVar})`);
    }

    updateTypographyPreview() {
        const previewQuote = document.getElementById('previewQuote');
        if (!previewQuote) return;

        // Apply font family to preview
        previewQuote.style.fontFamily = this.settings.fontFamily || "'EB Garamond', Georgia, serif";

        // Apply font size to preview (using smaller sizes for preview)
        const sizeMap = {
            small: '1rem',
            medium: '1.25rem',
            large: '1.5rem'
        };
        previewQuote.style.fontSize = sizeMap[this.settings.fontSize] || '1.25rem';
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = 'notification show';

        const colors = {
            error: { bg: 'rgba(239, 68, 68, 0.9)', text: 'white' },
            success: { bg: 'rgba(34, 197, 94, 0.9)', text: 'white' },
            info: { bg: 'var(--control-bg)', text: 'var(--text-color)' }
        };

        const color = colors[type] || colors.info;
        notification.style.background = color.bg;
        notification.style.color = color.text;

        setTimeout(() => notification.classList.remove('show'), 3000);
    }

    setupEventListeners() {
        // Settings modal
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettingsModal());
        document.getElementById('closeModalBtn').addEventListener('click', () => this.closeSettingsModal());
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') this.closeSettingsModal();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Only trigger shortcuts when not typing in an input
            const isTyping = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

            if ((e.key === ' ' || e.key === 'Enter') && !isTyping) {
                e.preventDefault();
                this.displayRandomQuote();
            } else if (e.key === 'Escape') {
                this.closeSettingsModal();
            }
        });

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (this.settings.theme === 'system') {
                this.applyTheme();
            }
        });

        // Settings handlers
        this.setupSettingsHandlers();

        // Sidebar navigation (set up once, not on every modal open)
        this.setupSidebarNavigation();

        // Listen for storage changes
        Storage.onChange((changes) => {
            if (changes.settings) {
                this.settings = { ...this.settings, ...changes.settings.newValue };
                this.applyTheme();
            }
            if (changes.customQuotes || changes.airtableData || changes.airtableSettings) {
                this.loadAndDisplayQuote();
            }
        });
    }

    openSettingsModal() {
        const modal = document.getElementById('settingsModal');
        this.populateModalSettings();
        modal.style.display = 'flex';
        requestAnimationFrame(() => modal.classList.add('show'));
    }

    setupSidebarNavigation() {
        // Add click handlers for sidebar navigation
        document.querySelectorAll('.nav-item').forEach(navItem => {
            navItem.addEventListener('click', () => {
                const panelId = navItem.dataset.panel + '-panel';

                // Update nav active state
                document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
                navItem.classList.add('active');

                // Show corresponding panel
                document.querySelectorAll('.content-panel').forEach(panel => panel.classList.remove('active'));
                document.getElementById(panelId)?.classList.add('active');
            });
        });
    }

    async closeSettingsModal() {
        const modal = document.getElementById('settingsModal');
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);

        // Reset editing state
        this.editingIndex = null;
        document.getElementById('addQuoteBtn').textContent = 'Add Quote';
        document.getElementById('newQuoteText').value = '';
        document.getElementById('newQuoteAuthor').value = '';

        // Reload settings and reapply theme to ensure changes are applied
        await this.loadData();
        this.applyTheme();
    }

    async populateModalSettings() {
        await this.loadData();

        // Basic settings
        document.getElementById('useStock').checked = this.settings.useStock;

        // Theme selection
        const themeRadio = document.querySelector(`input[name="theme"][value="${this.settings.theme}"]`);
        if (themeRadio) themeRadio.checked = true;

        // Dark mode style selection
        const darkModeStyleRadio = document.querySelector(`input[name="darkModeStyle"][value="${this.settings.darkModeStyle || 'blue-gray'}"]`);
        if (darkModeStyleRadio) darkModeStyleRadio.checked = true;

        // Color scheme selection
        const scheme = this.settings.colorScheme || 'default';
        const schemeRadio = document.querySelector(`input[name="colorScheme"][value="${scheme}"]`);
        if (schemeRadio) schemeRadio.checked = true;

        // Show/hide custom colors section and dark mode style group
        document.getElementById('customColorsSection').style.display = scheme === 'custom' ? '' : 'none';
        document.getElementById('darkModeStyleGroup').style.display = scheme === 'default' ? '' : 'none';

        // Populate custom color pickers
        document.getElementById('customLightBg').value = this.settings.customLightBg || '#f8fafc';
        document.getElementById('customLightText').value = this.settings.customLightText || '#0f172a';
        document.getElementById('customDarkBg').value = this.settings.customDarkBg || '#0f172a';
        document.getElementById('customDarkText').value = this.settings.customDarkText || '#f1f5f9';

        // Update custom swatches
        document.getElementById('customSwatchLight').style.background = this.settings.customLightBg || '#f8fafc';
        document.getElementById('customSwatchDark').style.background = this.settings.customDarkBg || '#0f172a';

        // Typography settings
        if (this.settings.fontFamily) {
            document.getElementById('quoteFontFamily').value = this.settings.fontFamily;
        }

        const fontSizeRadio = document.querySelector(`input[name="fontSize"][value="${this.settings.fontSize || 'medium'}"]`);
        if (fontSizeRadio) fontSizeRadio.checked = true;

        // AirTable settings
        document.getElementById('airtableEnabled').checked = this.airtableSettings.enabled;
        document.getElementById('airtableToken').value = this.airtableSettings.apiToken || '';
        document.getElementById('airtableBaseId').value = this.airtableSettings.baseId || '';
        document.getElementById('airtableTableName').value = this.airtableSettings.tableName || '';
        document.getElementById('airtableQuoteField').value = this.airtableSettings.quoteField || 'Quote';
        document.getElementById('airtableAuthorField').value = this.airtableSettings.authorField || 'Author';
        document.getElementById('airtableAutoSync').checked = this.airtableSettings.autoSync;
        document.getElementById('syncFrequency').value = this.airtableSettings.syncFrequency || 'daily';

        // Show/hide sections
        document.getElementById('airtableConfig').style.display = this.airtableSettings.enabled ? 'block' : 'none';
        document.getElementById('syncFrequencyGroup').style.display = this.airtableSettings.autoSync ? 'block' : 'none';

        // Update displays
        this.updateSyncStatus();
        this.updateQuoteStats();
        this.renderCustomQuotes();
        this.updateTypographyPreview();

        // Set version from manifest
        const versionEl = document.getElementById('extensionVersion');
        if (versionEl) {
            versionEl.textContent = chrome.runtime.getManifest().version;
        }
    }

    updateSyncStatus() {
        const lastSyncElement = document.getElementById('lastSyncTime');
        const quoteCountElement = document.getElementById('syncedQuoteCount');

        if (this.airtableData.lastSync) {
            const lastSync = new Date(this.airtableData.lastSync);
            lastSyncElement.textContent = lastSync.toLocaleDateString() + ' ' + lastSync.toLocaleTimeString();
        } else {
            lastSyncElement.textContent = 'Never';
        }

        quoteCountElement.textContent = this.airtableData.recordCount || 0;
    }

    updateQuoteStats() {
        const count = this.customQuotes.length;
        document.getElementById('quoteCount').textContent =
            `${count} custom quote${count !== 1 ? 's' : ''}`;
    }

    renderCustomQuotes() {
        const container = document.getElementById('quoteList');

        if (this.customQuotes.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--author-color);">
                    <p>No custom quotes yet. Add your first quote above!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.customQuotes.map((quote, index) => `
            <div class="quote-item" data-index="${index}">
                <div class="quote-text">"${this.escapeHtml(quote.text)}"</div>
                <div class="quote-author">— ${this.escapeHtml(quote.author)}</div>
                <div class="quote-actions-inline">
                    <button class="btn btn-secondary edit-quote-btn" data-index="${index}">Edit</button>
                    <button class="btn btn-danger delete-quote-btn" data-index="${index}">Delete</button>
                </div>
            </div>
        `).join('');

        // Event listeners for edit/delete
        container.querySelectorAll('.edit-quote-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.editQuote(parseInt(e.target.dataset.index)));
        });
        container.querySelectorAll('.delete-quote-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteQuote(parseInt(e.target.dataset.index)));
        });
    }

    setupSettingsHandlers() {
        // Use stock quotes toggle
        document.getElementById('useStock').addEventListener('change', async (e) => {
            this.settings.useStock = e.target.checked;
            await Storage.set({ settings: this.settings });
            await this.loadAndDisplayQuote();
        });

        // Theme selection
        document.querySelectorAll('input[name="theme"]').forEach(radio => {
            radio.addEventListener('change', async (e) => {
                if (e.target.checked) {
                    this.settings.theme = e.target.value;
                    this.applyTheme();
                    await Storage.set({ settings: this.settings });
                }
            });
        });

        // Dark mode style selection
        document.querySelectorAll('input[name="darkModeStyle"]').forEach(radio => {
            radio.addEventListener('change', async (e) => {
                if (e.target.checked) {
                    this.settings.darkModeStyle = e.target.value;
                    this.applyTheme();
                    await Storage.set({ settings: this.settings });
                }
            });
        });

        // Color scheme selection
        document.querySelectorAll('input[name="colorScheme"]').forEach(radio => {
            radio.addEventListener('change', async (e) => {
                if (e.target.checked) {
                    this.settings.colorScheme = e.target.value;
                    this.applyTheme();
                    await Storage.set({ settings: this.settings });

                    // Toggle custom colors section and dark mode style visibility
                    document.getElementById('customColorsSection').style.display =
                        e.target.value === 'custom' ? '' : 'none';
                    document.getElementById('darkModeStyleGroup').style.display =
                        e.target.value === 'default' ? '' : 'none';
                }
            });
        });

        // Custom color pickers
        ['customLightBg', 'customLightText', 'customDarkBg', 'customDarkText'].forEach(id => {
            document.getElementById(id).addEventListener('input', async (e) => {
                this.settings[id] = e.target.value;
                this.applyTheme();

                // Update the custom swatches
                document.getElementById('customSwatchLight').style.background = this.settings.customLightBg;
                document.getElementById('customSwatchDark').style.background = this.settings.customDarkBg;
            });
            // Save on change (mouseup after picking) to avoid excessive writes
            document.getElementById(id).addEventListener('change', async (e) => {
                this.settings[id] = e.target.value;
                await Storage.set({ settings: this.settings });
            });
        });

        // Font family selection
        document.getElementById('quoteFontFamily').addEventListener('change', async (e) => {
            this.settings.fontFamily = e.target.value;
            this.applyTypography();
            this.updateTypographyPreview();
            await Storage.set({ settings: this.settings });
        });

        // Font size selection
        document.querySelectorAll('input[name="fontSize"]').forEach(radio => {
            radio.addEventListener('change', async (e) => {
                if (e.target.checked) {
                    this.settings.fontSize = e.target.value;
                    this.applyTypography();
                    this.updateTypographyPreview();
                    await Storage.set({ settings: this.settings });
                }
            });
        });

        // AirTable enable/disable
        document.getElementById('airtableEnabled').addEventListener('change', async (e) => {
            this.airtableSettings.enabled = e.target.checked;
            await Storage.set({ airtableSettings: this.airtableSettings });
            this.populateModalSettings();
        });

        // AirTable fields
        ['airtableToken', 'airtableBaseId', 'airtableTableName', 'airtableQuoteField', 'airtableAuthorField'].forEach(fieldId => {
            document.getElementById(fieldId).addEventListener('change', async (e) => {
                const mapping = {
                    airtableToken: 'apiToken',
                    airtableBaseId: 'baseId',
                    airtableTableName: 'tableName',
                    airtableQuoteField: 'quoteField',
                    airtableAuthorField: 'authorField'
                };
                this.airtableSettings[mapping[fieldId]] = e.target.value;
                await Storage.set({ airtableSettings: this.airtableSettings });
            });
        });

        // Auto-sync toggle
        document.getElementById('airtableAutoSync').addEventListener('change', async (e) => {
            this.airtableSettings.autoSync = e.target.checked;
            await Storage.set({ airtableSettings: this.airtableSettings });
            this.populateModalSettings();

            // Notify background script
            chrome.runtime.sendMessage({ type: 'UPDATE_SYNC_SCHEDULE' });
        });

        // Sync frequency
        document.getElementById('syncFrequency').addEventListener('change', async (e) => {
            this.airtableSettings.syncFrequency = e.target.value;
            await Storage.set({ airtableSettings: this.airtableSettings });
            chrome.runtime.sendMessage({ type: 'UPDATE_SYNC_SCHEDULE' });
        });

        // AirTable buttons
        document.getElementById('testConnectionBtn').addEventListener('click', () => this.testAirTableConnection());
        document.getElementById('syncNowBtn').addEventListener('click', () => this.performManualSync());

        // Custom quotes buttons
        document.getElementById('addQuoteBtn').addEventListener('click', () => this.addCustomQuote());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportQuotes());
        document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAllQuotes());

        // CSV Import buttons
        document.getElementById('selectCsvBtn').addEventListener('click', () => {
            document.getElementById('csvFileInput').click();
        });

        document.getElementById('csvFileInput').addEventListener('change', (e) => {
            this.handleCsvFileSelect(e);
        });

        document.getElementById('importCsvBtn').addEventListener('click', () => {
            this.importCsvQuotes();
        });
    }

    async testAirTableConnection() {
        const testBtn = document.getElementById('testConnectionBtn');
        const originalText = testBtn.textContent;

        try {
            testBtn.textContent = 'Testing...';
            testBtn.disabled = true;

            // Update settings from form
            this.airtableSettings.apiToken = document.getElementById('airtableToken').value;
            this.airtableSettings.baseId = document.getElementById('airtableBaseId').value;
            this.airtableSettings.tableName = document.getElementById('airtableTableName').value;
            await Storage.set({ airtableSettings: this.airtableSettings });

            const result = await AirTable.testConnection(this.airtableSettings);
            this.showNotification(
                result.success ? 'Connection test successful!' : result.error,
                result.success ? 'success' : 'error'
            );
        } catch (error) {
            this.showNotification('Connection test failed: ' + error.message, 'error');
        } finally {
            testBtn.textContent = originalText;
            testBtn.disabled = false;
        }
    }

    async performManualSync() {
        const syncBtn = document.getElementById('syncNowBtn');
        const originalText = syncBtn.textContent;

        try {
            syncBtn.textContent = 'Syncing...';
            syncBtn.disabled = true;

            // Update settings from form
            this.airtableSettings.apiToken = document.getElementById('airtableToken').value;
            this.airtableSettings.baseId = document.getElementById('airtableBaseId').value;
            this.airtableSettings.tableName = document.getElementById('airtableTableName').value;
            this.airtableSettings.quoteField = document.getElementById('airtableQuoteField').value;
            this.airtableSettings.authorField = document.getElementById('airtableAuthorField').value;
            await Storage.set({ airtableSettings: this.airtableSettings });

            // Trigger sync via background script
            const response = await chrome.runtime.sendMessage({ type: 'MANUAL_SYNC' });

            if (response?.success) {
                await this.loadData();
                this.updateSyncStatus();
                await this.loadAndDisplayQuote();
                this.showNotification(`Sync completed! ${response.recordCount} quotes synced.`, 'success');
            } else {
                this.showNotification(`Sync failed: ${response?.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            this.showNotification('Sync failed: ' + error.message, 'error');
        } finally {
            syncBtn.textContent = originalText;
            syncBtn.disabled = false;
        }
    }

    async addCustomQuote() {
        const text = document.getElementById('newQuoteText').value.trim();
        const author = document.getElementById('newQuoteAuthor').value.trim();

        try {
            if (this.editingIndex !== null) {
                await Quotes.update(this.editingIndex, text, author);
                this.editingIndex = null;
                document.getElementById('addQuoteBtn').textContent = 'Add Quote';
                this.showNotification('Quote updated!', 'success');
            } else {
                await Quotes.add(text, author);
                this.showNotification('Quote added successfully!', 'success');
            }

            await this.loadData();
            this.renderCustomQuotes();
            this.updateQuoteStats();
            await this.loadAndDisplayQuote();

            document.getElementById('newQuoteText').value = '';
            document.getElementById('newQuoteAuthor').value = '';
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    editQuote(index) {
        const quote = this.customQuotes[index];
        document.getElementById('newQuoteText').value = quote.text;
        document.getElementById('newQuoteAuthor').value = quote.author;

        this.editingIndex = index;
        document.getElementById('addQuoteBtn').textContent = 'Save Changes';
        document.getElementById('newQuoteText').focus();
        this.showNotification('Editing quote — make changes and click Save', 'info');
    }

    async deleteQuote(index) {
        if (confirm('Are you sure you want to delete this quote?')) {
            // Adjust editing index if needed
            if (this.editingIndex !== null) {
                if (index === this.editingIndex) {
                    this.editingIndex = null;
                    document.getElementById('addQuoteBtn').textContent = 'Add Quote';
                    document.getElementById('newQuoteText').value = '';
                    document.getElementById('newQuoteAuthor').value = '';
                } else if (index < this.editingIndex) {
                    this.editingIndex--;
                }
            }

            await Quotes.delete(index);
            await this.loadData();
            this.renderCustomQuotes();
            this.updateQuoteStats();
            await this.loadAndDisplayQuote();
            this.showNotification('Quote deleted', 'success');
        }
    }

    async exportQuotes() {
        const quotes = await Quotes.export();
        if (quotes.length === 0) {
            this.showNotification('No quotes to export', 'error');
            return;
        }

        const data = JSON.stringify(quotes, null, 2);
        try {
            await navigator.clipboard.writeText(data);
            this.showNotification('Quotes copied to clipboard!', 'success');
        } catch {
            this.showNotification('Failed to copy to clipboard', 'error');
        }
    }

    async clearAllQuotes() {
        if (this.customQuotes.length === 0) {
            this.showNotification('No quotes to clear', 'error');
            return;
        }

        if (confirm(`Are you sure you want to delete all ${this.customQuotes.length} custom quotes?`)) {
            await Quotes.clearAll();
            await this.loadData();
            this.renderCustomQuotes();
            this.updateQuoteStats();
            await this.loadAndDisplayQuote();
            this.showNotification('All custom quotes cleared', 'success');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    handleCsvFileSelect(event) {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        // Check file size (1MB limit)
        const maxSize = 1024 * 1024; // 1MB
        if (file.size > maxSize) {
            this.showNotification('File too large. Maximum size is 1MB.', 'error');
            return;
        }

        // Check file type
        if (!file.name.endsWith('.csv')) {
            this.showNotification('Please select a CSV file.', 'error');
            return;
        }

        // Store the file for later import
        this.selectedCsvFile = file;

        // Update UI
        document.getElementById('csvFileName').textContent = file.name;
        document.getElementById('importCsvBtn').disabled = false;
    }

    async importCsvQuotes() {
        if (!this.selectedCsvFile) {
            this.showNotification('Please select a CSV file first.', 'error');
            return;
        }

        const importBtn = document.getElementById('importCsvBtn');
        const originalText = importBtn.textContent;

        try {
            importBtn.textContent = 'Importing...';
            importBtn.disabled = true;

            const text = await this.readFileAsText(this.selectedCsvFile);
            const quotes = this.parseCSV(text);

            if (quotes.length === 0) {
                this.showNotification('No quotes found in CSV file.', 'error');
                return;
            }

            const result = await Quotes.addBatch(quotes);

            await this.loadData();
            this.renderCustomQuotes();
            this.updateQuoteStats();
            await this.loadAndDisplayQuote();

            // Reset file input
            document.getElementById('csvFileInput').value = '';
            document.getElementById('csvFileName').textContent = '';
            this.selectedCsvFile = null;

            if (result.skipped > 0) {
                this.showNotification(
                    `Imported ${result.added} quotes. ${result.skipped} skipped (duplicates or invalid).`,
                    'info'
                );
            } else {
                this.showNotification(`Successfully imported ${result.added} quotes!`, 'success');
            }
        } catch (error) {
            this.showNotification(`Import failed: ${error.message}`, 'error');
        } finally {
            importBtn.textContent = originalText;
            importBtn.disabled = !this.selectedCsvFile;
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    parseCSV(text) {
        // Parse CSV handling multiline quoted fields
        const records = [];
        let fields = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                fields.push(current);
                current = '';
            } else if (char === '\r' && nextChar === '\n' && !inQuotes) {
                fields.push(current);
                current = '';
                if (fields.some(f => f.trim())) records.push(fields);
                fields = [];
                i++;
            } else if ((char === '\n' || char === '\r') && !inQuotes) {
                fields.push(current);
                current = '';
                if (fields.some(f => f.trim())) records.push(fields);
                fields = [];
            } else {
                current += char;
            }
        }

        if (current || fields.length > 0) {
            fields.push(current);
            if (fields.some(f => f.trim())) records.push(fields);
        }

        if (records.length < 2) {
            throw new Error('CSV file must have at least a header row and one data row.');
        }

        const header = records[0];
        if (header.length < 2) {
            throw new Error('CSV must have at least 2 columns (Quote and Author).');
        }

        const quoteIndex = header.findIndex(col =>
            /^quote$/i.test(col.trim())
        );
        const authorIndex = header.findIndex(col =>
            /^(author|source)$/i.test(col.trim())
        );

        if (quoteIndex === -1) {
            throw new Error('CSV must have a "Quote" column in the header.');
        }
        if (authorIndex === -1) {
            throw new Error('CSV must have an "Author" or "Source" column in the header.');
        }

        const quotes = [];
        for (let i = 1; i < records.length; i++) {
            const row = records[i];
            const quoteText = row[quoteIndex]?.trim();
            const author = row[authorIndex]?.trim();

            if (quoteText && author) {
                quotes.push({ text: quoteText, author });
            }
        }

        return quotes;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new QuoteManager();
});
