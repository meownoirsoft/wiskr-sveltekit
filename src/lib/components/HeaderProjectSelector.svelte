<script>
  import { createEventDispatcher } from 'svelte';
  import { Plus, Search, ChevronDown, Settings, Trash, X } from 'lucide-svelte';

  export let projects = [];
  export let current = null;
  export let search = '';

  const dispatch = createEventDispatcher();

  let showDropdown = false;
  let dropdownEl;

  // Filtered projects based on search
  $: filtered = projects.filter(p =>
    !search.trim() ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    (p.brief_text ?? '').toLowerCase().includes(search.toLowerCase())
  );

  function toggleDropdown() {
    showDropdown = !showDropdown;
    if (showDropdown) {
      // Focus search input when dropdown opens
      setTimeout(() => {
        const searchInput = dropdownEl?.querySelector('input[type="text"]');
        searchInput?.focus();
      }, 50);
    }
  }

  function closeDropdown() {
    showDropdown = false;
    search = '';
  }

  function selectProject(project) {
    dispatch('select', project);
    closeDropdown();
  }

  function createNewProject() {
    dispatch('create');
    closeDropdown();
  }

  function openProjectSettings(project, event) {
    event.stopPropagation();
    dispatch('open-settings', project);
    closeDropdown();
  }

  function deleteProject(project, event) {
    event.stopPropagation();
    dispatch('delete', project);
    closeDropdown();
  }

  // Close dropdown when clicking outside
  function handleOutsideClick(event) {
    if (dropdownEl && !dropdownEl.contains(event.target)) {
      closeDropdown();
    }
  }

  $: if (typeof window !== 'undefined') {
    if (showDropdown) {
      document.addEventListener('click', handleOutsideClick);
    } else {
      document.removeEventListener('click', handleOutsideClick);
    }
  }
</script>

<div class="relative" bind:this={dropdownEl}>
  <!-- Current project button -->
  <button 
    class="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-lg hover:bg-gray-50 min-w-0 max-w-full"
    on:click={toggleDropdown}
  >
    {#if current}
      <span class="text-sm">{current.icon ?? '📁'}</span>
      <span class="font-medium text-sm truncate">{current.name}</span>
    {:else}
      <span class="text-sm text-gray-500">Select project...</span>
    {/if}
    <ChevronDown size="16" class="text-gray-400 flex-shrink-0" />
  </button>

  <!-- Dropdown -->
  {#if showDropdown}
    <div class="absolute top-full left-0 mt-1 w-80 bg-white border rounded-lg shadow-lg z-50">
      <!-- Header with search and new button -->
      <div class="p-3 border-b">
        <div class="flex items-center gap-2 mb-2">
          <h4 class="font-semibold text-sm">Projects</h4>
          <button
            class="flex items-center gap-1 text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 ml-auto"
            on:click={createNewProject}
          >
            <Plus size="12" />
            New
          </button>
        </div>
        
        <div class="relative">
          <Search size="14" class="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            class="w-full pl-8 pr-8 py-1.5 border rounded text-sm"
            placeholder="Search projects..."
            bind:value={search}
          />
          {#if search}
            <button
              class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              on:click={() => search = ''}
            >
              <X size="14" />
            </button>
          {/if}
        </div>
      </div>

      <!-- Project list -->
      <div class="max-h-64 overflow-y-auto">
        {#each filtered as project}
          <div class="flex items-center hover:bg-gray-50 {current?.id === project.id ? 'bg-blue-50' : ''}">
            <button
              class="flex items-center gap-2 flex-1 p-3 text-left"
              on:click={() => selectProject(project)}
            >
              <span class="text-sm">{project.icon ?? '📁'}</span>
              <span class="font-medium text-sm truncate">{project.name}</span>
              {#if current?.id === project.id}
                <span class="text-xs text-blue-600 ml-auto">Current</span>
              {/if}
            </button>
            <div class="flex items-center gap-1 px-2">
              <button
                class="p-1 text-gray-400 hover:text-gray-600"
                title="Settings"
                on:click={(e) => openProjectSettings(project, e)}
              >
                <Settings size="14" />
              </button>
              <button
                class="p-1 text-gray-400 hover:text-red-600"
                title="Delete"
                on:click={(e) => deleteProject(project, e)}
              >
                <Trash size="14" />
              </button>
            </div>
          </div>
        {/each}
        {#if !filtered.length}
          <div class="p-3 text-sm text-gray-500 text-center">
            {search ? 'No projects found' : 'No projects yet'}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
