// Background service worker for closing duplicate tabs

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const actionHandlers = {
    'closeDuplicates': closeDuplicateTabs,
    'closeSameHost': () => closeSameHostTabs(false),
    'closeCurrentAndSameHost': () => closeSameHostTabs(true)
  };

  const handler = actionHandlers[request.action];
  if (!handler) {
    sendResponse({ success: false, error: 'Unknown action' });
    return false;
  }

  handler()
    .then((result) => {
      sendResponse({ success: true, closed: result.closed });
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

