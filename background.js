// Background service worker for closing duplicate tabs

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const actionHandlers = {
    'closeDuplicates': closeDuplicateTabs,
    'closeSameHost': () => closeSameHostTabs(false),
    'closeCurrentAndSameHost': () => closeSameHostTabs(true),
    'sortTabsByHost': sortTabsByHost,
    'closeMergedGitHubPRs': closeMergedGitHubPRs,
    'mergeAllWindows': mergeAllWindows,
    'getCounts': getTabCounts
  };

  const handler = actionHandlers[request.action];
  if (!handler) {
    sendResponse({ success: false, error: 'Unknown action' });
    return false;
  }

  handler()
    .then((result) => {
      // Handle different result formats
      const response = { success: true };
      if (result.hasOwnProperty('closed')) {
        response.closed = result.closed;
      }
      if (result.hasOwnProperty('sorted')) {
        response.sorted = result.sorted;
      }
      if (result.hasOwnProperty('merged')) {
        response.merged = result.merged;
      }
      if (result.hasOwnProperty('counts')) {
        response.counts = result.counts;
      }
      sendResponse(response);
    })
    .catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
  
  return true; // Indicates we will send a response asynchronously
});

async function closeDuplicateTabs() {
  // Get all tabs
  const tabs = await chrome.tabs.query({});
  
  // Group tabs by URL
  const urlMap = new Map();
  const tabsToClose = [];
  
  tabs.forEach((tab) => {
    // Normalize URL by removing trailing slashes and fragments
    const normalizedUrl = normalizeUrl(tab.url);
    
    if (!urlMap.has(normalizedUrl)) {
      // First occurrence - keep this tab
      urlMap.set(normalizedUrl, tab.id);
    } else {
      // Duplicate - mark for closing
      tabsToClose.push(tab.id);
    }
  });
  
  // Close duplicate tabs
  if (tabsToClose.length > 0) {
    await chrome.tabs.remove(tabsToClose);
  }
  
  return { closed: tabsToClose.length };
}

/**
 * Closes tabs from the same host as the active tab
 * @param {boolean} includeCurrent - If true, includes the current tab in tabs to close
 */
async function closeSameHostTabs(includeCurrent = false) {
  // Get the currently active tab
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!activeTab) {
    return { closed: 0 };
  }
  
  // Get the hostname of the active tab
  const activeHost = getHostname(activeTab.url);
  if (!activeHost) {
    return { closed: 0 };
  }
  
  // Get all tabs
  const tabs = await chrome.tabs.query({});
  
  // Find all tabs with the same host as the active tab
  const tabsToClose = [];
  
  for (const tab of tabs) {
    // Skip the active tab if we're not including it
    if (!includeCurrent && tab.id === activeTab.id) {
      continue;
    }
    
    const host = getHostname(tab.url);
    if (host === activeHost) {
      tabsToClose.push(tab.id);
    }
  }
  
  // Close tabs
  if (tabsToClose.length > 0) {
    await chrome.tabs.remove(tabsToClose);
  }
  
  return { closed: tabsToClose.length };
}

/**
 * Extracts hostname from a URL, returns null if parsing fails
 * @param {string} url - The URL to extract hostname from
 * @returns {string|null} - The hostname or null if parsing fails
 */
function getHostname(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    // If URL parsing fails (e.g., chrome://, about:), return null
    return null;
  }
}

/**
 * Sorts all tabs alphabetically by their hostname
 */
