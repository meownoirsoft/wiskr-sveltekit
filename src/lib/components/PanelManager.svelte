<!-- PanelManager.svelte - Panel visibility and responsive UI management extracted from projects/+page.svelte -->
<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  const dispatch = createEventDispatcher();

  // Panel visibility state - responsive defaults
  export let showLeftPanel = false;   // Facts/Docs panel
  export let showRightPanel = false;  // Questions/Ideas panel
  export let isDesktop = false;       // Track if we're on desktop

  // Sidebar tab state
  export let activeTab = 'facts';
  
  // Session navigation state
  export let showSessionNavigator = false;
  export let sessionNavigatorElement = null;

  // Search state
  export let search = '';

  // Responsive screen detection
  function checkScreenSize() {
    if (browser) {
      const width = window.innerWidth;
      const wasDesktop = isDesktop;
      isDesktop = width >= 1280; // Custom breakpoint for mobile mode
      
      // Only set initial panel state on first load, not on resize
      if (wasDesktop === false && isDesktop === true) {
        // Switching from mobile to desktop - show both panels
        showLeftPanel = true;
        showRightPanel = true;
        dispatch('panel-state-changed', { showLeftPanel, showRightPanel, isDesktop });
      } else if (wasDesktop === true && isDesktop === false) {
        // Switching from desktop to mobile - hide both panels to show chat
        showLeftPanel = false;
        showRightPanel = false;
        dispatch('panel-state-changed', { showLeftPanel, showRightPanel, isDesktop });
      }
      // If this is the very first time checkScreenSize runs (both were false)
      else if (wasDesktop === false && isDesktop === false) {
        // Mobile initial load - ensure panels are hidden to show chat
        showLeftPanel = false;
        showRightPanel = false;
        dispatch('panel-state-changed', { showLeftPanel, showRightPanel, isDesktop });
      }
      // If switching to desktop for the first time
      else if (wasDesktop === false && isDesktop === true) {
        // Desktop initial load - show both panels
        showLeftPanel = true;
        showRightPanel = true;
        dispatch('panel-state-changed', { showLeftPanel, showRightPanel, isDesktop });
      }
    }
  }

  // Panel toggle functions - independent on mobile, desktop shows both by default
  export function toggleLeftPanel() {
    showLeftPanel = !showLeftPanel;
    // Only close right panel on mobile/tablet (not desktop)
    if (!isDesktop && showLeftPanel && showRightPanel) {
      showRightPanel = false;
    }
    dispatch('panel-state-changed', { showLeftPanel, showRightPanel, isDesktop });
    // Also dispatch global window event for layout to listen to
    if (browser) {
      window.dispatchEvent(new CustomEvent('panel-state-changed', { 
        detail: { showLeftPanel, showRightPanel, isDesktop } 
      }));
    }
  }

  export function toggleRightPanel() {
    showRightPanel = !showRightPanel;
    // Only close left panel on mobile/tablet (not desktop)
    if (!isDesktop && showRightPanel && showLeftPanel) {
      showLeftPanel = false;
    }
    dispatch('panel-state-changed', { showLeftPanel, showRightPanel, isDesktop });
    // Also dispatch global window event for layout to listen to
    if (browser) {
      window.dispatchEvent(new CustomEvent('panel-state-changed', { 
        detail: { showLeftPanel, showRightPanel, isDesktop } 
      }));
    }
  }

  // Force show left panel (for search results)
  export function showLeftPanelForced() {
    showLeftPanel = true;
    if (!isDesktop && showRightPanel) {
      showRightPanel = false;
    }
    dispatch('panel-state-changed', { showLeftPanel, showRightPanel, isDesktop });
    // Also dispatch global window event for layout to listen to
    if (browser) {
      window.dispatchEvent(new CustomEvent('panel-state-changed', { 
        detail: { showLeftPanel, showRightPanel, isDesktop } 
      }));
    }
  }

  // Force show right panel (for search results)
  export function showRightPanelForced() {
    showRightPanel = true;
    if (!isDesktop && showLeftPanel) {
      showLeftPanel = false;
    }
    dispatch('panel-state-changed', { showLeftPanel, showRightPanel, isDesktop });
    // Also dispatch global window event for layout to listen to
    if (browser) {
      window.dispatchEvent(new CustomEvent('panel-state-changed', { 
        detail: { showLeftPanel, showRightPanel, isDesktop } 
      }));
    }
  }

  // Close both panels (show chat only)
  export function closeBothPanels() {
    showLeftPanel = false;
    showRightPanel = false;
    dispatch('panel-state-changed', { showLeftPanel, showRightPanel, isDesktop });
    // Also dispatch global window event for layout to listen to
    if (browser) {
      window.dispatchEvent(new CustomEvent('panel-state-changed', { 
        detail: { showLeftPanel, showRightPanel, isDesktop } 
      }));
    }
  }

  // Tab management
  export function setActiveTab(tab) {
    activeTab = tab;
    dispatch('active-tab-changed', { activeTab });
  }

  // Session navigator management
  export function toggleSessionNavigator() {
    showSessionNavigator = !showSessionNavigator;
    dispatch('session-navigator-toggled', { showSessionNavigator });
  }

  export function closeSessionNavigator() {
    showSessionNavigator = false;
    dispatch('session-navigator-toggled', { showSessionNavigator });
  }

  // Search management
  export function setSearch(searchTerm) {
    search = searchTerm;
    dispatch('search-changed', { search });
  }

  export function clearSearch() {
    search = '';
    dispatch('search-changed', { search });
  }

  // Global search event handlers
  export function handleSearchActivateTab(tabName) {
    if (tabName === 'facts' || tabName === 'docs') {
      activeTab = tabName;
      showLeftPanel = true;
      // On mobile, close right panel if both are open
      if (!isDesktop && showRightPanel) {
        showRightPanel = false;
      }
      dispatch('active-tab-changed', { activeTab });
      dispatch('panel-state-changed', { showLeftPanel, showRightPanel, isDesktop });
    } else if (tabName === 'questions' || tabName === 'ideas') {
      showRightPanel = true;
      // On mobile, close left panel if both are open
      if (!isDesktop && showLeftPanel) {
        showLeftPanel = false;
      }
      dispatch('panel-state-changed', { showLeftPanel, showRightPanel, isDesktop });
    }
  }

  export function handleSearchFilter(type, query) {
    // Set the search term
    search = query;
    
    if (type === 'facts') {
      activeTab = 'facts';
      showLeftPanel = true;
      if (!isDesktop && showRightPanel) {
        showRightPanel = false;
      }
    } else if (type === 'docs') {
      activeTab = 'docs';
      showLeftPanel = true;
      if (!isDesktop && showRightPanel) {
        showRightPanel = false;
      }
    } else if (type === 'questions') {
      showRightPanel = true;
      if (!isDesktop && showLeftPanel) {
        showLeftPanel = false;
      }
    } else if (type === 'ideas') {
      showRightPanel = true;
      if (!isDesktop && showLeftPanel) {
        showLeftPanel = false;
      }
    }
    
    dispatch('search-changed', { search });
    dispatch('active-tab-changed', { activeTab });
    dispatch('panel-state-changed', { showLeftPanel, showRightPanel, isDesktop });
  }

  export function handleSearchClear() {
    // Clear any active search filters
    search = '';
    dispatch('search-changed', { search });
  }

  // Mobile menu handlers
  export function handleMobileShowContext() {
    showLeftPanel = true;
    showRightPanel = false;
    dispatch('panel-state-changed', { showLeftPanel, showRightPanel, isDesktop });
    // Also dispatch global window event for layout to listen to
    if (browser) {
      window.dispatchEvent(new CustomEvent('panel-state-changed', { 
        detail: { showLeftPanel, showRightPanel, isDesktop } 
      }));
    }
  }

  export function handleMobileShowAddins() {
    showRightPanel = true;
    showLeftPanel = false;
    dispatch('panel-state-changed', { showLeftPanel, showRightPanel, isDesktop });
    // Also dispatch global window event for layout to listen to
    if (browser) {
      window.dispatchEvent(new CustomEvent('panel-state-changed', { 
        detail: { showLeftPanel, showRightPanel, isDesktop } 
      }));
    }
  }

  // Mobile toggle handlers (main ones used by header buttons)
  export function handleMobileToggleContext() {
    if (showLeftPanel) {
      showLeftPanel = false;
    } else {
      showLeftPanel = true;
      showRightPanel = false;
    }
    dispatch('panel-state-changed', { showLeftPanel, showRightPanel, isDesktop });
    // Also dispatch global window event for layout to listen to
    if (browser) {
      window.dispatchEvent(new CustomEvent('panel-state-changed', { 
        detail: { showLeftPanel, showRightPanel, isDesktop } 
      }));
    }
  }

  export function handleMobileToggleAddins() {
    if (showRightPanel) {
      showRightPanel = false;
    } else {
      showRightPanel = true;
      showLeftPanel = false;
    }
    dispatch('panel-state-changed', { showLeftPanel, showRightPanel, isDesktop });
    // Also dispatch global window event for layout to listen to
    if (browser) {
      window.dispatchEvent(new CustomEvent('panel-state-changed', { 
        detail: { showLeftPanel, showRightPanel, isDesktop } 
      }));
    }
  }

  // Click outside handler for session navigator
  export function handleClickOutside(event) {
    if (showSessionNavigator && sessionNavigatorElement && !sessionNavigatorElement.contains(event.target)) {
      // Check if the clicked element is the session button (to avoid immediate close/open)
      const sessionButton = document.querySelector('[data-session-button]');
      if (sessionButton && !sessionButton.contains(event.target)) {
        closeSessionNavigator();
      }
    }
  }

  // Initialize and setup event listeners
  onMount(() => {
    if (browser) {
      checkScreenSize();
      window.addEventListener('resize', checkScreenSize);
      
      // Add click outside listener for session navigator
      document.addEventListener('click', handleClickOutside);
      
      // Listen for mobile menu events from header
      window.addEventListener('mobile:show-context', handleMobileShowContext);
      window.addEventListener('mobile:show-addins', handleMobileShowAddins);
      
      // Listen for mobile toggle events from header
      window.addEventListener('mobile:toggle-context', handleMobileToggleContext);
      window.addEventListener('mobile:toggle-addins', handleMobileToggleAddins);
    }
  });

  // Cleanup event listeners
  onDestroy(() => {
    if (browser) {
      window.removeEventListener('resize', checkScreenSize);
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('mobile:show-context', handleMobileShowContext);
      window.removeEventListener('mobile:show-addins', handleMobileShowAddins);
      window.removeEventListener('mobile:toggle-context', handleMobileToggleContext);
      window.removeEventListener('mobile:toggle-addins', handleMobileToggleAddins);
    }
  });
</script>

<!-- PanelManager is a logical component with no template -->
