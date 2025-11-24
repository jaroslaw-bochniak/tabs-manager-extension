// Popup script for handling user interaction

document.addEventListener('DOMContentLoaded', () => {
  const buttons = {
    closeDuplicates: document.getElementById('closeDuplicatesBtn'),
    closeSameHost: document.getElementById('closeSameHostBtn'),
    closeCurrentAndSameHost: document.getElementById('closeCurrentAndSameHostBtn')
  };
  const statusDiv = document.getElementById('status');
  
  // Action configuration
  const actionConfig = {
    'closeDuplicates': {
      successText: (count) => `duplicate tab(s)`,
      noResultsText: 'No duplicate tabs found'
    },
    'closeSameHost': {
      successText: (count) => `tab(s) from same host`,
      noResultsText: 'No tabs from same host found'
    },
    'closeCurrentAndSameHost': {
      successText: (count) => `tab(s) (including current)`,
      noResultsText: 'No tabs from same host found'
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
          if (response.closed > 0) {
            statusDiv.textContent = `✓ Closed ${response.closed} ${config.successText(response.closed)}`;
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
        
        // Close popup after 2 seconds if successful
        if (statusDiv.textContent.includes('Closed')) {
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
});

