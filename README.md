# New Tab Random Quote - Modern Chrome Extension

💬 Transform your new tab page with daily inspiration and beautiful quotes.

A modern Chrome Extension (Manifest V3) that replaces your new tab page with carefully curated inspiring quotes.

## ✨ Features

### Core Functionality
- **1000+ Curated Quotes** - Inspirational quotes from famous authors, thinkers, and leaders
- **Custom Quote Collections** - Add your own personal quotes and manage them easily
- **AirTable Integration** - Connect your personal AirTable database for advanced quote management
- **Automatic Sync** - Background synchronization with configurable frequency (hourly, daily, weekly)
- **Smart Quote Management** - Import/export your collections, no data loss

### Modern Design
- **4 Beautiful Themes** - Light, Dark, Nature, and Gradient themes
- **Modal Settings Interface** - Beautiful overlay settings without leaving the quote page
- **Responsive Design** - Works perfectly on all screen sizes
- **Smooth Animations** - Polished interactions and flicker-free quote transitions
- **Accessibility** - Keyboard shortcuts and screen reader support

### Enhanced Experience
- **Clean Interface** - Minimal design focused on the quotes themselves
- **Keyboard Navigation** - Space/Enter for new quote, S for settings, Escape to close modal
- **Background Sync** - Automatic AirTable synchronization with service worker
- **Smart Storage** - Chunked storage system handles large quote collections
- **Real-time Updates** - Settings changes apply immediately without page reload

### Data Management
- **Cloud Sync** - Settings and quotes sync across devices via Chrome storage
- **AirTable Database** - Connect your personal AirTable base for centralized quote management
- **Automatic Sync** - Scheduled background synchronization with rate limiting
- **Chunked Storage** - Handles large quote collections efficiently
- **Export Functionality** - Backup your custom quotes as JSON
- **No Data Loss** - All quotes stored securely with fallback mechanisms

## 🎯 Usage

### New Tab Experience
- Open a new tab to see your daily quote
- Use the gear icon to access the modal settings overlay
- Press Space or Enter to get a new quote

### Keyboard Shortcuts
- `Space` or `Enter` - New random quote
- `S` - Open settings modal
- `Escape` - Close settings modal

### Managing Quotes
1. Click the gear icon to open the settings modal
2. Add your own quotes using the quote form
3. Export your collection for backup
4. Enable/disable the built-in stock quote collection
5. Connect AirTable for advanced quote management

### AirTable Integration
1. Create an AirTable base with a quotes table
2. Get a Personal Access Token from AirTable
3. Enter your base ID, table name, and field mappings
4. Test the connection and enable automatic sync
5. Configure sync frequency (hourly, daily, or weekly)

### Themes
Choose from 4 beautiful themes:
- **Light** - Clean and minimal
- **Dark** - Easy on the eyes
- **Nature** - Gradient blues and purples
- **Gradient** - Animated color transitions

## 🛠 Technical Details

### Built With
- **Manifest V3** - Latest Chrome extension standard
- **Service Workers** - Background processing for AirTable sync
- **Vanilla JavaScript** - No heavy frameworks, fast performance
- **Modern CSS** - CSS Grid, Flexbox, CSS Variables, CSS Custom Properties
- **Chrome Storage API** - Secure data synchronization with chunked storage
- **AirTable API** - External database integration with rate limiting
- **Progressive Enhancement** - Works with and without JavaScript

### Browser Compatibility
- Chrome 88+ (Manifest V3 requirement)
- Edge 88+ (Chromium-based)
- Other Chromium browsers with Manifest V3 support

### File Structure
```
/
├── manifest.json          # Extension configuration (Manifest V3)
├── newtab.html            # New tab page with modal settings
├── options.html           # Legacy settings page  
├── popup.html             # Extension popup
├── css/                   # Stylesheets
│   ├── newtab.css         # Main styles with modal interface
│   ├── options.css        # Legacy options styles
│   └── popup.css          # Popup styles
├── js/                    # JavaScript modules
│   ├── newtab.js          # Main app with integrated settings
│   ├── background.js      # Service worker for AirTable sync
│   ├── options.js         # Legacy options functionality
│   └── popup.js           # Popup functionality
├── quotes/                # Quote collections
│   └── default.json       # 1000+ curated quotes
└── icons/                 # Extension icons (16, 32, 48, 128px)
```

## 🔒 Privacy & Security

- **No tracking** - Extension doesn't collect personal data
- **Local storage only** - Quotes stored in Chrome's secure storage
- **Optional external requests** - AirTable integration only when explicitly enabled
- **Secure API communication** - AirTable requests use HTTPS with personal tokens
- **Minimal permissions** - Only requests storage and optional AirTable access
- **Rate limiting** - Background sync respects API limits and prevents abuse
- **Open source** - Code is transparent and auditable

## 🎨 Customization

### Adding Your Own Quotes
1. Click the gear icon to open settings modal
2. Use the "Add Quote" form in the Custom Quotes section
3. Enter quote text and author
4. Quotes are automatically saved and synced across devices

### AirTable Integration Setup
1. Create an AirTable base with columns for Quote and Author
2. Get a Personal Access Token from https://airtable.com/create/tokens
3. Find your base ID from your AirTable API documentation
4. Configure field mappings in the extension settings
5. Test connection and enable automatic sync

Example AirTable structure:
| Quote | Author |
|-------|--------|
| "Your quote text here" | Quote Author |
| "Another inspiring quote" | Another Author |

### Theming
The extension uses CSS custom properties for easy theming. You can modify the CSS files to create custom themes.

## 🚧 Development

### Prerequisites
- Chrome 88+ for testing
- Basic knowledge of HTML/CSS/JavaScript
- Text editor or IDE

### Local Development
1. Clone the repository
2. Make your changes to the source files
3. Load the extension in Chrome via `chrome://extensions/`
4. Test your changes
5. Reload the extension after modifications

### Building
No build process required - the extension runs directly from source files.

## 📝 Changelog

### Version 3.0.0 (Current)
- **Complete rewrite** for Manifest V3 compliance
- **AirTable Integration** - Connect personal databases for advanced quote management
- **Modal Settings Interface** - Beautiful overlay settings without page navigation
- **Background Sync Service** - Automatic synchronization with configurable schedules
- **1000+ Curated Quotes** - Expanded quote collection (10x increase)
- **Modern UI/UX** - 4 theme options with smooth, flicker-free transitions
- **Chunked Storage System** - Handles large quote collections efficiently
- **Keyboard Navigation** - Space/Enter for new quotes, S for settings, Escape to close
- **Clean Minimal Design** - Removed control buttons, focus on content
- **Enhanced Performance** - Service workers, optimized animations, faster loading
- **Real-time Updates** - Settings changes apply immediately
- **Improved Accessibility** - Better keyboard support and screen reader compatibility

### Previous Versions
- Version 2.3 - Legacy Manifest V2 extension
- Features: Basic quote display, custom quotes, settings page

## 🤝 Contributing

Contributions are welcome! Please feel free to:
- Report bugs or request features via GitHub Issues
- Submit pull requests for improvements
- Share your custom quote collections
- Help with translations

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Quote collection curated from public domain sources
- Icons from Lucide React icon library
- Fonts from Google Fonts
- Built with modern web standards

