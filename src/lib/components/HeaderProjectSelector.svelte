<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { Plus, Search, ChevronDown, Trash, Settings, X } from 'lucide-svelte';

  export let projects = [];
  export let current = null;
  export let search = '';
  export let isMobile = false;

  const dispatch = createEventDispatcher();

  let showDropdown = false;
  let dropdownEl;
  let buttonEl;
  let portalContainer;
  let dropdownPosition = { top: 0, left: 0 };

  // Filtered projects based on search
  $: filtered = projects.filter(p =>
    !search.trim() ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    (p.brief_text ?? '').toLowerCase().includes(search.toLowerCase())
  );

  // Portal action to render dropdown at document body
  function createPortal(node) {
    // Create portal container if it doesn't exist
    if (!portalContainer) {
      portalContainer = document.createElement('div');
      portalContainer.id = 'project-selector-portal';
      portalContainer.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 999999;';
      document.body.appendChild(portalContainer);
    }

    // Move the node to the portal container
    portalContainer.appendChild(node);
    
    // Enable pointer events on the dropdown itself
    node.style.pointerEvents = 'auto';
    
    return {
      destroy() {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      }
    };
  }

  function toggleDropdown() {
    showDropdown = !showDropdown;
    if (showDropdown) {
      // Calculate dropdown position with smart positioning
      updatePosition();
      // Focus search box when dropdown opens
      setTimeout(() => {
        const searchInput = portalContainer?.querySelector('input[type="text"]');
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
    if (portalContainer && !portalContainer.contains(event.target) && 
        buttonEl && !buttonEl.contains(event.target)) {
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

  // Handle escape key
  function handleKeydown(event) {
    if (event.key === 'Escape' && showDropdown) {
      closeDropdown();
    }
  }

  // Update position on scroll/resize
  function updatePosition() {
    if (showDropdown && buttonEl) {
      const buttonRect = buttonEl.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Calculate initial position
      let left = buttonRect.left;
      let top = buttonRect.bottom + 4;
      
      // Ensure dropdown doesn't go off the right edge
      if (left + 320 > viewportWidth) { // 320px = w-80
        left = Math.max(0, viewportWidth - 320 - 16); // 16px margin
      }
      
      // Ensure dropdown doesn't go off the left edge
      if (left < 0) {
        left = 16;
      }
      
      // If dropdown would go below viewport, show it above the button
      if (top + 400 > viewportHeight) { // 400px estimated max height
        top = buttonRect.top - 4 - 400;
      }
      
      dropdownPosition = { top, left };
    }
  }

  $: if (typeof window !== 'undefined') {
    if (showDropdown) {
      document.addEventListener('click', handleOutsideClick);
      document.addEventListener('keydown', handleKeydown);
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    } else {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    }
  }

  // Cleanup on component destroy
  onMount(() => {
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
      
      // Clean up portal container
      if (portalContainer && portalContainer.parentNode) {
        portalContainer.parentNode.removeChild(portalContainer);
        portalContainer = null;
      }
    };
  });
</script>

<div class="relative" bind:this={dropdownEl} data-tutorial="project-selector">
  {#if isMobile}
    <!-- Mobile: Direct search and project list -->
    <div class="space-y-3">
      <!-- Search box -->
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
                style="color: {current?.id === project.id ? 'white' : 'var(--text-header-secondary)'};"
                title="Project Settings"
                on:click={(e) => openSettings(project, e)}
              >
                <Settings size="16" />
              </button>
              <button
                class="p-1 transition-colors {current?.id === project.id ? 'hover:text-red-200' : 'hover:text-red-400'}"
                style="color: {current?.id === project.id ? 'white' : 'var(--text-header-secondary)'};"
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
    <!-- Desktop: Button that triggers dropdown -->
    <button 
      bind:this={buttonEl}
      class="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 border-2 rounded-lg min-w-0 max-w-full transition-colors text-sm hover:border-opacity-80 hover:bg-opacity-90 bg-white dark:bg-gray-800"
      style="border-color: var(--border-header-input); color: var(--text-header);"
      on:click={toggleDropdown}
    >
      {#if current}
        <span class="text-xs md:text-sm">{current.icon ?? '📁'}</span>
        <span class="font-medium text-xs md:text-sm truncate" style="color: var(--text-header);">{current.name}</span>
      {:else}
        <span class="text-xs md:text-sm" style="color: var(--text-header-secondary);">Select project...</span>
      {/if}
      <ChevronDown size="16" style="color: var(--text-header-secondary);" class="flex-shrink-0" />
    </button>
  {/if}
</div>

<!-- True portal dropdown using Svelte action -->
{#if showDropdown && !isMobile && typeof document !== 'undefined'}
  <div 
    use:createPortal
    class="fixed w-80 border rounded-lg shadow-lg max-h-[70vh] overflow-hidden project-selector-dropdown bg-white dark:bg-gray-800"
    style="border-color: var(--border-header-input); top: {dropdownPosition.top}px; left: {dropdownPosition.left}px;"
  >
    <!-- Header with search -->
    <div class="p-3 border-b" style="border-color: var(--border-header-input);">
      <h4 class="font-semibold text-sm mb-2" style="color: var(--text-header);">Projects</h4>
      
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
              style="color: {current?.id === project.id ? 'white' : 'var(--text-header-secondary)'};"
              title="Project Settings"
              on:click={(e) => openSettings(project, e)}
            >
              <Settings size="16" />
            </button>
            <button
              class="p-1 transition-colors {current?.id === project.id ? 'hover:text-red-200' : 'hover:text-red-400'}"
              style="color: {current?.id === project.id ? 'white' : 'var(--text-header-secondary)'};"
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

    <!-- New Project Button -->
    <div class="p-3 border-t" style="border-color: var(--border-header-input);">
      <button
        class="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg transition-all hover:scale-105 active:scale-95 font-medium shadow-sm"
        style="background-color: var(--color-accent); color: var(--color-accent-text);"
        on:mouseenter={(e) => e.target.style.backgroundColor = 'var(--color-accent-hover)'}
        on:mouseleave={(e) => e.target.style.backgroundColor = 'var(--color-accent)'}
        on:click={createNewProject}
        title="Create New Project"
      >
        <Plus size="16" />
        <span>New Project</span>
      </button>
    </div>
  </div>
{/if}

<style>
  /* Portal-based dropdown styling */
  :global(.project-selector-dropdown) {
    animation: dropdownFadeIn 0.15s ease-out;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    backdrop-filter: blur(8px);
    z-index: 999999 !important;
  }

  @keyframes dropdownFadeIn {
    from {
      opacity: 0;
      transform: translateY(-8px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* Ensure the portal container has the highest z-index */
  :global(#project-selector-portal) {
    z-index: 999999 !important;
  }
</style>
