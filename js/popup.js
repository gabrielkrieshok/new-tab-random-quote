// Popup Script
class PopupManager {
    constructor() {
        this.currentQuote = null;
        this.quotes = [];
        this.favorites = [];
        this.customQuotes = [];
        this.settings = {
            useStock: true,
            showControls: true,
            autoRefresh: false,
            theme: 'light'
        };
        this.init();
    }

    async init() {
        await this.loadData();
        await this.loadQuotes();
        this.setupEventListeners();
        this.updateStats();
        this.displayRandomQuote();
    }

    async loadData() {
        try {
            const result = await chrome.storage.sync.get(['settings', 'favorites', 'customQuotes']);
            this.settings = { ...this.settings, ...result.settings };
            this.favorites = result.favorites || [];
            this.customQuotes = result.customQuotes || [];
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    }

    async loadQuotes() {
        try {
            this.quotes = [...this.customQuotes];
            
            if (this.settings.useStock) {
                const stockQuotes = await this.loadStockQuotes();
                this.quotes = [...this.quotes, ...stockQuotes];
            }
            
            if (this.quotes.length === 0) {
                this.quotes = [{
                    text: "Add your own quotes or enable stock quotes in settings.",
                    author: "Quote Extension"
                }];
            }
        } catch (error) {
            console.error('Failed to load quotes:', error);
            this.quotes = [{
                text: "Error loading quotes. Please check settings.",
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

    displayRandomQuote() {
        if (this.quotes.length === 0) return;
        
        const randomIndex = Math.floor(Math.random() * this.quotes.length);
        this.currentQuote = this.quotes[randomIndex];
        
        const quoteText = document.getElementById('quoteText');
        const quoteAuthor = document.getElementById('quoteAuthor');
        const display = document.querySelector('.quote-display');
        
        display.classList.add('loading');
        
        setTimeout(() => {
            quoteText.textContent = this.currentQuote.text;
            quoteAuthor.textContent = this.currentQuote.author;
            display.classList.remove('loading');
            this.updateFavoriteButton();
        }, 300);
    }

    updateFavoriteButton() {
        const favoriteBtn = document.getElementById('favoriteBtn');
        const isFavorited = this.favorites.some(fav => 
            fav.text === this.currentQuote.text && fav.author === this.currentQuote.author
        );
        
        favoriteBtn.classList.toggle('favorited', isFavorited);
    }

    async toggleFavorite() {
        if (!this.currentQuote) return;
        
        const index = this.favorites.findIndex(fav => 
            fav.text === this.currentQuote.text && fav.author === this.currentQuote.author
        );
        
        if (index > -1) {
            this.favorites.splice(index, 1);
            this.showNotification('Removed from favorites');
        } else {
            this.favorites.push({ ...this.currentQuote });
            this.showNotification('Added to favorites');
        }
        
        this.updateFavoriteButton();
        this.updateStats();
        await this.saveData();
    }

    async copyQuote() {
        if (!this.currentQuote) return;
        
        const quoteText = `"${this.currentQuote.text}" — ${this.currentQuote.author}`;
        
        try {
            await navigator.clipboard.writeText(quoteText);
            this.showNotification('Copied to clipboard!');
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = quoteText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showNotification('Copied to clipboard!');
        }
    }

    updateStats() {
        document.getElementById('quoteCount').textContent = this.customQuotes.length;
        document.getElementById('favoriteCount').textContent = this.favorites.length;
    }

    async saveData() {
        try {
            await chrome.storage.sync.set({
                favorites: this.favorites
            });
        } catch (error) {
            console.error('Failed to save data:', error);
        }
    }

    openOptions() {
        chrome.runtime.openOptionsPage();
        window.close();
    }

    openNewTab() {
        chrome.tabs.create({ url: 'chrome://newtab/' });
        window.close();
    }

    showNotification(message, type = 'success') {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.className = 'notification';
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 2000);
    }

    setupEventListeners() {
        // Refresh quote
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.displayRandomQuote();
        });

        // Toggle favorite
        document.getElementById('favoriteBtn').addEventListener('click', () => {
            this.toggleFavorite();
        });

        // Copy quote
        document.getElementById('copyBtn').addEventListener('click', () => {
            this.copyQuote();
        });

        // Open options
        document.getElementById('optionsBtn').addEventListener('click', () => {
            this.openOptions();
        });

        // Open new tab
        document.getElementById('newTabBtn').addEventListener('click', () => {
            this.openNewTab();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                this.displayRandomQuote();
            } else if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                this.toggleFavorite();
            } else if (e.key === 'c' || e.key === 'C') {
                e.preventDefault();
                this.copyQuote();
            } else if (e.key === 's' || e.key === 'S') {
                e.preventDefault();
                this.openOptions();
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
});