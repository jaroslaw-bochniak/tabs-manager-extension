# Close Duplicate Tabs Extension

A simple Chrome/Opera extension that closes duplicate tabs with matching URLs with a single click.

## Features

- **Close Exact Duplicates**: Finds all tabs with duplicate URLs and closes duplicates while keeping the first occurrence
- **Close Same Host**: Closes all tabs from the same host/domain as the currently active tab, keeping the active tab
- **Close Current & Same Host**: Closes the current tab and all other tabs from the same host/domain
- Simple one-click interface
- Works with Chrome and Opera browsers

## Installation

### Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right)
3. Click "Load unpacked"
4. Select the folder containing this extension
5. The extension icon should appear in your toolbar

### Opera

1. Open Opera and navigate to `opera://extensions/`
2. Enable "Developer mode" (toggle in the top right)
3. Click "Load unpacked"
4. Select the folder containing this extension
5. The extension icon should appear in your toolbar

## Usage

1. Click the extension icon in your browser toolbar
2. Choose one of the following options:
   - **Close Exact Duplicates**: Closes tabs with identical URLs, keeping the first occurrence of each unique URL
   - **Close Same Host**: Closes all other tabs from the same host/domain as the currently active tab (e.g., if the active tab is `example.com/page1` and you have `example.com/page2` and `example.com/page3` open, those will be closed while keeping the active tab)
   - **Close Current & Same Host**: Closes the current tab and all other tabs from the same host/domain (e.g., if the active tab is `example.com/page1` and you have `example.com/page2` and `example.com/page3` open, all three will be closed)
3. The extension will show a status message indicating how many tabs were closed

## How It Works

### Close Exact Duplicates
- The extension compares URLs across all open tabs
- URLs are normalized (trailing slashes and fragments are removed) for accurate comparison
- The first tab with each unique URL is kept
- All subsequent tabs with the same URL are closed

### Close Same Host
- The extension identifies the currently active tab
- It extracts the hostname (domain) from the active tab's URL
- It finds all other tabs with the same hostname
- All other tabs from the same host are closed, keeping the active tab
- Example: If the active tab is `example.com/page1` and you have `example.com/page2` and `example.com/page3` open, those will be closed while `example.com/page1` remains

### Close Current & Same Host
- The extension identifies the currently active tab
- It extracts the hostname (domain) from the active tab's URL
- It finds all tabs (including the active tab) with the same hostname
- All tabs from the same host are closed, including the current tab
- Example: If the active tab is `example.com/page1` and you have `example.com/page2` and `example.com/page3` open, all three will be closed

## Development

### File Structure

- `manifest.json` - Extension configuration
- `background.js` - Service worker that handles the duplicate tab closing logic
- `popup.html` - User interface
- `popup.js` - Popup interaction logic
- `icon*.png` - Extension icons (generate using `generate-icons.html`)

### Generating Icons

Before loading the extension, you need to generate the icon files:

1. Open `generate-icons.html` in your browser
2. Click each download button to save the icons
3. Save them as `icon16.png`, `icon48.png`, and `icon128.png` in the extension folder

Alternatively, you can create your own icons with the same dimensions (16x16, 48x48, 128x128 pixels).

## Notes

- The extension requires the `tabs` permission to access and close tabs
- URLs are normalized to handle slight variations (e.g., trailing slashes)
- The extension uses Manifest V3, compatible with modern Chrome and Opera browsers

