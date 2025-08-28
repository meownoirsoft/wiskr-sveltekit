<script>
  import { onMount } from 'svelte';
  import AppShell from '$lib/components/AppShell.svelte';
  import StateManager from '$lib/components/StateManager.svelte';
  import ProjectContainer from '$lib/components/ProjectContainer.svelte';
  import LazyComponentLoader from '$lib/components/LazyComponentLoader.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

  // Page data from server
  export let data;

  // Global state managed by StateManager
  let stores = {};
  let appReady = false;
  let globalError = null;
  
  // Component refs
  let stateManager;
  let projectContainer;

  // Derived states from stores
  $: projects = stores.projects;
  $: currentProject = stores.currentProject;
  $: isDesktop = stores.isDesktop;
  $: showLeftPanel = stores.showLeftPanel;
  $: showRightPanel = stores.showRightPanel;
  $: projectsLoading = stores.projectsLoading;
  $: appReady = stores.appReady;
  $: globalError = stores.globalError;
  $: actions = stores.actions;

  // Local UI state
  let messages = [];
  let messagesLoading = false;
  let activeTab = 'facts';

  onMount(async () => {
    // Wait for StateManager to initialize
    if (stateManager) {
      // Listen for keyboard shortcuts
      setupKeyboardShortcuts();
      
      // Listen for component events
      setupComponentEvents();
    }
  });

  function setupKeyboardShortcuts() {
    if (!actions) return;

    // Handle global shortcuts via StateManager events
    actions.on('shortcut:search', () => {
      console.log('Global search shortcut triggered');
      // Focus search when implemented
    });

    actions.on('shortcut:new-project', () => {
      if (actions.showModal) {
        actions.showModal('NewProjectModal');
      }
    });

    actions.on('shortcut:help', () => {
      if (actions.showModal) {
        actions.showModal('AppSettingsModal');
      }
    });
  }

  function setupComponentEvents() {
    if (!actions) return;

    // Handle project changes
    actions.on('container:project-changed', (project) => {
      console.log('Project changed to:', project?.name);
      // Reset messages when project changes
      messages = [];
      messagesLoading = true;
      
      // Load messages for new project
      loadProjectMessages(project?.id);
    });

    actions.on('container:message-added', (message) => {
      console.log('New message added:', message);
      messages = [...messages, message];
    });
  }

  async function loadProjectMessages(projectId) {
    if (!projectId) {
      messagesLoading = false;
      return;
    }

    try {
      messagesLoading = true;
      
      // Simulate loading messages - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // In real app, this would be:
      // const response = await fetch(`/api/projects/${projectId}/messages`);
      // messages = await response.json();
      
      messages = []; // Placeholder
    } catch (error) {
      console.error('Failed to load messages:', error);
      if (actions?.addNotification) {
        actions.addNotification({
          type: 'error',
          title: 'Failed to load messages',
          message: error.message
        });
      }
    } finally {
      messagesLoading = false;
    }
  }

  // Focus chat input when requested
  function focusChat() {
    if (projectContainer) {
      projectContainer.focusChat();
    }
  }
</script>

<svelte:head>
  <title>Projects - Wiskr</title>
  <meta name="description" content="Manage your AI-assisted projects with Wiskr" />
</svelte:head>

<!-- Global state manager - invisible component that manages app state -->
<StateManager bind:this={stateManager} bind:stores />

