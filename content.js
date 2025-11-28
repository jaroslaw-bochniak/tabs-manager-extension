// This script will be injected into GitHub pages to check the PR status.

(() => {
  const isMerged = () => {
    const mergedStatusSpan = document.querySelector('span[title="Status: Merged"]');
    const mergedStateElement = document.querySelector('.State--merged');
    
    return !!(mergedStatusSpan || mergedStateElement);
  };

  return isMerged();
})();

