// Options Page Script
class OptionsManager {
    constructor() {
        this.settings = {
            useStock: true,
            showControls: true,
            autoRefresh: false,
            theme: 'light'
        };
        this.customQuotes = [];
        this.favorites = [];
        this.airtableSettings = {
            enabled: false,
            apiToken: '',
            baseId: '',
            tableName: '',
            quoteField: 'Quote',
            authorField: 'Author',
            autoSync: false,
            syncFrequency: 'daily'
        };
        this.airtableData = {};
        this.init();
    }

    async init() {
        await this.loadData();
        this.populateUI();
        this.setupEventListeners();
        this.updateStats();
    }

    async loadData() {
        try {
            const result = await chrome.storage.sync.get(['settings', 'customQuotes', 'favorites', 'airtableSettings', 'airtableData']);
            this.settings = { ...this.settings, ...result.settings };
            this.customQuotes = result.customQuotes || [];
            this.favorites = result.favorites || [];
            this.airtableSettings = { ...this.airtableSettings, ...result.airtableSettings };
            this.airtableData = result.airtableData || {};
        } catch (error) {
            console.error('Failed to load data:', error);
            this.showNotification('Failed to load settings', 'error');
        }
    }

    async saveData() {
        try {
            await chrome.storage.sync.set({
                settings: this.settings,
                customQuotes: this.customQuotes,
                favorites: this.favorites,
                airtableSettings: this.airtableSettings
            });
            this.showSaveStatus();
        } catch (error) {
            console.error('Failed to save data:', error);
            this.showNotification('Failed to save settings', 'error');
        }
    }

    populateUI() {
        // Populate settings
        document.getElementById('useStock').checked = this.settings.useStock;
        document.getElementById('autoRefresh').checked = this.settings.autoRefresh;
        
        // Populate theme selection
        const themeRadio = document.querySelector(`input[name="theme"][value="${this.settings.theme}"]`);
        if (themeRadio) {
            themeRadio.checked = true;
        }

        // Populate AirTable settings
        this.populateAirTableSettings();

        // Populate quote lists
        this.renderCustomQuotes();
        this.renderFavorites();
    }

