// Popup script for handling user interaction

document.addEventListener('DOMContentLoaded', () => {
  const buttons = {
    closeDuplicates: document.getElementById('closeDuplicatesBtn'),
    closeSameHost: document.getElementById('closeSameHostBtn'),
    closeCurrentAndSameHost: document.getElementById('closeCurrentAndSameHostBtn'),
    sortTabsByHost: document.getElementById('sortTabsByHostBtn'),
    closeMergedGitHubPRs: document.getElementById('closeMergedGitHubPRsBtn')
  };
  const statusDiv = document.getElementById('status');
  
  /**
   * Update button text with count
   */
  function updateButtonText(button, baseText, count) {
    // Find the text span (the one that's not the icon)
    const spans = button.querySelectorAll('span');
    const textSpan = Array.from(spans).find(span => !span.classList.contains('icon'));
    
    if (textSpan && count !== undefined) {
      if (count > 0) {
        textSpan.textContent = `${baseText} (${count})`;
      } else {
        textSpan.textContent = baseText;
      }
    }
  }
  
  /**
   * Load tab counts and update button text
   */
  async function loadTabCounts() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getCounts' });
      if (response.success && response.counts) {
        const counts = response.counts;
        
        // Update button texts with counts
        updateButtonText(buttons.closeDuplicates, 'Close Exact Duplicates', counts.closeDuplicates);
        updateButtonText(buttons.closeSameHost, 'Close Same Host', counts.closeSameHost);
        updateButtonText(buttons.closeCurrentAndSameHost, 'Close Current & Same Host', counts.closeCurrentAndSameHost);
        updateButtonText(buttons.closeMergedGitHubPRs, 'Close Merged GitHub PRs', counts.closeMergedGitHubPRs);
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
          const count = response.closed || response.sorted || 0;
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
  buttons.closeMergedGitHubPRs.addEventListener('click', handleAction('closeMergedGitHubPRs'));
});

