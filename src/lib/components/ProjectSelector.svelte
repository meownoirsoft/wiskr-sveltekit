<script>
  import { createEventDispatcher } from 'svelte';
  import { Trash, Plus, X, Settings } from 'lucide-svelte';

  export let projects = [];
  export let current = null;
  export let search = '';

  const dispatch = createEventDispatcher();

  // Filtered projects based on search
  $: filtered = projects.filter(p =>
    !search.trim() ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    (p.brief_text ?? '').toLowerCase().includes(search.toLowerCase())
  );

  function clearSearch() {
    search = '';
  }

  function pickProject(project) {
    dispatch('select', project);
  }


  function deleteProject(project) {
    dispatch('delete', project);
  }

  function createNewProject() {
    dispatch('create');
  }

  function openProjectSettings(project) {
    dispatch('open-settings', project);
  }
</script>

<div class="mb-4">
  <div class="flex items-center justify-between mb-3">
    <h3 class="font-semibold text-gray-800">Projects</h3>
    <button 
      class="flex items-center gap-1 text-xs text-white px-2 py-1 rounded transition-colors" 
      style="background-color: var(--color-accent);"
      on:mouseenter={(e) => e.target.style.backgroundColor = 'var(--color-accent-hover)'}
      on:mouseleave={(e) => e.target.style.backgroundColor = 'var(--color-accent)'}
      on:click={createNewProject}
      title="Create new project"
    >
      <Plus size="16" />
      New Project
    </button>
  </div>
  
  <div class="relative mb-3">
    <input
      id="project-search"
      class="border rounded p-2 w-full pr-8 text-sm"
      placeholder="Search projects..."
      bind:value={search}
    />
    {#if search}
      <button
        class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
        title="Clear search"
        on:click={clearSearch}
      >
        <X size="16" />
      </button>
    {/if}
  </div>
  
  <!-- Compact project list -->
  <div class="space-y-1 max-h-32 overflow-y-auto border rounded p-2 bg-white">
    {#each filtered as project}
      <div class="flex items-center justify-between gap-2 p-1 rounded hover:bg-zinc-50 {current?.id === project.id ? 'bg-blue-50 border border-blue-200' : ''}">
        <button
          class="flex items-center gap-2 flex-1 text-left text-sm"
          on:click={() => pickProject(project)}
        >
          <span class="text-sm">{project.icon ?? '📁'}</span>
          <span class="font-medium truncate">{project.name}</span>
        </button>
        <div class="shrink-0 flex items-center gap-1">
          <button 
            class="text-gray-500 hover:text-gray-700 p-1" 
            title="Project Settings"
            on:click={() => openProjectSettings(project)}
          >
            <Settings size="18" />
          </button>
          <button class="text-red-500 hover:text-red-700 p-1" title="Delete" on:click={() => deleteProject(project)}>
            <Trash size="18" />
          </button>
        </div>
      </div>
    {/each}
    {#if !filtered.length}
      <div class="text-sm text-zinc-500 p-2">No projects found.</div>
    {/if}
  </div>
</div>
