// Lazy loading utilities for modals
// This significantly reduces initial bundle size

/**
 * Lazy load a modal component only when needed
 * @param {string} modalName - Name of the modal to load
 * @returns {Promise} Svelte component constructor
 */
export async function loadModal(modalName) {
  switch (modalName) {
    case 'FormatModal':
      return (await import('$lib/components/FormatModal.svelte')).default;
    
    case 'BranchModal':
      return (await import('$lib/components/BranchModal.svelte')).default;
    
    case 'ProjectSettingsModal':
      return (await import('$lib/components/ProjectSettingsModal.svelte')).default;
    
    case 'AppSettingsModal':
      return (await import('$lib/components/AppSettingsModal.svelte')).default;
    
    case 'NewProjectModal':
      return (await import('$lib/components/NewProjectModal.svelte')).default;
    
    case 'ProjectExport':
      return (await import('$lib/components/ProjectExport.svelte')).default;
    
    case 'TLDRModal':
      return (await import('$lib/components/TLDRModal.svelte')).default;
    
    case 'FeedbackModal':
      return (await import('$lib/components/FeedbackModal.svelte')).default;
    
    case 'MrWiskrPopup':
      return (await import('$lib/components/MrWiskrPopup.svelte')).default;
    
    default:
      throw new Error(`Unknown modal: ${modalName}`);
  }
}

/**
 * Create a lazy modal wrapper component
 * @param {string} modalName - Name of the modal
 * @param {Object} props - Props to pass to the modal
 * @param {HTMLElement} target - DOM target to mount to
 */
export async function createLazyModal(modalName, props = {}, target = document.body) {
  const ModalComponent = await loadModal(modalName);
  
  return new ModalComponent({
    target,
    props: {
      ...props,
      // Auto-destroy on close
      on: {
        ...props.on,
        close: (...args) => {
          if (props.on?.close) {
            props.on.close(...args);
          }
          // Clean up component
          setTimeout(() => {
            if (modalInstance) {
              modalInstance.$destroy();
            }
          }, 300); // Wait for exit animation
        }
      }
    }
  });
}
