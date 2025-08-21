<script>
  import { createEventDispatcher } from 'svelte';
  import { Plus, Search, ChevronDown, Trash, Settings, X } from 'lucide-svelte';

  export let projects = [];
  export let current = null;
  export let search = '';
  export let isMobile = false;

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
      // Focus search box when dropdown opens
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

  function deleteProject(project, event) {
    event.stopPropagation();
    dispatch('delete', project);
    closeDropdown();
  }
  
  function openSettings(project, event) {
    event.stopPropagation();
    dispatch('open-settings', project);
    closeDropdown();
  }

  // Close dropdown when clicking outside
  function handleOutsideClick(event) {
    if (dropdownEl && !dropdownEl.contains(event.target)) {
      // Don't close if clicking on the mobile project menu backdrop/container
      // Check if the click target is part of a mobile menu
      const isMobileMenuClick = event.target.closest('.fixed.inset-0.z-50') || 
                               event.target.classList.contains('fixed') &&
                               event.target.classList.contains('inset-0') &&
                               event.target.classList.contains('z-50');
      
      if (!isMobileMenuClick) {
        closeDropdown();
      }
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
  {#if isMobile}
    <!-- Mobile: Direct search and project list -->
    <div class="space-y-3">
      <!-- Search and New button -->
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <Search size="16" class="absolute left-2.5 top-1/2 transform -translate-y-1/2" style="color: var(--text-header-secondary);" />
          <input
            type="text"
            class="w-full pl-8 pr-8 py-1.5 border rounded text-sm"
            style="background-color: var(--bg-header-input); border-color: var(--border-header-input); color: var(--text-header);"
            placeholder="Search projects..."
            bind:value={search}
          />
          {#if search}
            <button
              class="absolute right-2 top-1/2 transform -translate-y-1/2 transition-colors"
              style="color: var(--text-header-secondary);"
              on:click={() => search = ''}
            >
              <X size="16" />
            </button>
          {/if}
        </div>
        <button
          class="flex items-center gap-1 text-xs text-white px-2 py-1 rounded transition-colors flex-shrink-0"
          style="background-color: var(--color-accent);"
          on:mouseenter={(e) => e.target.style.backgroundColor = 'var(--color-accent-hover)'}
          on:mouseleave={(e) => e.target.style.backgroundColor = 'var(--color-accent)'}
          on:click={createNewProject}
        >
          <Plus size="16" />
          New
        </button>
      </div>
      
      <!-- Project list -->
      <div class="border rounded-lg overflow-hidden max-h-48 overflow-y-auto" style="background-color: var(--bg-header-input); border-color: var(--border-header-input);">
        {#each filtered as project}
          <div class="flex items-center hover:opacity-80 {current?.id === project.id ? 'bg-blue-500 dark:bg-blue-800' : ''} transition-colors border-b last:border-b-0" style="border-color: var(--border-header-input);">
            <button
              class="flex items-center gap-2 flex-1 p-3 text-left"
              on:click={() => selectProject(project)}
            >
              <span class="text-sm">{project.icon ?? '📁'}</span>
              <span class="font-medium text-sm truncate" style="color: {current?.id === project.id ? 'white' : 'var(--text-header)'};">{project.name}</span>
            </button>
            <div class="flex items-center gap-1 px-2">
              <button
                class="p-1 transition-colors"
                style="color: var(--text-header-secondary);"
                title="Project Settings"
                on:click={(e) => openSettings(project, e)}
              >
                <Settings size="16" />
              </button>
              <button
                class="p-1 hover:text-red-400 transition-colors"
                style="color: var(--text-header-secondary);"
                title="Delete"
                on:click={(e) => deleteProject(project, e)}
              >
                <Trash size="16" />
              </button>
            </div>
          </div>
        {/each}
        {#if !filtered.length}
          <div class="p-3 text-sm text-center" style="color: var(--text-header-secondary);">
            {search ? 'No projects found' : 'No projects yet'}
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <!-- Desktop: Original dropdown behavior -->
    <!-- Current project button -->
    <button 
      class="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 border rounded-lg min-w-0 max-w-full transition-colors text-sm"
      style="background-color: var(--bg-header-input); border-color: var(--border-header-input); color: var(--text-header);"
      on:click={toggleDropdown}
    >
      {#if current}
        <span class="text-xs md:text-sm">{current.icon ?? '📁'}</span>
        <span class="font-medium text-xs md:text-sm truncate" style="color: var(--text-header);">{current.name}</span>
      {:else}
        <span class="text-xs md:text-sm" style="color: var(--text-header-secondary);">Select project...</span>
      {/if}
      <ChevronDown size={16} style="color: var(--text-header-secondary);" class="flex-shrink-0" />
    </button>

    <!-- Desktop Dropdown -->
    {#if showDropdown}
      <div class="absolute top-full left-0 w-80 mt-1 border rounded-lg shadow-lg z-[100] max-h-[70vh] overflow-hidden" style="background-color: var(--bg-header-input); border-color: var(--border-header-input);">
        <!-- Header with search and new button -->
        <div class="p-3 border-b" style="border-color: var(--border-header-input);">
          <div class="flex items-center gap-2 mb-2">
            <h4 class="font-semibold text-sm" style="color: var(--text-header);">Projects</h4>
            <button
              class="flex items-center gap-1 text-xs text-white px-2 py-1 rounded ml-auto transition-colors"
              style="background-color: var(--color-accent);"
              on:mouseenter={(e) => e.target.style.backgroundColor = 'var(--color-accent-hover)'}
              on:mouseleave={(e) => e.target.style.backgroundColor = 'var(--color-accent)'}
              on:click={createNewProject}
            >
              <Plus size="16" />
              New
            </button>
          </div>
          
          <div class="relative">
            <Search size="16" class="absolute left-2.5 top-1/2 transform -translate-y-1/2" style="color: var(--text-header-secondary);" />
            <input
              type="text"
              class="w-full pl-8 pr-8 py-1.5 border rounded text-sm"
              style="background-color: var(--bg-header-input); border-color: var(--border-header-input); color: var(--text-header);"
              placeholder="Search projects..."
              bind:value={search}
            />
            {#if search}
              <button
                class="absolute right-2 top-1/2 transform -translate-y-1/2 transition-colors"
                style="color: var(--text-header-secondary);"
                on:click={() => search = ''}
              >
                <X size="16" />
              </button>
            {/if}
          </div>
        </div>

        <!-- Project list -->
        <div class="max-h-64 overflow-y-auto">
          {#each filtered as project}
            <div class="flex items-center hover:opacity-80 {current?.id === project.id ? 'bg-blue-500 dark:bg-blue-800' : ''} transition-colors">
              <button
                class="flex items-center gap-2 flex-1 p-3 text-left"
                on:click={() => selectProject(project)}
              >
                <span class="text-sm">{project.icon ?? '📁'}</span>
                <span class="font-medium text-sm truncate" style="color: {current?.id === project.id ? 'white' : 'var(--text-header)'};">{project.name}</span>
              </button>
              <div class="flex items-center gap-1 px-2">
                <button
                  class="p-1 transition-colors"
                  style="color: var(--text-header-secondary);"
                  title="Project Settings"
                  on:click={(e) => openSettings(project, e)}
                >
                  <Settings size="16" />
                </button>
                <button
                  class="p-1 hover:text-red-400 transition-colors"
                  style="color: var(--text-header-secondary);"
                  title="Delete"
                  on:click={(e) => deleteProject(project, e)}
                >
                  <Trash size="16" />
                </button>
              </div>
            </div>
          {/each}
          {#if !filtered.length}
            <div class="p-3 text-sm text-center" style="color: var(--text-header-secondary);">
              {search ? 'No projects found' : 'No projects yet'}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  {/if}
</div>
