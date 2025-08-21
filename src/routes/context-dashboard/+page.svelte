<script>
  import { goto } from '$app/navigation';
  import ContextDashboard from '$lib/components/ContextDashboard.svelte';

  export let data;
  
  let projects = data.projects || [];
  let selectedProjectId = data.selectedProjectId || (projects.length > 0 ? projects[0].id : null);
  let userMessage = 'Tell me about this project';
  let dashboardComponent = null;

  function handleProjectChange(event) {
    selectedProjectId = event.target.value;
    // Update URL with selected project
    const url = new URL(window.location);
    url.searchParams.set('projectId', selectedProjectId);
    goto(url.pathname + url.search, { replaceState: true });
  }

  function handleMessageChange() {
    if (dashboardComponent) {
      dashboardComponent.refresh();
    }
  }
</script>

<svelte:head>
  <title>Context Dashboard - Wiskr</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <!-- Navigation Bar -->
  <nav class="bg-white border-b border-gray-200 dark:border-gray-700" style="background-color: var(--bg-primary);">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <div class="flex items-center gap-4">
          <a href="/projects" class="text-blue-600 hover:text-blue-800 font-medium">
            ← Back to Projects
          </a>
          <div class="h-6 border-l border-gray-300"></div>
          <h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Context Dashboard</h1>
        </div>
        
        <!-- Project Selector -->
        {#if projects.length > 0}
          <div class="flex items-center gap-4">
            <label for="project-select" class="text-sm font-medium text-gray-700 dark:text-gray-300">
              Project:
            </label>
            <select
              id="project-select"
              bind:value={selectedProjectId}
              on:change={handleProjectChange}
              class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a project</option>
              {#each projects as project}
                <option value={project.id}>{project.name}</option>
              {/each}
            </select>
          </div>
        {/if}
      </div>
    </div>
  </nav>

  <!-- Test Message Input -->
  {#if selectedProjectId}
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div class="bg-white rounded-lg border border-gray-200 dark:border-gray-600 p-4" style="background-color: var(--bg-primary);">
        <label for="test-message" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Test Message (simulates user input for context analysis):
        </label>
        <div class="flex gap-2">
          <input
            id="test-message"
            type="text"
            bind:value={userMessage}
            on:keydown={(e) => e.key === 'Enter' && handleMessageChange()}
            class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Tell me about my kittens"
          />
          <button
            on:click={handleMessageChange}
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Analyze
          </button>
        </div>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          This message determines which facts/docs get selected via vector search. Different messages will show different context compositions.
        </p>
      </div>
    </div>
  {/if}

  <!-- Dashboard Component -->
  <ContextDashboard 
    bind:this={dashboardComponent}
    projectId={selectedProjectId}
    {userMessage}
  />
</div>
