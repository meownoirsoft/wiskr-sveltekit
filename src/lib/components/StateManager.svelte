<script>
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { browser } from '$app/environment';
  import { useProjectManagement, useProjectEvents, useModals, useResponsiveLayout } from '$lib/composables/projectLogic.js';
  
  // Props - expose stores to parent
  export let stores = {};
  
  // Initialize composables
  const projectManagement = useProjectManagement();
  const events = useProjectEvents();
  const modals = useModals();
  const layout = useResponsiveLayout();
  
  // Additional app-level state
  const appReady = writable(false);
  const globalError = writable(null);
  const notifications = writable([]);
  
  // Cleanup function
  let cleanupFunctions = [];
  
  onMount(async () => {
    if (!browser) return;
    
    try {
      // Initialize responsive layout
      cleanupFunctions.push(layout.initResponsive());
      
      // Load initial data
      await projectManagement.loadProjects();
      
      // Set up global event listeners
      cleanupFunctions.push(
        setupGlobalKeyboardShortcuts(),
        setupThemeListener(),
        setupNotificationSystem(),
        setupErrorHandling()
      );
      
      // Expose stores to parent component
      stores = {
        // Project management
        projects: projectManagement.projects,
        currentProject: projectManagement.currentProject,
        projectsLoading: projectManagement.isLoading,
        
        // Layout
        isDesktop: layout.isDesktop,
        showLeftPanel: layout.showLeftPanel,
        showRightPanel: layout.showRightPanel,
        leftPanelCollapsed: layout.leftPanelCollapsed,
        rightPanelCollapsed: layout.rightPanelCollapsed,
        
        // Modals
        modals: modals.modals,
        
        // App state
        appReady,
        globalError,
        notifications,
        
        // Actions
        actions: {
          // Project actions
          loadProjects: projectManagement.loadProjects,
          selectProject: projectManagement.selectProject,
          createProject: projectManagement.createProject,
          deleteProject: projectManagement.deleteProject,
          
          // Layout actions
          toggleLeftPanel: layout.toggleLeftPanel,
          toggleRightPanel: layout.toggleRightPanel,
          
          // Modal actions
          showModal: modals.showModal,
          closeModal: modals.closeModal,
          closeAllModals: modals.closeAllModals,
          
          // Event actions
          emit: events.emit,
          on: events.on,
          
          // Utility actions
          addNotification,
          clearNotifications,
          setGlobalError: (error) => globalError.set(error),
          clearGlobalError: () => globalError.set(null)
        }
      };
      
      // Mark app as ready
      appReady.set(true);
      
    } catch (error) {
      console.error('Failed to initialize app state:', error);
      globalError.set('Failed to initialize application. Please refresh the page.');
    }
  });
  
  onDestroy(() => {
    // Run all cleanup functions
    cleanupFunctions.forEach(cleanup => {
      if (typeof cleanup === 'function') {
        try {
          cleanup();
        } catch (error) {
          console.error('Error during cleanup:', error);
        }
      }
    });
    
    // Clear events
    events.clear();
  });
  
  function setupGlobalKeyboardShortcuts() {
    function handleKeydown(event) {
      // Cmd/Ctrl + K for global search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        events.emit('shortcut:search');
      }
      
      // Cmd/Ctrl + Shift + N for new project
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'N') {
        event.preventDefault();
        events.emit('shortcut:new-project');
      }
      
      // Cmd/Ctrl + / for help
      if ((event.metaKey || event.ctrlKey) && event.key === '/') {
        event.preventDefault();
        events.emit('shortcut:help');
      }
      
      // Escape to close modals
      if (event.key === 'Escape') {
        modals.closeAllModals();
      }
    }
    
    document.addEventListener('keydown', handleKeydown);
    
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  }
  
  function setupThemeListener() {
    function handleThemeChange(event) {
      // Update theme-dependent state if needed
      events.emit('theme:changed', { 
        dark: event.matches 
      });
    }
    
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeQuery.addEventListener('change', handleThemeChange);
    
    return () => {
      darkModeQuery.removeEventListener('change', handleThemeChange);
    };
  }
  
  function setupNotificationSystem() {
    let notificationId = 0;
    
    function handleAddNotification(event) {
      const notification = {
        id: ++notificationId,
        ...event.detail,
        timestamp: Date.now()
      };
      
      notifications.update(n => [...n, notification]);
      
      // Auto-remove after delay
      if (notification.autoRemove !== false) {
        const delay = notification.duration || 5000;
        setTimeout(() => {
          removeNotification(notification.id);
        }, delay);
      }
    }
    
    function removeNotification(id) {
      notifications.update(n => n.filter(notif => notif.id !== id));
    }
    
    // Listen for notification events
    const cleanup1 = events.on('notification:add', handleAddNotification);
    
    // Listen for window events
    window.addEventListener('online', () => {
      addNotification({
        type: 'success',
        title: 'Connection Restored',
        message: 'You\'re back online!'
      });
    });
    
    window.addEventListener('offline', () => {
      addNotification({
        type: 'warning',
        title: 'Connection Lost',
        message: 'You\'re currently offline. Some features may not work.',
        autoRemove: false
      });
    });
    
    return () => {
      cleanup1();
    };
  }
  
  function setupErrorHandling() {
    function handleGlobalError(event) {
      console.error('Global error:', event.error);
      
      addNotification({
        type: 'error',
        title: 'Unexpected Error',
        message: 'Something went wrong. Please try again.',
        duration: 8000
      });
    }
    
    function handleUnhandledRejection(event) {
      console.error('Unhandled promise rejection:', event.reason);
      
      addNotification({
        type: 'error',
        title: 'Operation Failed',
        message: 'An operation failed to complete. Please try again.',
        duration: 8000
      });
    }
    
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }
  
  function addNotification(notification) {
    events.emit('notification:add', { detail: notification });
  }
  
  function clearNotifications() {
    notifications.set([]);
  }
</script>

<!-- StateManager is invisible - it only manages state -->
<div style="display: none;" data-component="StateManager">
  <!-- This component manages global state and has no visual output -->
</div>
