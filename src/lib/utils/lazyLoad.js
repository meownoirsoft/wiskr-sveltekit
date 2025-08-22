/**
 * Lazy loading utility for Svelte components
 * Helps reduce initial bundle size by loading components only when needed
 */

// Component loaders - these return promises that resolve to Svelte components
export const lazyComponents = {
  // Heavy components that can be lazy loaded
  GlobalSearch: () => import('../components/GlobalSearch.svelte'),
  ProjectExport: () => import('../components/ProjectExport.svelte'),
  ContextQualityIndicator: () => import('../components/ContextQualityIndicator.svelte'),
  RelatedIdeas: () => import('../components/RelatedIdeas.svelte'),
  MrWiskrPopup: () => import('../components/MrWiskrPopup.svelte'),
  
  // Admin components (only load when needed)
  AdminLayout: () => import('../components/AdminLayout.svelte'),
  ContextDashboard: () => import('../components/ContextDashboard.svelte'),
  
  // Modal components (load on demand)
  FormatModal: () => import('../components/FormatModal.svelte'),
  BranchModal: () => import('../components/BranchModal.svelte'),
  NewProjectModal: () => import('../components/NewProjectModal.svelte'),
  ProjectSettingsModal: () => import('../components/ProjectSettingsModal.svelte'),
  
  // Heavy editor components
  EditFactModal: () => import('../components/EditFactModal.svelte'),
  EditDocModal: () => import('../components/EditDocModal.svelte'),
  AddFactModal: () => import('../components/AddFactModal.svelte'),
  AddDocModal: () => import('../components/AddDocModal.svelte'),
  
  // Virtual scrolling components (performance-critical)
  VirtualMessageList: () => import('../components/VirtualMessageList.svelte'),
  MessageItem: () => import('../components/MessageItem.svelte'),
};

/**
 * Load a component lazily with optional loading state
 * @param {string} componentName - Name of the component to load
 * @param {function} onLoading - Optional callback when loading starts
 * @param {function} onLoaded - Optional callback when component loads
 * @param {function} onError - Optional callback if loading fails
 * @returns {Promise<Component>}
 */
export async function loadComponent(componentName, { onLoading, onLoaded, onError } = {}) {
  if (!lazyComponents[componentName]) {
    throw new Error(`Component ${componentName} not found in lazy components registry`);
  }
  
  try {
    if (onLoading) onLoading();
    
    const componentModule = await lazyComponents[componentName]();
    const component = componentModule.default;
    
    if (onLoaded) onLoaded(component);
    
    return component;
  } catch (error) {
    console.error(`Failed to load component ${componentName}:`, error);
    if (onError) onError(error);
    throw error;
  }
}

/**
 * Preload components that will likely be needed soon
 * Call this in onMount or when user interactions suggest components will be needed
 * @param {string[]} componentNames - Array of component names to preload
 */
export function preloadComponents(componentNames) {
  componentNames.forEach(name => {
    if (lazyComponents[name]) {
      lazyComponents[name]().catch(error => {
        console.warn(`Failed to preload component ${name}:`, error);
      });
    }
  });
}

/**
 * Intersection Observer utility for lazy loading components when they come into view
 * @param {HTMLElement} element - Element to observe
 * @param {function} callback - Function to call when element comes into view
 * @param {Object} options - Intersection Observer options
 */
export function observeForLazyLoad(element, callback, options = { rootMargin: '100px' }) {
  if (!('IntersectionObserver' in window)) {
    // Fallback for older browsers
    callback();
    return;
  }
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback();
        observer.unobserve(element);
      }
    });
  }, options);
  
  observer.observe(element);
  
  return observer;
}

/**
 * Route-based component preloading
 * Preload components based on current route
 * @param {string} route - Current route path
 */
export function preloadForRoute(route) {
  if (route.startsWith('/projects')) {
    // Preload components commonly used in projects page
    preloadComponents([
      'GlobalSearch',
      'RelatedIdeas',
      'ContextQualityIndicator'
    ]);
  } else if (route.startsWith('/admin')) {
    // Preload admin components
    preloadComponents([
      'ContextDashboard',
      'AdminLayout'
    ]);
  }
}

/**
 * Bundle size analysis helper - logs component sizes in development
 */
export function analyzeComponentSizes() {
  if (typeof window === 'undefined' || !window.location.hostname.includes('localhost')) {
    return; // Only run in development
  }
  
  console.group('📦 Component Size Analysis');
  Object.keys(lazyComponents).forEach(async (name) => {
    try {
      const start = performance.now();
      await lazyComponents[name]();
      const loadTime = performance.now() - start;
      console.log(`${name}: ~${loadTime.toFixed(2)}ms load time`);
    } catch (error) {
      console.warn(`${name}: Failed to analyze`, error);
    }
  });
  console.groupEnd();
}
