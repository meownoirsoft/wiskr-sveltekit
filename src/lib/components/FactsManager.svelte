<script>
  import { createEventDispatcher } from 'svelte';
  import { Plus, Pin, PinOff, Pencil, Trash, MoreHorizontal } from 'lucide-svelte';
  import EditFactModal from './EditFactModal.svelte';
  import AddFactModal from './AddFactModal.svelte';

  export let facts = [];
  export let loadingFacts = false;
  export let showAddFactForm = false;
  export let factType = 'person';
  export let factKey = '';
  export let factValue = '';
  export let factTags = '';
  export let projectId = null;
  
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

  async function loadProjectFactTypes() {
    if (!projectId) return;
    
    loadingFactTypes = true;
    try {
      const response = await fetch(`/api/projects/${projectId}/fact-types`);
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
    showAddModal = true;
  }

  function handleAddModalSave(event) {
    dispatch('add', event.detail);
  }

  function handleAddModalClose() {
    showAddModal = false;
    // Clear form values
    factKey = '';
    factValue = '';
    factTags = '';
    dispatch('cancel-add');
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
      // Convert background color classes to border color classes
      const colorMap = {
        'bg-blue-100 text-blue-700': 'border-blue-200',
        'bg-green-100 text-green-700': 'border-green-200',
        'bg-purple-100 text-purple-700': 'border-purple-200',
        'bg-orange-100 text-orange-700': 'border-orange-200',
        'bg-red-100 text-red-700': 'border-red-200',
        'bg-yellow-100 text-yellow-700': 'border-yellow-200',
        'bg-pink-100 text-pink-700': 'border-pink-200',
        'bg-indigo-100 text-indigo-700': 'border-indigo-200',
        'bg-gray-100 text-gray-700': 'border-gray-200'
      };
      return colorMap[projectType.color_class] || 'border-gray-200';
    }
    
    // Fallback to hardcoded border colors for legacy support
    const borderStyles = {
      person: 'border-blue-200',
      place: 'border-green-200',
      process: 'border-purple-200',
      term: 'border-orange-200',
      thing: 'border-red-200',
      // Legacy support for existing data
      character: 'border-blue-200',
      location: 'border-green-200',
      mechanic: 'border-purple-200',
      glossary: 'border-orange-200',
      entity: 'border-red-200'
    };
    return borderStyles[type] || 'border-gray-200';
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
      <h3 class="font-semibold">Facts</h3>
      <button 
        class="flex items-center gap-1 text-sm bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 cursor-pointer" 
        on:click={openAddModal}
        title="Add new fact"
      >
        <Plus size="16" />
        Add Fact
      </button>
    </div>

    {#if loadingFacts}
      <div class="text-sm text-zinc-500">Loading…</div>
    {/if}
  </div>

  <!-- Scrollable Facts List -->
  <div class="flex-1 overflow-y-auto pr-1">
    <div class="grid grid-cols-3 gap-2">
  {#each facts.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) as f, i (f.id)}
    <div class="text-xs border rounded p-2 bg-white {getTypeBorderClass(f.type)}">
      <!-- Header: Title, Type Tag, and Menu -->
      <div class="mb-2">
        <!-- Top row: Pin icon + Title (can wrap) -->
        <div class="flex items-start gap-2 mb-1">
          {#if f.pinned}
            <Pin size="14" class="text-blue-600 flex-shrink-0 mt-0.5" />
          {/if}
          <div class="font-semibold leading-tight break-words min-w-0 flex-1">{f.key}</div>
        </div>
        <!-- Bottom row: Type tag and menu -->
        <div class="flex items-center justify-between">
          <button 
            class="text-xs px-2 py-1 rounded-full font-medium {getTypeTagClass(f.type)} hover:opacity-80 transition-opacity cursor-pointer"
            on:click={() => handleTypeClick(f.type)}
            title="Filter by type: {getTypeDisplayName(f.type)}"
          >
            {getTypeDisplayName(f.type)}
          </button>
          <!-- Triple-dot menu -->
          <div class="relative flex-shrink-0">
            <button 
              class="text-xs text-zinc-500 hover:text-zinc-700 cursor-pointer p-1" 
              on:click={() => toggleMenu(i)}
              title="More actions"
            >
              <MoreHorizontal size="18" />
            </button>
          
          {#if openMenuIndex === i}
            <!-- Overlay to close menu when clicking outside -->
            <div class="dropdown-overlay" on:click={closeMenu}></div>
            <!-- Dropdown menu -->
            <div class="dropdown-menu absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[120px]">
              <button 
                class="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2" 
                on:click={() => { toggleFactPin(f); closeMenu(); }}
              >
                {#if f.pinned}
                  <PinOff size="14" />
                  Unpin
                {:else}
                  <Pin size="14" />
                  Pin
                {/if}
              </button>
              <button 
                class="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2" 
                on:click={() => { startEditFact(f, i); closeMenu(); }}
              >
                <Pencil size="14" />
                Edit
              </button>
              <button 
                class="w-full px-3 py-2 text-xs text-left hover:bg-red-50 text-red-600 flex items-center gap-2" 
                on:click={() => { deleteFact(f, i); closeMenu(); }}
              >
                <Trash size="14" />
                Delete
              </button>
            </div>
          {/if}
          </div>
        </div>
      </div>
      
      <!-- Row 2: Content -->
      <div class="text-xs text-gray-700 mb-2">
        {f.value}
      </div>
      
      <!-- Row 3: Tags (if any) -->
      {#if f.tags && f.tags.length > 0}
        <div class="flex flex-wrap gap-1 mb-1">
          {#each f.tags as tag}
            <button
              class="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
              on:click={() => handleTagClick(tag)}
              title="Filter by tag: {tag}"
            >
              {tag}
            </button>
          {/each}
        </div>
      {/if}
      

    </div>
  {/each}
  {#if !facts.length && !loadingFacts}
    <div class="col-span-3 text-sm text-zinc-500 text-center py-8">No facts.</div>
  {/if}
    </div>
  </div>
</div>

<!-- Edit Fact Modal -->
<EditFactModal 
  bind:showModal={showEditModal}
  fact={editingFact}
  {projectFactTypes}
  on:save={handleModalSave}
  on:close={handleModalClose}
/>

<!-- Add Fact Modal -->
<AddFactModal 
  bind:showModal={showAddModal}
  {projectFactTypes}
  bind:factType
  bind:factKey
  bind:factValue
  bind:factTags
  on:add={handleAddModalSave}
  on:close={handleAddModalClose}
/>