async function sortTabsByHost() {
  // Get all tabs in the current window
  const tabs = await chrome.tabs.query({ currentWindow: true });
  
  if (tabs.length <= 1) {
    return { sorted: 0 };
  }
  
  // Sort tabs by hostname (case-insensitive)
  // Tabs without a valid hostname (e.g., chrome://, about:) are placed at the end
  const sortedTabs = [...tabs].sort((a, b) => {
    const hostA = getHostname(a.url) || '\uffff'; // Use high Unicode value for invalid URLs
    const hostB = getHostname(b.url) || '\uffff';
    
    if (hostA === '\uffff' && hostB === '\uffff') {
      // Both are invalid, keep original order
      return 0;
    }
    if (hostA === '\uffff') {
      return 1; // Invalid URLs go to the end
    }
    if (hostB === '\uffff') {
      return -1; // Valid URLs come first
    }
    
    return hostA.toLowerCase().localeCompare(hostB.toLowerCase());
  });
  
  // Get the target indices for each tab
  const tabIds = sortedTabs.map(tab => tab.id);
  
  // Move all tabs at once using move() with array of IDs
  // This is more efficient and handles index shifting automatically
  try {
    await chrome.tabs.move(tabIds, { index: 0 });
  } catch (error) {
    // If bulk move fails, move tabs one by one
    // Move from end to beginning to avoid index shifting issues
    for (let i = sortedTabs.length - 1; i >= 0; i--) {
      const tab = sortedTabs[i];
      const currentIndex = tabs.findIndex(t => t.id === tab.id);
      if (currentIndex !== i) {
        await chrome.tabs.move(tab.id, { index: i });
      }
    }
  }
  
  return { sorted: tabs.length };
}

const BATCH_SIZE = 10;

/**
 * Wait for a specific tab to reach status "complete" (loaded) or time out.
 */
async function waitForTabComplete(tabId, timeoutMs = 15000) {
  return new Promise((resolve) => {
    let settled = false;

    const cleanup = () => {
      chrome.tabs.onUpdated.removeListener(listener);
    };

    const onTimeout = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(false);
    };

    const timeout = setTimeout(onTimeout, timeoutMs);

    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId !== tabId) return;
      if (changeInfo.status === 'complete') {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        cleanup();
        resolve(true);
      }
    };

    chrome.tabs.onUpdated.addListener(listener);

    // Immediate fast-path: if already complete and not discarded, resolve.
    chrome.tabs.get(tabId).then((tab) => {
      if (!settled && tab && tab.status === 'complete' && !tab.discarded) {
        settled = true;
        clearTimeout(timeout);
        cleanup();
        resolve(true);
      }
    }).catch(() => {
      // If we can't get the tab, just rely on timeout.
    });
  });
}

/**
 * Refresh a tab and wait for it to fully load with updated content.
 */
async function ensureTabLoaded(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);

    // Always reload PR tabs to ensure we have the latest merge status.
    // This handles cases where tabs were loaded before the PR was merged.
    try {
      await chrome.tabs.reload(tabId);
    } catch (e) {
      // Reload can fail for some URLs; continue to wait regardless.
    }

    const loaded = await waitForTabComplete(tabId);
    return loaded;
  } catch (e) {
    return false;
  }
}

/**
 * Process tabs in batches to avoid overwhelming the browser
 */
async function processTabsInBatches(tabs, batchSize) {
  for (let i = 0; i < tabs.length; i += batchSize) {
    const batch = tabs.slice(i, i + batchSize);
    await Promise.all(batch.map(processGitHubTab));
  }
}

/**
 * Process a single GitHub PR tab to check if it's merged
 */
async function processGitHubTab(tab) {
  try {
    // Make sure sleeping/unloaded tabs are fully loaded before injecting.
    const loaded = await ensureTabLoaded(tab.id);
    if (!loaded) {
      return; // Skip on timeout or failure
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    });

    if (results && results[0] && results[0].result) {
      await chrome.tabs.remove(tab.id);
      return true;
    }
    return false;
  } catch (error) {
    console.warn(`Could not process tab ${tab.id}: ${error}`);
    return false;
  }
}

/**
 * Closes all GitHub PR tabs that have been merged
 */
