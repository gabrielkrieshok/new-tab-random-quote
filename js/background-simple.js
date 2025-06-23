// Simple Background Service Worker Test
console.log('Service worker starting...');

// Install event
self.addEventListener('install', () => {
    console.log('Service worker installed');
});

// Activate event
self.addEventListener('activate', () => {
    console.log('Service worker activated');
});

// Basic message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Service worker received message:', message);
    
    if (message.type === 'KEEP_ALIVE') {
        console.log('Responding to keep-alive');
        sendResponse({ alive: true, timestamp: Date.now() });
        return false;
    }
    
    if (message.type === 'TEST_CONNECTION') {
        console.log('Test connection requested');
        sendResponse({ success: true, message: 'Simple background script working' });
        return false;
    }
    
    console.log('Unknown message type:', message.type);
    sendResponse({ success: false, error: 'Unknown message type: ' + message.type });
    return false;
});

// Extension startup events
chrome.runtime.onStartup.addListener(() => {
    console.log('Extension started');
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed/updated');
});

console.log('Service worker script loaded and ready');