<script>
  import { onMount, onDestroy } from 'svelte';
  import ChatInterface from './ChatInterface.svelte';
  import LoadingSpinner from './LoadingSpinner.svelte';
  import { useProjectManagement, useProjectEvents } from '$lib/composables/projectLogic.js';

  // Props
  export let currentProject = null;
  export let messages = [];
  export let messagesLoading = false;
  export let showLeftPanel = false;
  export let showRightPanel = false;

  // Composables
  const { loadProjects } = useProjectManagement();
  const events = useProjectEvents();

  // Internal state
  let containerElement;
  let isReady = false;

  // Event cleanup functions
  let eventCleanups = [];

  onMount(async () => {
    // Initialize project events
    eventCleanups.push(
      events.on('project:changed', handleProjectChanged),
      events.on('message:sent', handleMessageSent),
      events.on('panel:toggle', handlePanelToggle)
    );

    // Mark as ready
    isReady = true;
  });

  onDestroy(() => {
    // Cleanup events
    eventCleanups.forEach(cleanup => cleanup());
    events.clear();
  });

  function handleProjectChanged(project) {
    currentProject = project;
    // Emit event to parent
    events.emit('container:project-changed', project);
  }

  function handleMessageSent(message) {
    // Handle new message
    messages = [...messages, message];
    events.emit('container:message-added', message);
  }

  function handlePanelToggle({ panel, visible }) {
    if (panel === 'left') {
      showLeftPanel = visible;
    } else if (panel === 'right') {
      showRightPanel = visible;
    }
  }

  // Focus management for chat area
  function focusChat() {
    const chatInput = containerElement?.querySelector('[data-chat-input]');
    if (chatInput) {
      chatInput.focus();
    }
  }

  // Expose focus method to parent
  export { focusChat };
</script>

<div 
  bind:this={containerElement}
  class="project-container flex-1 flex flex-col h-full"
  class:ready={isReady}
  data-testid="project-container"
>
  {#if currentProject}
    <div class="project-header flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
        {currentProject.name}
      </h1>
      {#if currentProject.brief_text}
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {currentProject.brief_text}
        </p>
      {/if}
    </div>

    <div class="chat-area flex-1 flex flex-col overflow-hidden">
      {#if messagesLoading}
        <div class="flex items-center justify-center h-full">
          <LoadingSpinner size="lg" />
        </div>
      {:else}
        <ChatInterface 
          {messages}
          projectId={currentProject.id}
          on:message={handleMessageSent}
          class="flex-1"
        />
      {/if}
    </div>
  {:else}
    <div class="no-project flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
      <div class="text-center">
        <div class="text-6xl mb-4">📁</div>
        <h2 class="text-xl font-medium mb-2">No Project Selected</h2>
        <p class="text-sm">Select a project from the sidebar to get started</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .project-container {
    transition: all 0.2s ease-in-out;
  }

  .project-container:not(.ready) {
    opacity: 0;
  }

  .project-container.ready {
    opacity: 1;
  }

  .project-header {
    background: rgb(249 250 251 / 0.8);
    backdrop-filter: blur(8px);
  }

  :global(.dark) .project-header {
    background: rgb(17 24 39 / 0.8);
  }

  .chat-area {
    min-height: 0; /* Allows flex child to shrink below content size */
  }

  .no-project {
    background: linear-gradient(
      135deg,
      rgb(249 250 251 / 0.5) 0%,
      rgb(243 244 246 / 0.3) 100%
    );
  }

  :global(.dark) .no-project {
    background: linear-gradient(
      135deg,
      rgb(17 24 39 / 0.5) 0%,
      rgb(31 41 55 / 0.3) 100%
    );
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .project-header {
      padding: 1rem;
    }
    
    .project-header h1 {
      font-size: 1.125rem;
    }
  }
</style>