async function closeMergedGitHubPRs() {
  const tabs = await chrome.tabs.query({
    currentWindow: true,
    url: "https://github.com/*",
  });

  const prTabs = tabs.filter(tab => tab.url.includes("/pull/") && !tab.pinned);

  if (prTabs.length === 0) {
    return { closed: 0 };
  }

  let closedCount = 0;
  for (let i = 0; i < prTabs.length; i += BATCH_SIZE) {
    const batch = prTabs.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(processGitHubTab));
    closedCount += results.filter(r => r === true).length;
  }

  return { closed: closedCount };
}

/**
 * Moves all tabs from other windows into the current window
 */
async function mergeAllWindows() {
  const [currentWindow] = await chrome.windows.getAll({ populate: false });
  const activeWindows = await chrome.windows.getAll({ windowTypes: ['normal'] });

  if (activeWindows.length <= 1) {
    return { merged: 0 };
  }

  // Get the currently focused window as the target
  const focusedWindow = activeWindows.find(w => w.focused) || activeWindows[0];
  const targetWindowId = focusedWindow.id;

  let movedCount = 0;

  for (const win of activeWindows) {
    if (win.id === targetWindowId) continue;

    const tabs = await chrome.tabs.query({ windowId: win.id });
    const tabIds = tabs.map(t => t.id);

    if (tabIds.length > 0) {
      await chrome.tabs.move(tabIds, { windowId: targetWindowId, index: -1 });
      movedCount += tabIds.length;
    }
  }

  return { merged: movedCount };
}

function normalizeUrl(url) {
  try {
    // Remove fragments and trailing slashes for comparison
    const urlObj = new URL(url);
    urlObj.hash = '';
    let normalized = urlObj.toString();
    
    // Remove trailing slash (except for root URLs)
    if (normalized.endsWith('/') && normalized.split('/').length > 4) {
      normalized = normalized.slice(0, -1);
    }
    
    return normalized;
  } catch (e) {
    // If URL parsing fails, return as-is
    return url;
  }
}

/**
 * Calculate counts for all close actions without actually closing tabs
 */
async function getTabCounts() {
  const counts = {
    closeDuplicates: await countDuplicateTabs(),
    closeSameHost: await countSameHostTabs(false),
    closeCurrentAndSameHost: await countSameHostTabs(true),
    mergeAllWindows: await countOtherWindows(),
    closeMergedGitHubPRs: await countMergedGitHubPRs()
  };

  return { counts };
}

async function countOtherWindows() {
  const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
  return Math.max(0, windows.length - 1);
}

/**
 * Count duplicate tabs without closing them
 */
async function countDuplicateTabs() {
  const tabs = await chrome.tabs.query({});
  const urlMap = new Map();
  let duplicateCount = 0;
  
  tabs.forEach((tab) => {
    const normalizedUrl = normalizeUrl(tab.url);
    
    if (!urlMap.has(normalizedUrl)) {
      urlMap.set(normalizedUrl, tab.id);
    } else {
      duplicateCount++;
    }
  });
  
  return duplicateCount;
}

/**
 * Count tabs from the same host without closing them
 */
async function countSameHostTabs(includeCurrent = false) {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!activeTab) {
    return 0;
  }
  
  const activeHost = getHostname(activeTab.url);
  if (!activeHost) {
    return 0;
  }
  
  const tabs = await chrome.tabs.query({});
  let count = 0;
  
  for (const tab of tabs) {
    if (!includeCurrent && tab.id === activeTab.id) {
      continue;
    }
    
    const host = getHostname(tab.url);
    if (host === activeHost) {
      count++;
    }
  }
  
  return count;
}

/**
 * Count merged GitHub PR tabs (estimate - actual count requires checking each tab)
 */
async function countMergedGitHubPRs() {
  const tabs = await chrome.tabs.query({
    currentWindow: true,
    url: "https://github.com/*",
  });

  const prTabs = tabs.filter(tab => tab.url.includes("/pull/") && !tab.pinned);
  
  // Return the count of PR tabs as an estimate
  // The actual merged count would require checking each tab, which is expensive
  // So we show the total PR tabs count as an upper bound
  return prTabs.length;
}

