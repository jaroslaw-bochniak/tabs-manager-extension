// This script will be injected into GitHub pages to check the PR status.

(() => {
  const isMerged = () => {
    // New GitHub layout: look for data-status="pullMerged"
    const newMergedStatus = document.querySelector('span[data-status="pullMerged"]');
    
    // Fallback: look for text "Merged" in the new state label structure
    const mergedTextElement = Array.from(document.querySelectorAll('span')).find(
      span => span.textContent.trim() === 'Merged' && 
              span.classList.contains('prc-StateLabel-StateLabel-Iawzp')
    );
    
    // Old GitHub layout fallbacks (for backwards compatibility)
    const oldMergedStatusSpan = document.querySelector('span[title="Status: Merged"]');
    const oldMergedStateElement = document.querySelector('.State--merged');
    
    return !!(newMergedStatus || mergedTextElement || oldMergedStatusSpan || oldMergedStateElement);
  };

  return isMerged();
})();

