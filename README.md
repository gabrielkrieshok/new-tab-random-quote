# New Tab / Random Quote

💬 Be reminded of useful/inspiring messages.

Web app and [Chrome extension](https://chrome.google.com/webstore/detail/new-tab-random-quote/ajdmjnkmegnofepbbkaaklfopjgdocfl) which lets you replace the default 'new tab' screen with your own randomly-selected quotations.

Has support for entering your own quotations, using stock quotes, import and export using browser storage.

The quote page itself is html/css for the layout, and vanilla JavaScript (useing either Chrome storage or local browser storage) for quotations and settings. The settings page uses vue.js, packaged by webpack as a single distribution (in order to work as an extension).

## Project setup/develop/build

```bash
npm install
npm run serve
npm run build
```
