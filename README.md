# Tabs Manager Extension

A Chrome/Opera extension that helps manage your tabs by closing duplicates, organizing them, and cleaning up merged GitHub PRs. Features include closing duplicate tabs, closing tabs from the same host, sorting tabs by hostname, and closing merged GitHub Pull Request tabs.

## Features

- **Close Exact Duplicates**: Finds all tabs with duplicate URLs and closes duplicates while keeping the first occurrence
- **Close Same Host**: Closes all tabs from the same host/domain as the currently active tab, keeping the active tab
- **Close Current & Same Host**: Closes the current tab and all other tabs from the same host/domain
- **Sort Tabs by Host**: Sorts all tabs alphabetically by their hostname/domain
- **Close Merged GitHub PRs**: Finds and closes all open GitHub Pull Request tabs that have been merged
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
   - **Sort Tabs by Host**: Sorts all tabs in the current window alphabetically by their hostname/domain (case-insensitive). Tabs from the same domain are grouped together.
   - **Close Merged GitHub PRs**: Scans all GitHub Pull Request tabs in the current window, reloads them to check their current status, and closes any that have been merged
3. The extension will show a status message indicating the result of the action

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

### Sort Tabs by Host
- The extension gets all tabs in the current window
- It extracts the hostname (domain) from each tab's URL
- It sorts them alphabetically by hostname (case-insensitive)
- Tabs are reordered to match the sorted order, grouping tabs from the same domain together
- Tabs with invalid URLs (e.g., chrome://, about:) are placed at the end
- Example: If you have tabs from `zebra.com`, `apple.com`, and `banana.com`, they will be reordered to group all `apple.com` tabs together, followed by `banana.com` tabs, then `zebra.com` tabs

### Close Merged GitHub PRs
- The extension finds all GitHub tabs in the current window that are Pull Request pages (URLs containing `/pull/`)
- It processes them in batches to avoid overwhelming the browser
- For each PR tab, it reloads the page to ensure it has the latest merge status
- It injects a content script to check if the PR has been merged by looking for merge status indicators in the DOM
- All merged PR tabs are automatically closed
- Pinned tabs are skipped and will not be closed
- Example: If you have 5 open GitHub PR tabs and 3 of them have been merged, clicking this button will close those 3 merged PR tabs

## Development

### File Structure

- `manifest.json` - Extension configuration
- `background.js` - Service worker that handles all tab management logic
- `content.js` - Content script injected into GitHub pages to check PR merge status
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

- The extension requires the `tabs` and `scripting` permissions to access and close tabs, and inject content scripts
- The extension requires host permission for `https://github.com/*` to check PR merge status
- URLs are normalized to handle slight variations (e.g., trailing slashes)
- The extension uses Manifest V3, compatible with modern Chrome and Opera browsers
- When closing merged GitHub PRs, tabs are processed in batches and reloaded to ensure accurate merge status detection

