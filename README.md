# New Tab Random Quote

Chrome extension that replaces your new tab page with randomized quotes.

## Features

- Add your own custom quotes
- Built-in collection of ~100 quotes
- AirTable integration for syncing quotes from your personal database
- CSV import for bulk quote uploads
- Light and dark themes
- Customizable typography (font family and size)
- Keyboard shortcuts (Space/Enter for new quote, Escape to close settings)

## Usage

Open a new tab to see a random quote. Click the gear icon (top-right) to access settings.

### Adding Custom Quotes

1. Open settings
2. Go to Custom Quotes
3. Enter quote text and author
4. Click Add Quote

### AirTable Integration

1. Create an AirTable base with Quote and Author columns
2. Get a Personal Access Token from AirTable
3. Enter your credentials in settings under Integrations
4. Enable automatic sync (optional)

### CSV Import

1. Prepare a CSV file with headers: `Quote,Author`
2. Go to settings > Integrations
3. Select your CSV file and import

## Technical Details

Built with Manifest V3, ES6 modules, and vanilla JavaScript. Uses Chrome Storage API for syncing settings across devices. AirTable integration uses service workers for background sync.

File structure:

- `manifest.json` - Extension configuration
- `newtab.html` - Main new tab page
- `js/core/` - Storage, quotes, and AirTable modules
- `js/newtab.js` - Main application
- `js/background.js` - Service worker
- `quotes/default.json` - Built-in quote collection
- `css/newtab.css` - Styles

## Development

Load the extension in Chrome:

1. Go to `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked"
4. Select the extension directory

No build process required.
