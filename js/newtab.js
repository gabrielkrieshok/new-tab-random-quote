// New Tab Random Quote - Main Script
class QuoteManager {
    constructor() {
        this.currentQuote = null;
        this.quotes = [];
        this.favorites = [];
        this.customQuotes = [];
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
        this.settings = {
            useStock: true,
            theme: 'light',
            showControls: true,
            autoRefresh: false,
            refreshInterval: 30000 // 30 seconds
        };
        this.init();
    }

    async init() {
        await this.loadSettings();
        await this.loadQuotes();
        this.setupEventListeners();
        this.applyTheme();
        this.displayRandomQuote();
        
        if (this.settings.autoRefresh) {
            this.startAutoRefresh();
        }
        
        // Start background script keep-alive mechanism
        this.startBackgroundKeepAlive();
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['settings', 'favorites', 'customQuotes', 'airtableSettings', 'airtableData']);
            this.settings = { ...this.settings, ...result.settings };
            this.favorites = result.favorites || [];
            this.customQuotes = result.customQuotes || [];
            this.airtableSettings = { ...this.airtableSettings, ...result.airtableSettings };
            this.airtableData = result.airtableData || {};
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.sync.set({ 
                settings: this.settings,
                favorites: this.favorites,
                customQuotes: this.customQuotes,
                airtableSettings: this.airtableSettings
            });
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }

    async loadQuotes() {
        try {
            // Load all quote sources from storage
            const result = await chrome.storage.sync.get(['customQuotes', 'airtableData', 'airtableSettings']);
            const customQuotes = result.customQuotes || [];
            const airtableData = result.airtableData || {};
            const airtableSettings = result.airtableSettings || {};
            
            this.quotes = [];
            
            // Add custom quotes
            this.quotes = [...customQuotes];
            
            // Add AirTable quotes if enabled and available
            if (airtableSettings.enabled) {
                const airtableQuotes = await this.loadAirTableQuotes(airtableData);
                if (airtableQuotes.length > 0) {
                    this.quotes = [...this.quotes, ...airtableQuotes];
                }
            }
            
            // Load stock quotes if enabled
            if (this.settings.useStock) {
                const stockQuotes = await this.loadStockQuotes();
                this.quotes = [...this.quotes, ...stockQuotes];
            }
            
            // If no quotes available, show default message
            if (this.quotes.length === 0) {
                this.quotes = [{
                    text: "Welcome to your new quote extension! Add your own quotes, enable stock quotes, or connect AirTable in settings.",
                    author: "Quote Extension"
                }];
            }
        } catch (error) {
            console.error('Failed to load quotes:', error);
            this.quotes = [{
                text: "Something went wrong loading quotes. Please check your settings.",
                author: "System"
            }];
        }
    }

    async loadStockQuotes() {
        try {
            const response = await fetch(chrome.runtime.getURL('quotes/default.json'));
            if (!response.ok) throw new Error('Failed to fetch stock quotes');
            return await response.json();
        } catch (error) {
            console.error('Failed to load stock quotes:', error);
            return [];
        }
    }

    async loadAirTableQuotes(airtableData) {
        try {
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

    displayRandomQuote() {
        if (this.quotes.length === 0) return;
        
        const randomIndex = Math.floor(Math.random() * this.quotes.length);
        this.currentQuote = this.quotes[randomIndex];
        
        const quoteText = document.getElementById('quoteText');
        const quoteAuthor = document.getElementById('quoteAuthor');
        const container = document.getElementById('quoteContainer');
        
        // Prevent scrollbars during transition
        document.body.style.overflow = 'hidden';
        
        // Add loading state with opacity transition
        container.style.opacity = '0.5';
        container.style.transform = 'translateY(10px)';
        
        // Use requestAnimationFrame for smoother transitions
        requestAnimationFrame(() => {
            setTimeout(() => {
                quoteText.textContent = this.currentQuote.text;
                quoteAuthor.textContent = this.currentQuote.author;
                
                // Restore appearance
                container.style.opacity = '1';
                container.style.transform = 'translateY(0)';
                
                // Re-enable scrollbars after transition
                setTimeout(() => {
                    document.body.style.overflow = 'hidden'; // Keep hidden since we set it in CSS
                }, 300);
            }, 150);
        });
    }


    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.settings.theme);
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = 'notification show';
        
        if (type === 'error') {
            notification.style.background = 'rgba(239, 68, 68, 0.9)';
            notification.style.color = 'white';
        } else if (type === 'success') {
            notification.style.background = 'rgba(34, 197, 94, 0.9)';
            notification.style.color = 'white';
        } else {
            notification.style.background = 'var(--control-bg)';
            notification.style.color = 'var(--text-color)';
        }
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        this.refreshTimer = setInterval(() => {
            this.displayRandomQuote();
        }, this.settings.refreshInterval);
    }

    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    setupEventListeners() {
        // Settings button - open modal instead of options page
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openSettingsModal();
        });

        // Close modal button
        document.getElementById('closeModalBtn').addEventListener('click', () => {
            this.closeSettingsModal();
        });

        // Close modal when clicking overlay
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') {
                this.closeSettingsModal();
            }
        });

        // Settings form handlers
        this.setupSettingsHandlers();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                this.displayRandomQuote();
            } else if (e.key === 's' || e.key === 'S') {
                e.preventDefault();
                this.openSettingsModal();
            } else if (e.key === 'Escape') {
                this.closeSettingsModal();
            }
        });

        // Listen for storage changes (settings updated from modal)
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync') {
                if (changes.settings) {
                    this.settings = { ...this.settings, ...changes.settings.newValue };
                    this.applyTheme();
                    
                    if (this.settings.autoRefresh) {
                        this.startAutoRefresh();
                    } else {
                        this.stopAutoRefresh();
                    }
                }
                
                if (changes.customQuotes || changes.airtableData || changes.airtableSettings || changes.settings?.useStock !== this.settings.useStock) {
                    this.loadQuotes().then(() => {
                        this.displayRandomQuote();
                    });
                }
            }
        });

        // Handle visibility change for auto-refresh
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopAutoRefresh();
            } else if (this.settings.autoRefresh) {
                this.startAutoRefresh();
            }
        });
    }

    openSettingsModal() {
        const modal = document.getElementById('settingsModal');
        this.populateModalSettings();
        modal.style.display = 'flex';
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    }

    closeSettingsModal() {
        const modal = document.getElementById('settingsModal');
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    populateModalSettings() {
        // Populate basic settings
        document.getElementById('useStock').checked = this.settings.useStock;
        
        // Populate theme selection
        const themeRadio = document.querySelector(`input[name="theme"][value="${this.settings.theme}"]`);
        if (themeRadio) {
            themeRadio.checked = true;
        }

        // Populate AirTable settings
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

        // Update sync status and custom quotes
        this.updateSyncStatus();
        this.updateQuoteStats();
        this.renderCustomQuotes();
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

    updateQuoteStats() {
        document.getElementById('quoteCount').textContent = 
            `${this.customQuotes.length} custom quote${this.customQuotes.length !== 1 ? 's' : ''}`;
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

    async checkBackgroundScript() {
        const statusElement = document.getElementById('backgroundStatus');
        
        statusElement.textContent = 'Checking...';
        statusElement.style.color = '#6b7280';
        
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
            try {
                const response = await Promise.race([
                    chrome.runtime.sendMessage({ type: 'KEEP_ALIVE' }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout')), 3000)
                    )
                ]);
                
                if (response && response.alive) {
                    statusElement.textContent = '✓ Active';
                    statusElement.style.color = '#059669';
                    return true;
                }
            } catch (error) {
                attempts++;
                console.warn(`Background check attempt ${attempts} failed:`, error);
                
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        
        statusElement.textContent = '✗ Inactive (reload extension)';
        statusElement.style.color = '#dc2626';
        return false;
    }

    startBackgroundKeepAlive() {
        // Send periodic keep-alive messages to ensure background script stays active
        setInterval(async () => {
            try {
                await chrome.runtime.sendMessage({ type: 'KEEP_ALIVE' });
            } catch (error) {
                console.warn('Keep-alive failed:', error);
            }
        }, 30000); // Every 30 seconds
    }

    setupSettingsHandlers() {
        // Basic settings
        document.getElementById('useStock').addEventListener('change', (e) => {
            this.settings.useStock = e.target.checked;
            this.saveSettings();
            this.loadQuotes().then(() => this.displayRandomQuote());
        });

        // Theme selection
        document.querySelectorAll('input[name="theme"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.settings.theme = e.target.value;
                    this.applyTheme();
                    this.saveSettings();
                }
            });
        });

        // AirTable settings
        document.getElementById('airtableEnabled').addEventListener('change', (e) => {
            this.airtableSettings.enabled = e.target.checked;
            this.saveSettings();
            this.populateModalSettings();
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
                this.saveSettings();
            });
        });

        document.getElementById('airtableAutoSync').addEventListener('change', (e) => {
            this.airtableSettings.autoSync = e.target.checked;
            this.saveSettings();
            this.populateModalSettings();
        });

        document.getElementById('syncFrequency').addEventListener('change', (e) => {
            this.airtableSettings.syncFrequency = e.target.value;
            this.saveSettings();
        });

        // AirTable action buttons
        document.getElementById('testConnectionBtn').addEventListener('click', () => {
            this.testAirTableConnection();
        });

        document.getElementById('syncNowBtn').addEventListener('click', () => {
            this.performManualSync();
        });

        // Custom quotes
        document.getElementById('addQuoteBtn').addEventListener('click', () => {
            this.addCustomQuote();
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportQuotes();
        });

        document.getElementById('clearAllBtn').addEventListener('click', () => {
            this.clearAllQuotes();
        });
    }

    // Include all the AirTable methods from options.js
    async sendMessageToBackground(message) {
        try {
            if (!chrome.runtime?.id) {
                throw new Error('Extension context invalidated');
            }
            
            // First try to wake up the background script
            try {
                await chrome.runtime.sendMessage({ type: 'KEEP_ALIVE' });
            } catch (wakeupError) {
                console.log('Background script not responding to keep-alive, will retry...');
            }
            
            // Add a small delay to allow background script to initialize
            await new Promise(resolve => setTimeout(resolve, 200));
            
            return await Promise.race([
                chrome.runtime.sendMessage(message),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Message timeout after 15 seconds')), 15000)
                )
            ]);
        } catch (error) {
            console.warn('Background message failed:', error);
            
            // Second attempt with longer delay
            try {
                console.log('Retrying background message after delay...');
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Try wake up again
                await chrome.runtime.sendMessage({ type: 'KEEP_ALIVE' });
                await new Promise(resolve => setTimeout(resolve, 300));
                
                return await chrome.runtime.sendMessage(message);
            } catch (retryError) {
                console.error('Background script retry failed:', retryError);
                
                if (message.type === 'TEST_CONNECTION') {
                    return await this.fallbackTestConnection();
                } else if (message.type === 'MANUAL_SYNC') {
                    return await this.fallbackManualSync();
                } else {
                    return { success: false, error: 'Background script unavailable. Please reload the extension and try again.' };
                }
            }
        }
    }

    async testAirTableConnection() {
        const testBtn = document.getElementById('testConnectionBtn');
        const originalText = testBtn.textContent;
        
        const existingStatus = document.querySelector('.connection-status');
        if (existingStatus) {
            existingStatus.remove();
        }
        
        try {
            testBtn.textContent = 'Testing...';
            testBtn.classList.add('loading');
            testBtn.disabled = true;
            
            this.airtableSettings.apiToken = document.getElementById('airtableToken').value;
            this.airtableSettings.baseId = document.getElementById('airtableBaseId').value;
            this.airtableSettings.tableName = document.getElementById('airtableTableName').value;
            await this.saveSettings();
            
            const response = await this.sendMessageToBackground({ type: 'TEST_CONNECTION' });
            
            const statusDiv = document.createElement('div');
            statusDiv.className = `connection-status ${response.success ? 'success' : 'error'}`;
            statusDiv.textContent = response.success ? 
                `✓ ${response.message}` : 
                `✗ Error: ${response.error}`;
            
            testBtn.parentNode.insertBefore(statusDiv, testBtn.nextSibling);
            
            this.showNotification(response.success ? 'Connection test successful!' : response.error, 
                                response.success ? 'success' : 'error');
            
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
            
            this.airtableSettings.apiToken = document.getElementById('airtableToken').value;
            this.airtableSettings.baseId = document.getElementById('airtableBaseId').value;
            this.airtableSettings.tableName = document.getElementById('airtableTableName').value;
            this.airtableSettings.quoteField = document.getElementById('airtableQuoteField').value;
            this.airtableSettings.authorField = document.getElementById('airtableAuthorField').value;
            await this.saveSettings();
            
            const response = await this.sendMessageToBackground({ type: 'MANUAL_SYNC' });
            
            if (response.success) {
                const result = await chrome.storage.sync.get(['airtableData']);
                this.airtableData = result.airtableData || {};
                this.updateSyncStatus();
                this.loadQuotes().then(() => this.displayRandomQuote());
                
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

    async fallbackTestConnection() {
        try {
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
        return {
            success: false,
            error: 'Background script unavailable. Please reload the extension and try again.'
        };
    }

    addCustomQuote() {
        const text = document.getElementById('newQuoteText').value.trim();
        const author = document.getElementById('newQuoteAuthor').value.trim();

        if (!text || !author) {
            this.showNotification('Please enter both quote text and author', 'error');
            return;
        }

        const duplicate = this.customQuotes.find(q => 
            q.text.toLowerCase() === text.toLowerCase() && 
            q.author.toLowerCase() === author.toLowerCase()
        );

        if (duplicate) {
            this.showNotification('This quote already exists', 'error');
            return;
        }

        this.customQuotes.push({ text, author });
        this.saveSettings();
        this.renderCustomQuotes();
        this.updateQuoteStats();
        this.loadQuotes().then(() => this.displayRandomQuote());

        document.getElementById('newQuoteText').value = '';
        document.getElementById('newQuoteAuthor').value = '';

        this.showNotification('Quote added successfully!', 'success');
    }

    editQuote(index) {
        const quote = this.customQuotes[index];
        document.getElementById('newQuoteText').value = quote.text;
        document.getElementById('newQuoteAuthor').value = quote.author;
        
        this.customQuotes.splice(index, 1);
        this.saveSettings();
        this.renderCustomQuotes();
        this.updateQuoteStats();
        this.loadQuotes().then(() => this.displayRandomQuote());

        document.getElementById('newQuoteText').focus();
        this.showNotification('Quote loaded for editing', 'success');
    }

    deleteQuote(index) {
        if (confirm('Are you sure you want to delete this quote?')) {
            this.customQuotes.splice(index, 1);
            this.saveSettings();
            this.renderCustomQuotes();
            this.updateQuoteStats();
            this.loadQuotes().then(() => this.displayRandomQuote());
            this.showNotification('Quote deleted', 'success');
        }
    }

    exportQuotes() {
        if (this.customQuotes.length === 0) {
            this.showNotification('No quotes to export', 'error');
            return;
        }

        const data = JSON.stringify(this.customQuotes, null, 2);
        
        navigator.clipboard.writeText(data).then(() => {
            this.showNotification('Quotes copied to clipboard!', 'success');
        }).catch(() => {
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
            this.saveSettings();
            this.renderCustomQuotes();
            this.updateQuoteStats();
            this.loadQuotes().then(() => this.displayRandomQuote());
            this.showNotification('All custom quotes cleared', 'success');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the quote manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new QuoteManager();
});

// Handle any uncaught errors gracefully
window.addEventListener('error', (e) => {
    console.error('Quote extension error:', e.error);
    // You could show a user-friendly error message here
});