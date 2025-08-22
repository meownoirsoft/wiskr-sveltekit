<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import ContextDashboard from '$lib/components/ContextDashboard.svelte';
  import { User, Database, Search } from 'lucide-svelte';

  export let data;
  
  let projects = data.projects || [];
  let users = data.users || [];
  let selectedProjectId = data.selectedProjectId || '';
  let selectedUserId = data.selectedUserId || '';
  let userMessage = 'Tell me about this project';
  let dashboardComponent = null;
  let searchTerm = '';

  // Filter projects based on selected user and search term
  $: filteredProjects = projects.filter(project => {
    const matchesUser = !selectedUserId || project.profiles.id === selectedUserId;
    const matchesSearch = !searchTerm || 
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.profiles.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.profiles.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesUser && matchesSearch;
  });

  function updateUrl() {
    const url = new URL($page.url);
    
    if (selectedProjectId) {
      url.searchParams.set('projectId', selectedProjectId);
    } else {
      url.searchParams.delete('projectId');
    }
    
    if (selectedUserId) {
      url.searchParams.set('userId', selectedUserId);
    } else {
      url.searchParams.delete('userId');
    }
    
    goto(url.pathname + url.search, { replaceState: true });
  }

  function handleUserChange(event) {
    selectedUserId = event.target.value;
    selectedProjectId = ''; // Reset project selection when user changes
    updateUrl();
  }

  function handleProjectChange(event) {
    selectedProjectId = event.target.value;
    updateUrl();
  }

  function handleMessageChange() {
    if (dashboardComponent) {
      dashboardComponent.refresh();
    }
  }

  function getProjectDisplayName(project) {
    const userInfo = project.profiles.full_name || project.profiles.email;
    return `${project.name} (${userInfo})`;
  }
</script>

<svelte:head>
  <title>Admin Context Dashboard - Wiskr</title>
</svelte:head>

<div>
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
      Context Dashboard
    </h1>
    <p class="mt-2 text-gray-600 dark:text-gray-400">
      Monitor and analyze context quality across all projects and users.
    </p>
  </div>

  <!-- Filters and Controls -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- User Filter -->
      <div>
        <label for="user-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <User class="inline h-4 w-4 mr-1" />
          Filter by User
        </label>
        <select
          id="user-select"
          bind:value={selectedUserId}
          on:change={handleUserChange}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Users</option>
          {#each users as user}
            <option value={user.id}>
              {user.full_name || user.email} ({user.email})
            </option>
          {/each}
        </select>
      </div>

      <!-- Search -->
      <div>
        <label for="search" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Search class="inline h-4 w-4 mr-1" />
          Search Projects
        </label>
        <input
          id="search"
          type="text"
          placeholder="Search by project name, description, or user..."
          bind:value={searchTerm}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
        />
      </div>

      <!-- Project Selection -->
      <div>
        <label for="project-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Database class="inline h-4 w-4 mr-1" />
          Select Project
        </label>
        <select
          id="project-select"
          bind:value={selectedProjectId}
          on:change={handleProjectChange}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={filteredProjects.length === 0}
        >
          <option value="">Select a project</option>
          {#each filteredProjects as project}
            <option value={project.id}>
              {getProjectDisplayName(project)}
            </option>
          {/each}
        </select>
        
        {#if filteredProjects.length === 0 && (selectedUserId || searchTerm)}
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            No projects found matching current filters.
          </p>
        {/if}
      </div>
    </div>
  </div>

  <!-- Test Message Input -->
  {#if selectedProjectId}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div>
        <label for="test-message" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Test Message (simulates user input for context analysis):
        </label>
        <div class="flex gap-3">
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
            class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-colors font-medium"
          >
            Analyze
          </button>
        </div>
        <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
          This message determines which facts/docs get selected via vector search. Different messages will show different context compositions.
        </p>
      </div>
    </div>
  {/if}

  <!-- Project Info -->
  {#if selectedProjectId}
    {@const selectedProject = projects.find(p => p.id === selectedProjectId)}
    {#if selectedProject}
      <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div class="flex items-start justify-between">
          <div>
            <h3 class="text-lg font-medium text-blue-900 dark:text-blue-100">
              {selectedProject.name}
            </h3>
            <p class="text-sm text-blue-800 dark:text-blue-200 mt-1">
              Owner: {selectedProject.profiles.full_name || selectedProject.profiles.email}
            </p>
            {#if selectedProject.description}
              <p class="text-sm text-blue-700 dark:text-blue-300 mt-2">
                {selectedProject.description}
              </p>
            {/if}
          </div>
          <div class="text-xs text-blue-600 dark:text-blue-400">
            Created {new Date(selectedProject.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    {/if}
  {/if}

  <!-- Dashboard Component -->
  {#if selectedProjectId}
    <ContextDashboard 
      bind:this={dashboardComponent}
      projectId={selectedProjectId}
      {userMessage}
    />
  {:else}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
      <Database class="h-16 w-16 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Select a Project to Begin
      </h3>
      <p class="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
        Choose a project from the dropdown above to analyze its context composition, vector search results, and data quality.
      </p>
      
      {#if projects.length === 0}
        <div class="mt-6 text-sm text-gray-500 dark:text-gray-400">
          No projects found. Users need to create projects before they can be analyzed here.
        </div>
      {/if}
    </div>
  {/if}
</div>
