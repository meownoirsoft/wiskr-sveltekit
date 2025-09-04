<script>
  import { createEventDispatcher } from 'svelte';
  import { Plus, Pin, PinOff, Pencil, Trash, MoreHorizontal } from 'lucide-svelte';
  import EditFactModal from './modals/EditFactModal.svelte';
  import AddFactModal from './modals/AddFactModal.svelte';
import InfoPopup from './InfoPopup.svelte';
import LoadingSpinner from './LoadingSpinner.svelte';

  export let facts = [];
  export let loadingFacts = false;
  export let showAddFactForm = false;
  export let factType = 'person';
  export let factKey = '';
  export let factValue = '';
  export let factTags = '';
  export let projectId = null;
  export let user = null; // User object with tier info
  export let searchTerm = ''; // Search term for highlighting
  export let factsGridSize = 3; // Number of cards per row
  
  let projectFactTypes = [];
  let loadingFactTypes = false;
  let openMenuIndex = -1; // Track which fact menu is open
  let showEditModal = false;
  let editingFact = null;
  let showAddModal = false;

  const dispatch = createEventDispatcher();
  

  // Load project fact types when projectId changes
  $: if (projectId) {
    loadProjectFactTypes();
  }
  
  // Force re-render when projectFactTypes change to update display names
  $: if (projectFactTypes && facts) {
    // This reactive statement ensures the UI updates when fact types are refreshed
    facts = facts; // Trigger reactivity
  }

  // Export function to refresh fact types from parent component
  export function refreshFactTypes() {
    loadProjectFactTypes();
  }
  
  // React to showAddFactForm prop changes from parent
  $: if (showAddFactForm && !showAddModal) {
    showAddModal = true;
    // Reset the parent prop to prevent infinite loop
    showAddFactForm = false;
  }

  async function loadProjectFactTypes() {
    if (!projectId) return;
    
    loadingFactTypes = true;
    try {
      const response = await fetch(`/api/projects/${projectId}/fact-types`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (response.ok) {
        projectFactTypes = data.factTypes || [];
        // Set default factType to first available type
        if (projectFactTypes.length > 0 && !projectFactTypes.find(ft => ft.type_key === factType)) {
          factType = projectFactTypes[0].type_key;
        }
      } else {
        console.error('Failed to load fact types:', data.error);
        // Fallback to hardcoded types
        projectFactTypes = getDefaultFactTypes();
      }
    } catch (error) {
      console.error('Error loading fact types:', error);
      // Fallback to hardcoded types
      projectFactTypes = getDefaultFactTypes();
    } finally {
      loadingFactTypes = false;
    }
  }

  function getDefaultFactTypes() {
    return [
      { type_key: 'person', display_name: 'person', color_class: 'bg-blue-100 text-blue-700', sort_order: 1 },
      { type_key: 'place', display_name: 'place', color_class: 'bg-green-100 text-green-700', sort_order: 2 },
      { type_key: 'process', display_name: 'process', color_class: 'bg-purple-100 text-purple-700', sort_order: 3 },
      { type_key: 'term', display_name: 'term', color_class: 'bg-orange-100 text-orange-700', sort_order: 4 },
      { type_key: 'thing', display_name: 'thing', color_class: 'bg-red-100 text-red-700', sort_order: 5 }
    ];
  }

  function openAddModal() {
    // Reset factType to empty string to force selection
    factType = '';
    showAddModal = true;
  }

  function handleAddModalSave(event) {
    dispatch('add', event.detail);
  }

  function handleAddModalClose() {
    showAddModal = false;
    // Clear form values
    factType = '';
    factKey = '';
    factValue = '';
    factTags = '';
    dispatch('cancel-add');
  }
  
  // Highlight search terms in text
  function highlightText(text, term) {
    if (!term || !text) return text;
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
  }
  
  function handleTagClick(tag) {
    dispatch('tag-click', tag);
  }
  
  function handleTypeClick(type) {
    // Get the display name for the type to use as filter
    const displayName = getTypeDisplayName(type);
    dispatch('type-click', displayName);
  }

  function startEditFact(fact, index) {
    editingFact = fact;
    showEditModal = true;
    closeMenu();
  }

  function handleModalSave(event) {
    dispatch('save-edit', event.detail);
  }

  function handleModalClose() {
    showEditModal = false;
    editingFact = null;
  }

  function deleteFact(fact, index) {
    dispatch('delete', { fact, index });
  }

  function toggleFactPin(fact) {
    dispatch('toggle-pin', fact);
  }

  function getTypeTagClass(type) {
    // First check if we have project-specific fact types loaded
    const projectType = projectFactTypes.find(ft => ft.type_key === type);
    if (projectType && projectType.color_class) {
      return projectType.color_class;
    }
    
    // Fallback to hardcoded colors for legacy support
    const tagStyles = {
      person: 'bg-blue-100 text-blue-700',
      place: 'bg-green-100 text-green-700',
      process: 'bg-purple-100 text-purple-700',
      term: 'bg-orange-100 text-orange-700',
      thing: 'bg-red-100 text-red-700',
      // Legacy support for existing data
      character: 'bg-blue-100 text-blue-700',
      location: 'bg-green-100 text-green-700',
      mechanic: 'bg-purple-100 text-purple-700',
      glossary: 'bg-orange-100 text-orange-700',
      entity: 'bg-red-100 text-red-700'
    };
    return tagStyles[type] || 'bg-gray-100 text-gray-700';
  }
  
  function getTypeDisplayName(type) {
    const projectType = projectFactTypes.find(ft => ft.type_key === type);
    return projectType ? projectType.display_name : type;
  }
  
  function getTypeBorderClass(type) {
    // First check if we have project-specific fact types loaded
    const projectType = projectFactTypes.find(ft => ft.type_key === type);
    if (projectType && projectType.color_class) {
      // Convert background color classes to border color classes with dark mode support
      const colorMap = {
        'bg-blue-100 text-blue-700': 'border-blue-200 dark:border-blue-400',
        'bg-green-100 text-green-700': 'border-green-200 dark:border-green-400',
        'bg-purple-100 text-purple-700': 'border-purple-200 dark:border-purple-400',
        'bg-orange-100 text-orange-700': 'border-orange-200 dark:border-orange-400',
        'bg-red-100 text-red-700': 'border-red-200 dark:border-red-400',
        'bg-yellow-100 text-yellow-700': 'border-yellow-200 dark:border-yellow-400',
        'bg-pink-100 text-pink-700': 'border-pink-200 dark:border-pink-400',
        'bg-indigo-100 text-indigo-700': 'border-indigo-200 dark:border-indigo-400',
        'bg-gray-100 text-gray-700': 'border-gray-200 dark:border-gray-400'
      };
      return colorMap[projectType.color_class] || 'border-gray-200 dark:border-gray-400';
    }
    
    // Fallback to hardcoded border colors for legacy support with dark mode
    const borderStyles = {
      person: 'border-blue-200 dark:border-blue-400',
      place: 'border-green-200 dark:border-green-400',
      process: 'border-purple-200 dark:border-purple-400',
      term: 'border-orange-200 dark:border-orange-400',
      thing: 'border-red-200 dark:border-red-400',
      // Legacy support for existing data
      character: 'border-blue-200 dark:border-blue-400',
      location: 'border-green-200 dark:border-green-400',
      mechanic: 'border-purple-200 dark:border-purple-400',
      glossary: 'border-orange-200 dark:border-orange-400',
      entity: 'border-red-200 dark:border-red-400'
    };
    return borderStyles[type] || 'border-gray-200 dark:border-gray-400';
  }

  function toggleMenu(index) {
    openMenuIndex = openMenuIndex === index ? -1 : index;
  }

  function closeMenu() {
    openMenuIndex = -1;
  }
</script>

<div class="flex flex-col h-full">
  <!-- Fixed Header -->
  <div class="flex-shrink-0">
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2">
        <h3 class="font-semibold text-gray-900 dark:text-gray-100">Facts</h3>
        <InfoPopup 
          title="Facts" 
          content={`Name and description tidbits that mportant info about your project. They can be people, places, processes, terms, or things. 
          Facts are used to provide context for wiskr interactions and help the wiskr understand your world.<br /><br /> <strong>Fact Types</strong> can be updated in the project settings. Click the button in the header next to the project selector.`}
          buttonTitle="Learn about Facts"
        />
      </div>
      <button 
        class="flex items-center gap-1 text-sm px-2 py-1 rounded cursor-pointer" 
        style="background-color: var(--color-accent); color: var(--color-accent-text);"
        on:click={openAddModal}
        on:mouseenter={(e) => e.target.style.backgroundColor='var(--color-accent-hover)'}
        on:mouseleave={(e) => e.target.style.backgroundColor='var(--color-accent)'}
        title="Add new fact"
      >
        <Plus size="16" />
        Fact
      </button>
    </div>

    {#if loadingFacts}
      <LoadingSpinner size="sm" text="Loading facts..." center={false} />
    {/if}
  </div>

  <!-- Scrollable Facts List -->
  <div class="flex-1 overflow-y-auto pr-1 relative">
    {#if loadingFacts}
      <LoadingSpinner overlay={true} text="Loading facts..." />
    {/if}
    <div class="facts-grid gap-2" style="grid-template-columns: repeat({factsGridSize}, minmax(0, 1fr));">
  {#each facts.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) as f, i (f.id)}
    <div 
      class="fact-card flex flex-col text-sm border rounded p-2 {getTypeBorderClass(f.type)}" 
      style="background-color: var(--bg-card);"
      data-fact-id={f.id}
    >
      <!-- Header: Title and Menu -->
      <div class="flex-shrink-0">
        <!-- Top row: Pin icon + Title + Menu (title wraps intelligently) -->
        <div class="flex items-start gap-2">
          {#if f.pinned}
            <Pin size="16" class="text-gray-900 dark:text-gray-100 flex-shrink-0 mt-0.5" />
          {/if}
          <div class="font-semibold leading-none break-words min-w-0 flex-1 pr-1 text-gray-900 dark:text-gray-100">{@html highlightText(f.key, searchTerm)}</div>
          <!-- Triple-dot menu - fixed to top right -->
          <div class="relative flex-shrink-0">
            <button 
              class="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer p-1" 
              on:click={() => toggleMenu(i)}
              title="More actions"
            >
              <MoreHorizontal size="18" />
            </button>
          
            {#if openMenuIndex === i}
              <!-- Overlay to close menu when clicking outside -->
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div class="dropdown-overlay" on:click={closeMenu}></div>
              <!-- Dropdown menu -->
              <div class="dropdown-menu absolute right-0 top-full mt-1 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-md shadow-lg z-10 min-w-[120px]">
                <button 
                  class="w-full px-3 py-2 text-sm text-left text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-500 flex items-center gap-2" 
                  on:click={() => { toggleFactPin(f); closeMenu(); }}
                >
                  {#if f.pinned}
                    <PinOff size="16" />
                    Unpin
                  {:else}
                    <Pin size="16" />
                    Pin
                  {/if}
                </button>
                <button 
                  class="w-full px-3 py-2 text-sm text-left text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-500 flex items-center gap-2" 
                  on:click={() => { startEditFact(f, i); closeMenu(); }}
                >
                  <Pencil size="16" />
                  Edit
                </button>
                <button 
                  class="w-full px-3 py-2 text-sm text-left hover:bg-red-50 dark:hover:bg-red-900 text-red-600 dark:text-red-400 flex items-center gap-2" 
                  on:click={() => { deleteFact(f, i); closeMenu(); }}
                >
                  <Trash size="16" />
                  Delete
                </button>
              </div>
            {/if}
          </div>
        </div>
      </div>
      
      <!-- Content -->
      <div class="fact-content text-sm text-gray-700 dark:text-gray-300 mb-2 content-scrollbar" style="max-height: 140px;">
        {@html highlightText(f.value, searchTerm)}
      </div>
      
      <!-- Tags row: Type tag and regular tags combined -->
      <div class="flex-shrink-0 flex flex-wrap gap-1">
        <button 
          class="text-xs px-1 py-1 rounded font-medium {getTypeTagClass(f.type)} hover:opacity-80 transition-opacity cursor-pointer"
          on:click={() => handleTypeClick(f.type)}
          title="Filter by type: {getTypeDisplayName(f.type)}"
        >
          {getTypeDisplayName(f.type)}
        </button>
        {#if f.tags && f.tags.length > 0}
          {#each f.tags as tag}
            <button
              class="text-xs px-1 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors cursor-pointer"
              on:click={() => handleTagClick(tag)}
              title="Filter by tag: {tag}"
            >
              {tag}
            </button>
          {/each}
        {/if}
      </div>
    </div>
  {/each}
  {#if !facts.length && !loadingFacts}
    <div class="facts-no-content text-sm text-zinc-500 dark:text-zinc-400 text-center py-8">No facts.</div>
  {/if}
    </div>
  </div>
</div>

<!-- Edit Fact Modal -->
<EditFactModal 
  bind:showModal={showEditModal}
  fact={editingFact}
  {projectFactTypes}
  {projectId}
  {user}
  on:save={handleModalSave}
  on:close={handleModalClose}
/>

<!-- Add Fact Modal -->
<AddFactModal 
  bind:showModal={showAddModal}
  {projectFactTypes}
  {projectId}
  {user}
  bind:factType
  bind:factKey
  bind:factValue
  bind:factTags
  on:add={handleAddModalSave}
  on:close={handleAddModalClose}
/>

<style>
  /* Facts grid layout */
  .facts-grid {
    display: grid;
  }
  
  /* Fact card styling */
  .facts-grid .fact-card {
    height: auto;
  }
  
  .facts-grid .fact-content {
    flex: none;
    min-height: auto;
    overflow: visible;
  }
  
  /* No content message spans all columns */
  .facts-no-content {
    grid-column: 1 / -1;
  }
</style>
