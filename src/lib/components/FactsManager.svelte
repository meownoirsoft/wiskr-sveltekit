<script>
  import { createEventDispatcher } from 'svelte';
  import { Plus, Pin, PinOff, Pencil, Trash } from 'lucide-svelte';

  export let facts = [];
  export let loadingFacts = false;
  export let showAddFactForm = false;
  export let factType = 'person';
  export let factKey = '';
  export let factValue = '';
  export let projectId = null;
  
  let projectFactTypes = [];
  let loadingFactTypes = false;

  const dispatch = createEventDispatcher();

  // Load project fact types when projectId changes
  $: if (projectId) {
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

  function toggleAddForm() {
    showAddFactForm = !showAddFactForm;
  }

  function addFact() {
    dispatch('add', { type: factType, key: factKey, value: factValue });
  }

  function cancelAdd() {
    showAddFactForm = false;
    dispatch('cancel-add');
  }

  function startEditFact(fact, index) {
    dispatch('start-edit', { fact, index });
  }

  function cancelEditFact(fact, index) {
    dispatch('cancel-edit', { fact, index });
  }

  function saveFactEdit(fact, editData) {
    dispatch('save-edit', { fact, editData });
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
</script>

<div class="flex flex-col h-full">
  <!-- Fixed Header -->
  <div class="flex-shrink-0">
    <div class="flex items-center justify-between mb-2">
      <h3 class="font-semibold">Facts</h3>
      <button 
        class="flex items-center gap-1 text-sm bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 cursor-pointer" 
        on:click={toggleAddForm}
        title={showAddFactForm ? "Hide form" : "Add new fact"}
      >
        <Plus size="16" />
        {showAddFactForm ? "Hide" : "Add Fact"}
      </button>
    </div>
    
    {#if showAddFactForm}
      <div class="border rounded p-3 bg-white mb-3">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-700">New Fact</span>
          <span class="text-xs text-zinc-500">Short, atomic facts work best</span>
        </div>
        <div class="grid gap-2">
          <select class="border rounded p-2" bind:value={factType} disabled={loadingFactTypes}>
            {#if loadingFactTypes}
              <option>Loading types...</option>
            {:else if projectFactTypes.length > 0}
              {#each projectFactTypes as factTypeOption}
                <option value={factTypeOption.type_key}>{factTypeOption.display_name}</option>
              {/each}
            {:else}
              <option value="person">person</option>
              <option value="place">place</option>
              <option value="process">process</option>
              <option value="term">term</option>
              <option value="thing">thing</option>
            {/if}
          </select>
          <input class="border rounded p-2" placeholder="Key (e.g., Cheddar)" bind:value={factKey} />
          <textarea class="border rounded p-2" rows="3" placeholder="Value (≤120 words)" bind:value={factValue}></textarea>
        </div>
        <div class="mt-2 flex gap-2">
          <button class="bg-green-500 text-white rounded px-3 py-1 hover:bg-green-600 cursor-pointer" on:click={addFact}>Save Fact</button>
          <button class="border rounded px-3 py-1 hover:bg-gray-50 cursor-pointer" on:click={cancelAdd}>Cancel</button>
        </div>
      </div>
    {/if}

    {#if loadingFacts}
      <div class="text-sm text-zinc-500">Loading…</div>
    {/if}
  </div>

  <!-- Scrollable Facts List -->
  <div class="flex-1 overflow-y-auto pr-1">
    <ul class="space-y-1">
  {#each facts.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) as f, i}
    <li class="text-sm border rounded p-2 bg-white">
      <!-- Row 1: Key, Type Tag, and Icons -->
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2 flex-1 min-w-0">
          {#if f.pinned}
            <Pin size="14" class="text-blue-600 flex-shrink-0" />
          {/if}
          <div class="font-semibold flex-shrink-0">{f.key}</div>
          <div class="flex-1 flex justify-end">
            <span class="text-xs px-2 py-1 rounded-full font-medium {getTypeTagClass(f.type)}">{getTypeDisplayName(f.type)}</span>
          </div>
        </div>
        <div class="flex gap-1 flex-shrink-0 ml-2">
          <button class="text-xs text-zinc-500 hover:text-zinc-700 cursor-pointer p-1" on:click={() => toggleFactPin(f)} title={f.pinned ? 'Unpin' : 'Pin'}>
            {#if f.pinned}
              <PinOff size="18" />
            {:else}
              <Pin size="18" />
            {/if}
          </button>
          <button class="text-xs text-zinc-500 hover:text-zinc-700 cursor-pointer p-1" on:click={() => startEditFact(f, i)} title="Edit">
            <Pencil size="18" />
          </button>
          <button class="text-xs text-red-500 hover:text-red-700 cursor-pointer p-1" on:click={() => deleteFact(f, i)} title="Delete">
            <Trash size="18" />
          </button>
        </div>
      </div>
      
      <!-- Row 2: Content -->
      <div class="text-sm text-gray-700 mb-2">
        {f.value}
      </div>
      

      {#if f._editing}
        <div class="mt-2 grid gap-2">
          <input class="border rounded p-2" bind:value={f._editKey} />
          <textarea class="border rounded p-2" rows="3" bind:value={f._editValue}></textarea>
          <div class="flex gap-2">
            <button class="border rounded px-2 hover:bg-gray-50 cursor-pointer" on:click={() => saveFactEdit(f, { type: f.type, key: f._editKey, value: f._editValue, tags: (f.tags || []) })}>Save</button>
            <button class="border rounded px-2 hover:bg-gray-50 cursor-pointer" on:click={() => cancelEditFact(f, i)}>Cancel</button>
          </div>
        </div>
      {/if}
    </li>
  {/each}
  {#if !facts.length && !loadingFacts}
    <li class="text-sm text-zinc-500">No facts.</li>
  {/if}
    </ul>
  </div>
</div>
