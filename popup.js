// Popup script for handling user interaction

document.addEventListener('DOMContentLoaded', () => {
  const buttons = {
    closeDuplicates: document.getElementById('closeDuplicatesBtn'),
    closeSameHost: document.getElementById('closeSameHostBtn'),
    closeCurrentAndSameHost: document.getElementById('closeCurrentAndSameHostBtn'),
    sortTabsByHost: document.getElementById('sortTabsByHostBtn'),
    mergeAllWindows: document.getElementById('mergeAllWindowsBtn'),
    closeMergedGitHubPRs: document.getElementById('closeMergedGitHubPRsBtn')
  };
  const statusDiv = document.getElementById('status');
  
  function setBadge(button, count) {
    let badge = button.querySelector('.badge');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'badge';
        button.appendChild(badge);
      }
      badge.textContent = count;
    } else if (badge) {
      badge.remove();
    }
  }

  async function loadTabCounts() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getCounts' });
      if (response.success && response.counts) {
        const counts = response.counts;
        setBadge(buttons.closeDuplicates, counts.closeDuplicates);
        setBadge(buttons.closeSameHost, counts.closeSameHost);
        setBadge(buttons.closeCurrentAndSameHost, counts.closeCurrentAndSameHost);
        setBadge(buttons.mergeAllWindows, counts.mergeAllWindows);
        setBadge(buttons.closeMergedGitHubPRs, counts.closeMergedGitHubPRs);
      }
    } catch (error) {
      console.error('Error loading tab counts:', error);
    }
  }
  
  // Load and display counts
  loadTabCounts();
  
  // Action configuration
  const actionConfig = {
    'closeDuplicates': {
      successText: (count) => `duplicate tab(s)`,
      noResultsText: 'No duplicate tabs found',
      hasCount: true
    },
    'closeSameHost': {
      successText: (count) => `tab(s) from same host`,
      noResultsText: 'No tabs from same host found',
      hasCount: true
    },
    'closeCurrentAndSameHost': {
      successText: (count) => `tab(s) (including current)`,
      noResultsText: 'No tabs from same host found',
      hasCount: true
    },
    'sortTabsByHost': {
      successText: (count) => `Sorted ${count} tab(s)`,
      noResultsText: 'No tabs to sort',
      hasCount: true
    },
    'mergeAllWindows': {
      successText: (count) => `Merged ${count} tab(s) into this window`,
      noResultsText: 'Only one window open — nothing to merge',
      hasCount: true
    },
    'closeMergedGitHubPRs': {
      successText: (count) => `Closed ${count} merged PR tab(s)`,
      noResultsText: 'No merged GitHub PR tabs found',
      hasCount: true
    }
  };
  
  function setButtonsDisabled(disabled) {
    Object.values(buttons).forEach(btn => btn.disabled = disabled);
  }
  
  function handleAction(action) {
    return async () => {
      setButtonsDisabled(true);
      statusDiv.textContent = 'Processing...';
      statusDiv.className = 'status';
      
      try {
        const response = await chrome.runtime.sendMessage({ action });
        const config = actionConfig[action];
        
        if (response.success) {
          const count = response.closed || response.sorted || response.merged || 0;
          if (count > 0 && config.hasCount) {
            statusDiv.textContent = `✓ ${config.successText(count)}`;
            statusDiv.className = 'status success';
          } else if (count > 0) {
            statusDiv.textContent = `✓ ${config.successText(count)}`;
            statusDiv.className = 'status success';
          } else {
            statusDiv.textContent = config.noResultsText;
            statusDiv.className = 'status';
          }
        } else {
          statusDiv.textContent = `Error: ${response.error || 'Unknown error'}`;
          statusDiv.className = 'status error';
        }
      } catch (error) {
        statusDiv.textContent = `Error: ${error.message}`;
        statusDiv.className = 'status error';
      } finally {
        setButtonsDisabled(false);
        
        // Reload counts after action completes
        if (action !== 'sortTabsByHost') {
          loadTabCounts();
        }
        
        // Close popup after 2 seconds if successful
        if (statusDiv.textContent.includes('✓')) {
          setTimeout(() => {
            window.close();
          }, 2000);
        }
      }
    };
  }
  
  // Attach event listeners
  buttons.closeDuplicates.addEventListener('click', handleAction('closeDuplicates'));
  buttons.closeSameHost.addEventListener('click', handleAction('closeSameHost'));
  buttons.closeCurrentAndSameHost.addEventListener('click', handleAction('closeCurrentAndSameHost'));
  buttons.sortTabsByHost.addEventListener('click', handleAction('sortTabsByHost'));
  buttons.mergeAllWindows.addEventListener('click', handleAction('mergeAllWindows'));
  buttons.closeMergedGitHubPRs.addEventListener('click', handleAction('closeMergedGitHubPRs'));
});