{#if $appReady && !$globalError}
  <!-- Main app shell with responsive layout and lazy-loaded panels -->
  <AppShell 
    {isDesktop}
    {showLeftPanel} 
    {showRightPanel}
    on:toggle-left={() => actions?.toggleLeftPanel()}
    on:toggle-right={() => actions?.toggleRightPanel()}
  >
    <!-- Left Panel (Facts/Docs) - Lazy loaded -->
    <svelte:fragment slot="left-panel">
      <LazyComponentLoader
        componentName="Sidebar"
        props={{
          activeTab,
          currentProject: $currentProject,
          search: ''
        }}
        loadingMessage="Loading sidebar..."
        on:component:loaded={() => console.log('Sidebar loaded')}
      />
    </svelte:fragment>

    <!-- Main Content Area -->
    <svelte:fragment slot="main">
      <ProjectContainer
        bind:this={projectContainer}
        currentProject={$currentProject}
        {messages}
        {messagesLoading}
        {showLeftPanel}
        {showRightPanel}
        on:message-sent={(e) => messages = [...messages, e.detail]}
      />
    </svelte:fragment>

    <!-- Right Panel (Ideas/Questions) - Lazy loaded -->
    <svelte:fragment slot="right-panel">
      <LazyComponentLoader
        componentName="IdeasColumn"
        props={{
          currentProject: $currentProject,
          messages
        }}
        loadingMessage="Loading ideas panel..."
        threshold={0.2}
        rootMargin="50px"
        on:component:loaded={() => console.log('Ideas panel loaded')}
      />
    </svelte:fragment>
  </AppShell>

{:else if $globalError}
  <!-- Global error state -->
  <div class="error-page">
    <div class="error-content">
      <div class="error-icon">⚠️</div>
      <h1>Something went wrong</h1>
      <p>{$globalError}</p>
      <button 
        class="retry-button"
        on:click={() => window.location.reload()}
      >
        Refresh Page
      </button>
    </div>
  </div>

{:else}
  <!-- App loading state -->
  <div class="loading-page">
    <div class="loading-content">
      <LoadingSpinner size="lg" />
      <h1>Loading Wiskr...</h1>
      <p>Setting up your workspace</p>
    </div>
  </div>
{/if}

<!-- Lazy-loaded modals - only loaded when needed -->
{#if stores.modals}
  {#each Array.from($stores.modals.entries()) as [modalName, modal]}
    <!-- Modal instances are managed by StateManager -->
  {/each}
{/if}

<style>
  /* Global app styles */
  :global(html, body) {
    height: 100%;
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: rgb(249 250 251);
    color: rgb(17 24 39);
  }

  :global(.dark) {
    color: rgb(243 244 246);
    background: rgb(17 24 39);
  }

  /* Loading page styles */
  .loading-page,
  .error-page {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(249 250 251);
  }

  :global(.dark) .loading-page,
  :global(.dark) .error-page {
    background: rgb(17 24 39);
  }

  .loading-content,
  .error-content {
    text-align: center;
    max-width: 400px;
    padding: 2rem;
  }

  .loading-content h1,
  .error-content h1 {
    margin: 1rem 0 0.5rem;
    font-size: 1.5rem;
    font-weight: 600;
    color: rgb(17 24 39);
  }

  :global(.dark) .loading-content h1,
  :global(.dark) .error-content h1 {
    color: rgb(243 244 246);
  }

  .loading-content p,
  .error-content p {
    margin: 0;
    color: rgb(107 114 128);
    font-size: 0.875rem;
  }

  .error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .retry-button {
    margin-top: 1.5rem;
    padding: 0.75rem 1.5rem;
    background: rgb(59 130 246);
    color: white;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s;
  }

  .retry-button:hover {
    background: rgb(37 99 235);
    transform: translateY(-1px);
  }

  .retry-button:active {
    transform: translateY(0);
  }

  /* Ensure proper stacking for modals */
  :global(.modal-backdrop) {
    z-index: 1000;
  }

  :global(.modal) {
    z-index: 1001;
  }

  /* Responsive utilities */
  @media (max-width: 768px) {
    .loading-content,
    .error-content {
      padding: 1rem;
      max-width: 300px;
    }

    .loading-content h1,
    .error-content h1 {
      font-size: 1.25rem;
    }
  }

  /* Performance optimizations */
  :global(*) {
    box-sizing: border-box;
  }

  :global(img) {
    max-width: 100%;
    height: auto;
  }

  /* Smooth scrolling for better UX */
  :global(html) {
    scroll-behavior: smooth;
  }

  /* Focus styles for accessibility */
  :global(:focus-visible) {
    outline: 2px solid rgb(59 130 246);
    outline-offset: 2px;
  }
</style>
