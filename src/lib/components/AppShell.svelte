<!-- AppShell.svelte - Main application layout shell -->
<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import { loadModal } from '$lib/utils/lazyModals.js';
  
  const dispatch = createEventDispatcher();
  
  export let showLeftPanel = false;
  export let showRightPanel = false;
  export let isDesktop = false;
  export let leftPanelCollapsed = false;
  export let rightPanelCollapsed = false;
  
  // Lazy-loaded components
  let ChatInterface = null;
  let Sidebar = null;
  let IdeasColumn = null;
  
  // Modal state
  let activeModals = new Map();
  
  // Responsive screen detection
  function checkScreenSize() {
    if (browser) {
      const width = window.innerWidth;
      const wasDesktop = isDesktop;
      isDesktop = width >= 1280;
      
      if (wasDesktop !== isDesktop) {
        dispatch('screen-size-changed', { isDesktop });
        
        if (isDesktop) {
          showLeftPanel = true;
          showRightPanel = true;
        } else {
          showLeftPanel = false;
          showRightPanel = false;
        }
      }
    }
  }
  
  // Lazy load core components
  async function loadCoreComponents() {
    try {
      const [chatModule, sidebarModule, ideasModule] = await Promise.all([
        import('$lib/components/ChatInterface.svelte'),
        import('$lib/components/Sidebar.svelte'),
        import('$lib/components/IdeasColumn.svelte')
      ]);
      
      ChatInterface = chatModule.default;
      Sidebar = sidebarModule.default;
      IdeasColumn = ideasModule.default;
    } catch (error) {
      console.error('Failed to load core components:', error);
    }
  }
  
  // Show modal with lazy loading
  export async function showModal(modalName, props = {}) {
    try {
      const ModalComponent = await loadModal(modalName);
      
      // Create modal instance
      const modal = new ModalComponent({
        target: document.body,
        props: {
          ...props,
          isOpen: true
        }
      });
      
      // Store reference for cleanup
      activeModals.set(modalName, modal);
      
      // Auto-cleanup on close
      modal.$on('close', () => {
        closeModal(modalName);
      });
      
      return modal;
    } catch (error) {
      console.error(`Failed to load modal ${modalName}:`, error);
    }
  }
  
  // Close and cleanup modal
  export function closeModal(modalName) {
    const modal = activeModals.get(modalName);
    if (modal) {
      modal.$destroy();
      activeModals.delete(modalName);
    }
  }
  
  onMount(() => {
    // Load core components
    loadCoreComponents();
    
    // Setup responsive detection
    checkScreenSize();
    if (browser) {
      window.addEventListener('resize', checkScreenSize);
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  });
  
  // Panel toggle functions
  export function toggleLeftPanel() {
    showLeftPanel = !showLeftPanel;
    if (!isDesktop && showLeftPanel && showRightPanel) {
      showRightPanel = false;
    }
  }
  
  export function toggleRightPanel() {
    showRightPanel = !showRightPanel;
    if (!isDesktop && showRightPanel && showLeftPanel) {
      showLeftPanel = false;
    }
  }
  
  export function toggleLeftPanelCollapse() {
    leftPanelCollapsed = !leftPanelCollapsed;
  }
  
  export function toggleRightPanelCollapse() {
    rightPanelCollapsed = !rightPanelCollapsed;
  }
</script>

<!-- App Layout Shell -->
<div class="flex h-[calc(100vh-4rem)] relative overflow-hidden">
  
  <!-- LEFT PANEL: Facts/Docs -->
  <div class="{showLeftPanel ? (isDesktop && !leftPanelCollapsed ? 'w-[30%]' : isDesktop && leftPanelCollapsed ? 'w-0' : 'fixed inset-0 z-50 w-full') : (isDesktop ? 'w-0' : 'fixed inset-0 z-50 w-full')} 
              {!isDesktop ? 'mobile-panel' : ''} transition-all duration-300 ease-in-out border-r border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0"
       style="background-color: var(--bg-panel-left); {!isDesktop ? 'top: 4rem;' : ''}">
    
    {#if showLeftPanel}
      {#if Sidebar}
        <svelte:component this={Sidebar} 
          on:fact-add 
          on:doc-add 
          on:brief-regenerate 
          {...$$restProps} 
        />
      {:else}
        <div class="flex items-center justify-center h-full">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      {/if}
    {/if}
  </div>

  <!-- MAIN AREA: Chat (Center) -->
  <div class="flex-1 flex flex-col relative">
    {#if ChatInterface}
      <svelte:component this={ChatInterface} 
        on:send
        on:switch-branch  
        on:open-format-modal
        on:open-branch-modal
        {...$$restProps}
      />
    {:else}
      <div class="flex items-center justify-center h-full">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    {/if}
    
    <!-- Panel toggle buttons -->
    {#if isDesktop}
      <div class="absolute left-0 top-0 z-50">
        <button
          class="flex items-center text-xs text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-blue-400 transition-colors"
          on:click={toggleLeftPanelCollapse}
          title={leftPanelCollapsed ? "Expand Facts & Docs" : "Collapse Facts & Docs"}
        >
          {#await import('$lib/icons') then { ChevronsRight, ChevronsLeft }}
            {#if leftPanelCollapsed}
              <ChevronsRight size="32" />
            {:else}
              <ChevronsLeft size="32" />
            {/if}
          {/await}
        </button>
      </div>
      
      <div class="absolute right-0 top-0 z-50">
        <button
          class="flex items-center text-xs text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-blue-400 transition-colors"
          on:click={toggleRightPanelCollapse}
          title={rightPanelCollapsed ? "Expand Questions & Ideas" : "Collapse Questions & Ideas"}
        >
          {#await import('$lib/icons') then { ChevronsRight, ChevronsLeft }}
            {#if rightPanelCollapsed}
              <ChevronsLeft size="32" />
            {:else}
              <ChevronsRight size="32" />
            {/if}
          {/await}
        </button>
      </div>
    {/if}
  </div>

  <!-- RIGHT PANEL: Questions/Ideas -->
  <div class="{showRightPanel ? (isDesktop && !rightPanelCollapsed ? 'w-[30%]' : isDesktop && rightPanelCollapsed ? 'w-0' : 'fixed inset-0 z-40 w-full') : (isDesktop ? 'w-0' : 'fixed inset-0 z-40 w-full')} 
              {!isDesktop ? 'mobile-panel-right' : ''} transition-all duration-300 ease-in-out border-l border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0"
       style="background-color: var(--bg-panel-right); {!isDesktop ? 'top: 4rem;' : ''}">
    
    {#if showRightPanel}
      {#if IdeasColumn}
        <svelte:component this={IdeasColumn}
          on:questions-update
          on:insert-text
          on:generate-ideas
          {...$$restProps}
        />
      {:else}
        <div class="flex items-center justify-center h-full">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      {/if}
    {/if}
  </div>
</div>
