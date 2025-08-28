<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import LoadingSpinner from './LoadingSpinner.svelte';

  // Props
  export let componentName = '';
  export let props = {};
  export let loadingMessage = 'Loading...';
  export let errorMessage = 'Failed to load component';
  export let retryable = true;
  export let immediate = false; // Load immediately instead of on intersection
  export let threshold = 0.1; // Intersection observer threshold
  export let rootMargin = '100px'; // Load before visible

  // State
  let componentElement;
  let container;
  let Component = null;
  let loading = false;
  let error = null;
  let retryCount = 0;
  let maxRetries = 3;
  let observer;

  // Component mapping for lazy loading
  const componentMap = {
    'ChatInterface': () => import('./ChatInterface.svelte'),
    'GlobalSearch': () => import('./GlobalSearch.svelte'),
    'AppSettingsModal': () => import('./modals/AppSettingsModal.svelte'),
    'FormatModal': () => import('./modals/FormatModal.svelte'),
    'BranchModal': () => import('./modals/BranchModal.svelte'),
    'NewProjectModal': () => import('./modals/NewProjectModal.svelte'),
    'ProjectSettingsModal': () => import('./modals/ProjectSettingsModal.svelte'),
    'AddFactModal': () => import('./modals/AddFactModal.svelte'),
    'AddDocModal': () => import('./modals/AddDocModal.svelte'),
    'EditFactModal': () => import('./modals/EditFactModal.svelte'),
    'EditDocModal': () => import('./modals/EditDocModal.svelte'),
    'FeedbackModal': () => import('./modals/FeedbackModal.svelte'),
    'TLDRModal': () => import('./modals/TLDRModal.svelte'),
    'BranchPickerModal': () => import('./modals/BranchPickerModal.svelte'),
    'SessionNavigator': () => import('./SessionNavigator.svelte'),
    'IdeasColumn': () => import('./IdeasColumn.svelte'),
    'Sidebar': () => import('./Sidebar.svelte'),
    'TestLazyComponent': () => import('./TestLazyComponent.svelte')
  };

  onMount(() => {
    if (!browser || !componentName) return;

    if (immediate) {
      loadComponent();
    } else {
      setupIntersectionObserver();
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  });

  function setupIntersectionObserver() {
    if (!browser || !container) return;

    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !Component && !loading) {
          loadComponent();
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold,
      rootMargin
    });

    observer.observe(container);
  }

  async function loadComponent() {
    if (!componentName || loading || Component) return;

    const importFn = componentMap[componentName];
    if (!importFn) {
      error = `Unknown component: ${componentName}`;
      return;
    }

    loading = true;
    error = null;

    try {
      const module = await importFn();
      Component = module.default;
      
      // Emit loaded event
      const event = new CustomEvent('component:loaded', {
        detail: { componentName, success: true }
      });
      container?.dispatchEvent(event);
      
    } catch (err) {
      console.error(`Failed to load component ${componentName}:`, err);
      error = err.message || errorMessage;
      retryCount++;
      
      // Emit error event
      const event = new CustomEvent('component:error', {
        detail: { componentName, error: err, retryCount }
      });
      container?.dispatchEvent(event);
      
    } finally {
      loading = false;
    }
  }

  async function retry() {
    if (retryCount >= maxRetries) {
      error = `Failed to load after ${maxRetries} attempts`;
      return;
    }
    
    await loadComponent();
  }

  function handleComponentMount() {
    // Emit mount event
    const event = new CustomEvent('component:mounted', {
      detail: { componentName, element: componentElement }
    });
    container?.dispatchEvent(event);
  }
</script>

<div 
  bind:this={container}
  class="lazy-component-container"
  data-component={componentName}
  class:loading
  class:error={!!error}
>
  {#if loading}
    <div class="lazy-loading-state">
      <LoadingSpinner size="md" />
      <p class="loading-message">{loadingMessage}</p>
    </div>
  {:else if error}
    <div class="lazy-error-state">
      <div class="error-icon">⚠️</div>
      <p class="error-message">{error}</p>
      {#if retryable && retryCount < maxRetries}
        <button 
          class="retry-button"
          on:click={retry}
          disabled={loading}
        >
          Retry ({maxRetries - retryCount} left)
        </button>
      {/if}
    </div>
  {:else if Component}
    <svelte:component 
      this={Component} 
      bind:this={componentElement}
      {...props}
      on:mount={handleComponentMount}
      on:*
    />
  {:else}
    <!-- Placeholder for intersection observer -->
    <div class="lazy-placeholder">
      <div class="placeholder-content">
        <div class="placeholder-shimmer"></div>
      </div>
    </div>
  {/if}
</div>

<style>
  .lazy-component-container {
    position: relative;
    min-height: 100px;
    display: flex;
    flex-direction: column;
  }

  .lazy-loading-state,
  .lazy-error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    min-height: 200px;
    text-align: center;
  }

  .loading-message,
  .error-message {
    margin: 0.5rem 0;
    color: rgb(107 114 128);
    font-size: 0.875rem;
  }

  .error-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }

  .error-message {
    color: rgb(239 68 68);
    margin-bottom: 1rem;
  }

  .retry-button {
    padding: 0.5rem 1rem;
    background: rgb(59 130 246);
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background-color 0.2s;
  }

  .retry-button:hover:not(:disabled) {
    background: rgb(37 99 235);
  }

  .retry-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .lazy-placeholder {
    min-height: 100px;
    background: rgb(249 250 251);
    border-radius: 0.5rem;
    padding: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :global(.dark) .lazy-placeholder {
    background: rgb(31 41 55);
  }

  .placeholder-content {
    width: 100%;
    height: 60px;
    background: rgb(229 231 235);
    border-radius: 0.375rem;
    position: relative;
    overflow: hidden;
  }

  :global(.dark) .placeholder-content {
    background: rgb(55 65 81);
  }

  .placeholder-shimmer {
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.4),
      transparent
    );
    animation: shimmer 1.5s infinite;
  }

  :global(.dark) .placeholder-shimmer {
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.1),
      transparent
    );
  }

  @keyframes shimmer {
    to {
      left: 100%;
    }
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .lazy-loading-state,
    .lazy-error-state {
      padding: 1rem;
      min-height: 150px;
    }

    .loading-message,
    .error-message {
      font-size: 0.8rem;
    }
  }
</style>