    renderCustomQuotes() {
        const container = document.getElementById('quoteList');
        
        if (this.customQuotes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-1l-4 4z"></path>
                    </svg>
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

        // Add event listeners for edit and delete buttons
        container.querySelectorAll('.edit-quote-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.editQuote(index);
            });
        });

        container.querySelectorAll('.delete-quote-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.deleteQuote(index);
            });
        });
    }

    renderFavorites() {
        const container = document.getElementById('favoriteList');
        
        if (this.favorites.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                    </svg>
                    <p>No favorite quotes yet. Mark quotes as favorites from the new tab page!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.favorites.map((quote, index) => `
            <div class="quote-item" data-index="${index}">
                <div class="quote-text">"${this.escapeHtml(quote.text)}"</div>
                <div class="quote-author">— ${this.escapeHtml(quote.author)}</div>
                <div class="quote-actions-inline">
                    <button class="btn btn-secondary copy-favorite-btn" data-index="${index}">Copy</button>
                    <button class="btn btn-danger remove-favorite-btn" data-index="${index}">Remove</button>
                </div>
            </div>
        `).join('');

        // Add event listeners for copy and remove buttons
        container.querySelectorAll('.copy-favorite-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.copyQuote(this.favorites[index]);
            });
        });

        container.querySelectorAll('.remove-favorite-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.removeFavorite(index);
            });
        });
    }

    updateStats() {
        document.getElementById('quoteCount').textContent = 
            `${this.customQuotes.length} custom quote${this.customQuotes.length !== 1 ? 's' : ''}`;
        
        document.getElementById('favoriteCount').textContent = 
            `${this.favorites.length} favorite quote${this.favorites.length !== 1 ? 's' : ''}`;
    }

    populateAirTableSettings() {
        document.getElementById('airtableEnabled').checked = this.airtableSettings.enabled;
        document.getElementById('airtableToken').value = this.airtableSettings.apiToken || '';
        document.getElementById('airtableBaseId').value = this.airtableSettings.baseId || '';
        document.getElementById('airtableTableName').value = this.airtableSettings.tableName || '';
        document.getElementById('airtableQuoteField').value = this.airtableSettings.quoteField || 'Quote';
        document.getElementById('airtableAuthorField').value = this.airtableSettings.authorField || 'Author';
        document.getElementById('airtableAutoSync').checked = this.airtableSettings.autoSync;
        document.getElementById('syncFrequency').value = this.airtableSettings.syncFrequency || 'daily';

        // Show/hide configuration section
        const configSection = document.getElementById('airtableConfig');
        configSection.style.display = this.airtableSettings.enabled ? 'block' : 'none';

        // Show/hide sync frequency
        const syncFrequencyGroup = document.getElementById('syncFrequencyGroup');
        syncFrequencyGroup.style.display = this.airtableSettings.autoSync ? 'block' : 'none';

        // Update sync status
        this.updateSyncStatus();
        this.checkBackgroundScript();
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

    async checkBackgroundScript() {
        const statusElement = document.getElementById('backgroundStatus');
        
        try {
            // Try to send a simple keep-alive message
            await Promise.race([
                chrome.runtime.sendMessage({ type: 'KEEP_ALIVE' }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), 2000)
                )
            ]);
            
            statusElement.textContent = '✓ Active';
            statusElement.style.color = '#059669';
        } catch (error) {
            statusElement.textContent = '✗ Inactive (reload extension)';
            statusElement.style.color = '#dc2626';
            console.warn('Background script not responding:', error);
        }
    }

    setupEventListeners() {
        // Close button
        document.getElementById('closeBtn').addEventListener('click', () => {
            // Open a new tab with the quote page
            chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
            window.close();
        });

        // Settings toggles
        document.getElementById('useStock').addEventListener('change', (e) => {
            this.settings.useStock = e.target.checked;
            this.saveData();
        });

        document.getElementById('autoRefresh').addEventListener('change', (e) => {
            this.settings.autoRefresh = e.target.checked;
            this.saveData();
        });

        // Theme selection
        document.querySelectorAll('input[name="theme"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.settings.theme = e.target.value;
                    this.saveData();
                    this.showNotification(`${e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1)} theme selected`, 'success');
                }
            });
        });

        // Add quote form
        document.getElementById('addQuoteBtn').addEventListener('click', () => {
            this.addQuote();
        });

        // Enter key in form fields
        document.getElementById('newQuoteText').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.addQuote();
            }
        });

        document.getElementById('newQuoteAuthor').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.addQuote();
            }
        });

        // Import/Export buttons
        document.getElementById('importBtn').addEventListener('click', () => {
            this.importQuotes();
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportQuotes();
        });

        document.getElementById('clearAllBtn').addEventListener('click', () => {
            this.clearAllQuotes();
        });

        document.getElementById('clearFavoritesBtn').addEventListener('click', () => {
            this.clearFavorites();
        });

        // File import
        document.getElementById('importFileBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile').addEventListener('change', (e) => {
            this.handleFileImport(e.target.files[0]);
        });

        document.getElementById('exportFileBtn').addEventListener('click', () => {
            this.exportToFile();
        });

        // Reset button
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetToDefaults();
        });

        // AirTable settings
        document.getElementById('airtableEnabled').addEventListener('change', (e) => {
            this.airtableSettings.enabled = e.target.checked;
            this.saveData();
            this.populateAirTableSettings();
            
            // Update sync schedule in background
            this.sendMessageToBackground({ type: 'UPDATE_SYNC_SCHEDULE' }).catch(console.warn);
        });

        // AirTable configuration fields
        const airtableFields = ['airtableToken', 'airtableBaseId', 'airtableTableName', 'airtableQuoteField', 'airtableAuthorField'];
        airtableFields.forEach(fieldId => {
            document.getElementById(fieldId).addEventListener('change', (e) => {
                const fieldName = fieldId.replace('airtable', '').toLowerCase();
                if (fieldName === 'token') {
                    this.airtableSettings.apiToken = e.target.value;
                } else if (fieldName === 'baseid') {
                    this.airtableSettings.baseId = e.target.value;
                } else if (fieldName === 'tablename') {
                    this.airtableSettings.tableName = e.target.value;
                } else if (fieldName === 'quotefield') {
                    this.airtableSettings.quoteField = e.target.value;
                } else if (fieldName === 'authorfield') {
                    this.airtableSettings.authorField = e.target.value;
                }
                this.saveData();
            });
        });

        document.getElementById('airtableAutoSync').addEventListener('change', (e) => {
            this.airtableSettings.autoSync = e.target.checked;
            this.saveData();
            this.populateAirTableSettings();
            
            // Update sync schedule in background
            this.sendMessageToBackground({ type: 'UPDATE_SYNC_SCHEDULE' }).catch(console.warn);
        });

        document.getElementById('syncFrequency').addEventListener('change', (e) => {
            this.airtableSettings.syncFrequency = e.target.value;
            this.saveData();
            
            // Update sync schedule in background
            this.sendMessageToBackground({ type: 'UPDATE_SYNC_SCHEDULE' }).catch(console.warn);
        });

        // AirTable action buttons
        document.getElementById('testConnectionBtn').addEventListener('click', () => {
            this.testAirTableConnection();
        });

        document.getElementById('syncNowBtn').addEventListener('click', () => {
            this.performManualSync();
        });
    }

    addQuote() {
        const text = document.getElementById('newQuoteText').value.trim();
        const author = document.getElementById('newQuoteAuthor').value.trim();

        if (!text) {
            this.showNotification('Please enter quote text', 'error');
            return;
        }

        if (!author) {
            this.showNotification('Please enter quote author', 'error');
            return;
        }

        // Check for duplicates
        const duplicate = this.customQuotes.find(q => 
            q.text.toLowerCase() === text.toLowerCase() && 
            q.author.toLowerCase() === author.toLowerCase()
        );

        if (duplicate) {
            this.showNotification('This quote already exists', 'error');
            return;
        }

        this.customQuotes.push({ text, author });
        this.saveData();
        this.renderCustomQuotes();
        this.updateStats();

        // Clear form
        document.getElementById('newQuoteText').value = '';
        document.getElementById('newQuoteAuthor').value = '';

        this.showNotification('Quote added successfully!', 'success');
    }

    editQuote(index) {
        const quote = this.customQuotes[index];
        document.getElementById('newQuoteText').value = quote.text;
        document.getElementById('newQuoteAuthor').value = quote.author;
        
        // Remove the quote being edited
        this.customQuotes.splice(index, 1);
        this.saveData();
        this.renderCustomQuotes();
        this.updateStats();

        // Focus on text area
        document.getElementById('newQuoteText').focus();
        this.showNotification('Quote loaded for editing', 'success');
    }

    deleteQuote(index) {
        if (confirm('Are you sure you want to delete this quote?')) {
            this.customQuotes.splice(index, 1);
            this.saveData();
            this.renderCustomQuotes();
            this.updateStats();
            this.showNotification('Quote deleted', 'success');
        }
    }

    removeFavorite(index) {
        this.favorites.splice(index, 1);
        this.saveData();
        this.renderFavorites();
        this.updateStats();
        this.showNotification('Removed from favorites', 'success');
    }

    async copyQuote(quote) {
        const text = `"${quote.text}" — ${quote.author}`;
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Quote copied to clipboard!', 'success');
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showNotification('Quote copied to clipboard!', 'success');
        }
    }

    importQuotes() {
        const input = prompt('Enter quotes in JSON format or paste exported data:');
        if (!input) return;

        try {
            const quotes = JSON.parse(input);
            if (!Array.isArray(quotes)) {
                throw new Error('Data must be an array of quotes');
            }

            let imported = 0;
            quotes.forEach(quote => {
                if (quote.text && quote.author) {
                    // Check for duplicates
                    const duplicate = this.customQuotes.find(q => 
                        q.text.toLowerCase() === quote.text.toLowerCase() && 
                        q.author.toLowerCase() === quote.author.toLowerCase()
                    );
                    
                    if (!duplicate) {
                        this.customQuotes.push({
                            text: quote.text,
                            author: quote.author
                        });
                        imported++;
                    }
                }
            });

            if (imported > 0) {
                this.saveData();
                this.renderCustomQuotes();
                this.updateStats();
                this.showNotification(`Imported ${imported} new quote${imported !== 1 ? 's' : ''}!`, 'success');
            } else {
                this.showNotification('No new quotes to import', 'error');
            }
        } catch (error) {
            console.error('Import error:', error);
            this.showNotification('Invalid JSON format', 'error');
        }
    }

    exportQuotes() {
        if (this.customQuotes.length === 0) {
            this.showNotification('No quotes to export', 'error');
            return;
        }

        const data = JSON.stringify(this.customQuotes, null, 2);
        
        // Copy to clipboard
        navigator.clipboard.writeText(data).then(() => {
            this.showNotification('Quotes copied to clipboard!', 'success');
        }).catch(() => {
            // Fallback
            const textArea = document.createElement('textarea');
            textArea.value = data;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showNotification('Quotes copied to clipboard!', 'success');
        });
    }

    clearAllQuotes() {
        if (this.customQuotes.length === 0) {
            this.showNotification('No quotes to clear', 'error');
            return;
        }

        if (confirm(`Are you sure you want to delete all ${this.customQuotes.length} custom quotes? This cannot be undone.`)) {
            this.customQuotes = [];
            this.saveData();
            this.renderCustomQuotes();
            this.updateStats();
            this.showNotification('All custom quotes cleared', 'success');
        }
    }

    clearFavorites() {
        if (this.favorites.length === 0) {
            this.showNotification('No favorites to clear', 'error');
            return;
        }

        if (confirm(`Are you sure you want to clear all ${this.favorites.length} favorite quotes?`)) {
            this.favorites = [];
            this.saveData();
            this.renderFavorites();
            this.updateStats();
            this.showNotification('All favorites cleared', 'success');
        }
    }

    handleFileImport(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                let quotes = [];

                // Handle different export formats
                if (Array.isArray(data)) {
                    quotes = data;
                } else if (data.customQuotes && Array.isArray(data.customQuotes)) {
                    quotes = data.customQuotes;
                } else {
                    throw new Error('Invalid file format');
                }

                let imported = 0;
                quotes.forEach(quote => {
                    if (quote.text && quote.author) {
                        // Check for duplicates
                        const duplicate = this.customQuotes.find(q => 
                            q.text.toLowerCase() === quote.text.toLowerCase() && 
                            q.author.toLowerCase() === quote.author.toLowerCase()
                        );
                        
                        if (!duplicate) {
                            this.customQuotes.push({
                                text: quote.text,
                                author: quote.author
                            });
                            imported++;
                        }
                    }
                });

                if (imported > 0) {
                    this.saveData();
                    this.renderCustomQuotes();
                    this.updateStats();
                    this.showNotification(`Imported ${imported} new quote${imported !== 1 ? 's' : ''}!`, 'success');
                } else {
                    this.showNotification('No new quotes to import', 'error');
                }
            } catch (error) {
                console.error('File import error:', error);
                this.showNotification('Failed to import file. Please check the format.', 'error');
            }
        };
        reader.readAsText(file);
    }

    exportToFile() {
        const data = {
            customQuotes: this.customQuotes,
            favorites: this.favorites,
            exported: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `quote-extension-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Backup file downloaded!', 'success');
    }

    resetToDefaults() {
        if (confirm('Are you sure you want to reset all settings to defaults? This will not delete your custom quotes.')) {
            this.settings = {
                useStock: true,
                showControls: true,
                autoRefresh: false,
                theme: 'light'
            };
            this.saveData();
            this.populateUI();
            this.showNotification('Settings reset to defaults', 'success');
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    showSaveStatus() {
        const status = document.getElementById('saveStatus');
        status.classList.add('show');
        
        setTimeout(() => {
            status.classList.remove('show');
        }, 2000);
    }

    async testAirTableConnection() {
        const testBtn = document.getElementById('testConnectionBtn');
        const originalText = testBtn.textContent;
        
        // Remove any existing status messages
        const existingStatus = document.querySelector('.connection-status');
        if (existingStatus) {
            existingStatus.remove();
        }
        
        try {
            testBtn.textContent = 'Testing...';
            testBtn.classList.add('loading');
            testBtn.disabled = true;
            
            // Save current settings before testing
            this.airtableSettings.apiToken = document.getElementById('airtableToken').value;
            this.airtableSettings.baseId = document.getElementById('airtableBaseId').value;
            this.airtableSettings.tableName = document.getElementById('airtableTableName').value;
            await this.saveData();
            
            const response = await this.sendMessageToBackground({ type: 'TEST_CONNECTION' });
            
            // Create status message
            const statusDiv = document.createElement('div');
            statusDiv.className = `connection-status ${response.success ? 'success' : 'error'}`;
            statusDiv.textContent = response.success ? 
                `✓ ${response.message}` : 
                `✗ Error: ${response.error}`;
            
            // Insert after the test button
            testBtn.parentNode.insertBefore(statusDiv, testBtn.nextSibling);
            
            if (response.success) {
                this.showNotification('Connection test successful!', 'success');
            } else {
                this.showNotification(response.error, 'error');
            }
            
        } catch (error) {
            console.error('Connection test failed:', error);
            this.showNotification('Connection test failed: ' + error.message, 'error');
        } finally {
            testBtn.textContent = originalText;
            testBtn.classList.remove('loading');
            testBtn.disabled = false;
        }
    }

    async performManualSync() {
        const syncBtn = document.getElementById('syncNowBtn');
        const originalText = syncBtn.textContent;
        
        try {
            syncBtn.textContent = 'Syncing...';
            syncBtn.classList.add('loading');
            syncBtn.disabled = true;
            
            // Save current settings before syncing
            this.airtableSettings.apiToken = document.getElementById('airtableToken').value;
            this.airtableSettings.baseId = document.getElementById('airtableBaseId').value;
            this.airtableSettings.tableName = document.getElementById('airtableTableName').value;
            this.airtableSettings.quoteField = document.getElementById('airtableQuoteField').value;
            this.airtableSettings.authorField = document.getElementById('airtableAuthorField').value;
            await this.saveData();
            
            const response = await this.sendMessageToBackground({ type: 'MANUAL_SYNC' });
            
            if (response.success) {
                // Reload AirTable data to update UI
                const result = await chrome.storage.sync.get(['airtableData']);
                this.airtableData = result.airtableData || {};
                this.updateSyncStatus();
                
                this.showNotification(`Sync completed! ${response.recordCount} quotes synced.`, 'success');
            } else {
                this.showNotification(`Sync failed: ${response.error}`, 'error');
            }
            
        } catch (error) {
            console.error('Manual sync failed:', error);
            this.showNotification('Sync failed: ' + error.message, 'error');
        } finally {
            syncBtn.textContent = originalText;
            syncBtn.classList.remove('loading');
            syncBtn.disabled = false;
        }
    }

    async sendMessageToBackground(message) {
        try {
            // Check if service worker is available
            if (!chrome.runtime?.id) {
                throw new Error('Extension context invalidated');
            }
            
            // Send message with timeout
            return await Promise.race([
                chrome.runtime.sendMessage(message),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Message timeout')), 10000)
                )
            ]);
        } catch (error) {
            console.warn('Background message failed:', error);
            
            // Fallback: try to wake up service worker by accessing storage
            try {
                await chrome.storage.local.get('wakeup');
                // Retry the message after a brief delay
                await new Promise(resolve => setTimeout(resolve, 100));
                return await chrome.runtime.sendMessage(message);
            } catch (retryError) {
                console.error('Message retry failed:', retryError);
                
                // For sync operations, provide fallback behavior
                if (message.type === 'TEST_CONNECTION') {
                    return await this.fallbackTestConnection();
                } else if (message.type === 'MANUAL_SYNC') {
                    return await this.fallbackManualSync();
                } else {
                    // For schedule updates, fail silently
                    return { success: false, error: 'Background script unavailable' };
                }
            }
        }
    }

    async fallbackTestConnection() {
        try {
            // Test connection directly from options page
            if (!this.airtableSettings.apiToken || !this.airtableSettings.baseId || !this.airtableSettings.tableName) {
                throw new Error('Missing required AirTable configuration');
            }

            const url = `https://api.airtable.com/v0/${this.airtableSettings.baseId}/${this.airtableSettings.tableName}?maxRecords=1`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.airtableSettings.apiToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            return {
                success: true,
                message: 'Connection successful (direct test)!'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async fallbackManualSync() {
        try {
            console.log('Performing fallback manual sync...');
            
            // Validate settings
            if (!this.airtableSettings.apiToken || !this.airtableSettings.baseId || !this.airtableSettings.tableName) {
                throw new Error('Missing required AirTable configuration');
            }

            // Fetch all quotes from AirTable
            const quotes = await this.fetchAllAirTableQuotes();
            
            // Store the synced data using chunked storage
            await this.storeAirTableQuotes(quotes);
            
            // Store metadata separately
            const airtableData = {
                lastSync: new Date().toISOString(),
                syncTrigger: 'manual-fallback',
                recordCount: quotes.length,
                chunks: Math.ceil(quotes.length / 50) // 50 quotes per chunk
            };

            await chrome.storage.sync.set({ airtableData });
            
            console.log(`Fallback sync completed: ${quotes.length} quotes`);

            return {
                success: true,
                recordCount: quotes.length,
                lastSync: airtableData.lastSync
            };

        } catch (error) {
            console.error('Fallback sync failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async fetchAllAirTableQuotes(offset = null, allQuotes = []) {
        const url = new URL(`https://api.airtable.com/v0/${this.airtableSettings.baseId}/${this.airtableSettings.tableName}`);
        
        // Add pagination
        if (offset) {
            url.searchParams.set('offset', offset);
        }
        
        // Set reasonable page size
        url.searchParams.set('pageSize', '100');

        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': `Bearer ${this.airtableSettings.apiToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Process records into quote format
        const quotes = data.records
            .map(record => this.processAirTableRecord(record))
            .filter(quote => quote.text && quote.author); // Only include complete quotes

        allQuotes.push(...quotes);

        // Handle pagination
        if (data.offset) {
            // Rate limiting: wait 200ms between requests (well under 5 req/sec limit)
            await new Promise(resolve => setTimeout(resolve, 200));
            return this.fetchAllAirTableQuotes(data.offset, allQuotes);
        }

        return allQuotes;
    }

    processAirTableRecord(record) {
        const fields = record.fields || {};
        
        // Get field values with fallbacks
        const text = fields[this.airtableSettings.quoteField] || 
                    fields[this.airtableSettings.quoteField?.toLowerCase()] ||
                    fields.Quote || 
                    fields.quote || 
                    fields.Text || 
                    fields.text || 
                    '';

        const author = fields[this.airtableSettings.authorField] || 
                      fields[this.airtableSettings.authorField?.toLowerCase()] ||
                      fields.Author || 
                      fields.author || 
                      fields.Source || 
                      fields.source || 
                      'Unknown';

        return {
            id: record.id,
            text: text.toString().trim(),
            author: author.toString().trim(),
            source: 'airtable',
            createdTime: record.createdTime
        };
    }

    async storeAirTableQuotes(quotes) {
        try {
            // Clear existing chunked quotes
            await this.clearAirTableQuotes();
            
            // Split quotes into chunks of 50 (well under storage limits)
            const chunkSize = 50;
            const chunks = [];
            
            for (let i = 0; i < quotes.length; i += chunkSize) {
                chunks.push(quotes.slice(i, i + chunkSize));
            }
            
            // Store each chunk separately
            const storePromises = chunks.map(async (chunk, index) => {
                const chunkKey = `airtableQuotes_${index}`;
                return chrome.storage.sync.set({ [chunkKey]: chunk });
            });
            
            await Promise.all(storePromises);
            console.log(`Stored ${quotes.length} quotes in ${chunks.length} chunks`);
            
        } catch (error) {
            console.error('Failed to store AirTable quotes:', error);
            
            // Fallback: try to store in local storage if sync fails
            try {
                await chrome.storage.local.set({ 
                    airtableQuotesLocal: quotes,
                    airtableLocalFallback: true 
                });
                console.log('Stored quotes in local storage as fallback');
            } catch (localError) {
                console.error('Local storage fallback also failed:', localError);
                throw new Error('Unable to store quotes: ' + error.message);
            }
        }
    }

    async clearAirTableQuotes() {
        try {
            // Get all storage keys to find existing chunks
            const allData = await chrome.storage.sync.get(null);
            const chunkKeys = Object.keys(allData).filter(key => key.startsWith('airtableQuotes_'));
            
            if (chunkKeys.length > 0) {
                await chrome.storage.sync.remove(chunkKeys);
                console.log(`Cleared ${chunkKeys.length} existing quote chunks`);
            }
            
            // Also clear local fallback
            await chrome.storage.local.remove(['airtableQuotesLocal', 'airtableLocalFallback']);
            
        } catch (error) {
            console.warn('Failed to clear existing quotes:', error);
        }
    }

    async loadAirTableQuotes() {
        try {
            const airtableData = this.airtableData || {};
            
            if (!airtableData.chunks) {
                // Try loading from old format first
                const oldData = await chrome.storage.sync.get(['airtableData']);
                if (oldData.airtableData?.quotes) {
                    return oldData.airtableData.quotes;
                }
                
                // Check local storage fallback
                const localData = await chrome.storage.local.get(['airtableQuotesLocal']);
                if (localData.airtableQuotesLocal) {
                    return localData.airtableQuotesLocal;
                }
                
                return [];
            }
            
            // Load all chunks
            const chunkKeys = [];
            for (let i = 0; i < airtableData.chunks; i++) {
                chunkKeys.push(`airtableQuotes_${i}`);
            }
            
            const chunkData = await chrome.storage.sync.get(chunkKeys);
            
            // Combine all chunks
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
            } catch (localError) {
                console.error('Local storage fallback failed:', localError);
                return [];
            }
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OptionsManager();
});