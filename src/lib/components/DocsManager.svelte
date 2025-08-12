<script>
  import { createEventDispatcher } from 'svelte';
  import { Plus, Pin, PinOff, Pencil, Trash, MoreHorizontal } from 'lucide-svelte';

  export let docs = [];
  export let showAddDocForm = false;
  export let docTitle = '';
  export let docContent = '';
  export let docTags = '';
  let openMenuIndex = -1; // Track which doc menu is open

  const dispatch = createEventDispatcher();

  function toggleAddForm() {
    showAddDocForm = !showAddDocForm;
  }

  function addDoc() {
    // Parse comma-separated tags
    const tags = docTags ? docTags.split(',').map(t => t.trim()).filter(Boolean) : [];
    dispatch('add', { title: docTitle, content: docContent, tags });
  }

  function cancelAdd() {
    showAddDocForm = false;
    docTags = '';
    dispatch('cancel-add');
  }
  
  function handleTagClick(tag) {
    dispatch('tag-click', tag);
  }

  function startEditDoc(doc, index) {
    dispatch('start-edit', { doc, index });
  }

  function cancelEditDoc(doc, index) {
    dispatch('cancel-edit', { doc, index });
  }

  function saveDocEdit(doc, editData) {
    dispatch('save-edit', { doc, editData });
  }

  function deleteDoc(doc, index) {
    dispatch('delete', { doc, index });
  }

  function toggleDocPin(doc) {
    dispatch('toggle-pin', doc);
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
      <h3 class="font-semibold">Docs</h3>
      <button 
        class="flex items-center gap-1 text-sm bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600 cursor-pointer" 
        on:click={toggleAddForm}
        title={showAddDocForm ? "Hide form" : "Add new doc"}
      >
        <Plus size="16" />
        {showAddDocForm ? "Hide" : "Add Doc"}
      </button>
    </div>
    
    {#if showAddDocForm}
      <div class="border rounded p-3 bg-white mb-3">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-700">New Doc</span>
          <span class="text-xs text-zinc-500">Longer notes, lore, specs</span>
        </div>
        <div class="grid gap-2">
          <input class="border rounded p-2" placeholder="Title" bind:value={docTitle} />
          <textarea class="border rounded p-2" rows="6" placeholder="Content" bind:value={docContent}></textarea>
          <input 
            class="border rounded p-2" 
            placeholder="Tags (comma-separated)" 
            bind:value={docTags}
            type="text"
            autocomplete="off"
            spellcheck="false"
          />
        </div>
        <div class="mt-2 flex gap-2">
          <button class="bg-green-500 text-white rounded px-3 py-1 hover:bg-green-600 cursor-pointer" on:click={addDoc}>Save Doc</button>
          <button class="border rounded px-3 py-1 hover:bg-gray-50 cursor-pointer" on:click={cancelAdd}>Cancel</button>
        </div>
      </div>
    {/if}
  </div>

  <!-- Scrollable Docs List -->
  <div class="flex-1 overflow-y-auto pr-1">
    <ul class="space-y-2">
  {#each docs.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) as d, i}
    <li class="text-sm border rounded p-2 bg-white">
      <!-- Row 1: Title, Type Tag, and Icons -->
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2 flex-1 min-w-0">
          {#if d.pinned}
            <Pin size="14" class="text-purple-600 flex-shrink-0" />
          {/if}
          <div class="font-semibold flex-shrink-0">{d.title}</div>
          <div class="flex-1 flex justify-end">
            <span class="text-xs px-2 py-1 rounded-full font-medium bg-purple-100 text-purple-700">doc</span>
          </div>
        </div>
        <!-- Triple-dot menu -->
        <div class="relative flex-shrink-0 ml-2">
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
                on:click={() => { toggleDocPin(d); closeMenu(); }}
              >
                {#if d.pinned}
                  <PinOff size="14" />
                  Unpin
                {:else}
                  <Pin size="14" />
                  Pin
                {/if}
              </button>
              <button 
                class="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2" 
                on:click={() => { startEditDoc(d, i); closeMenu(); }}
              >
                <Pencil size="14" />
                Edit
              </button>
              <button 
                class="w-full px-3 py-2 text-xs text-left hover:bg-red-50 text-red-600 flex items-center gap-2" 
                on:click={() => { deleteDoc(d, i); closeMenu(); }}
              >
                <Trash size="14" />
                Delete
              </button>
            </div>
          {/if}
        </div>
      </div>
      
      <!-- Row 2: Content Preview -->
      <div class="text-xs text-gray-700 whitespace-pre-wrap mb-2">
        {d.content.slice(0, 400)}{d.content.length > 400 ? '…' : ''}
      </div>
      
      <!-- Row 3: Tags (if any) -->
      {#if d.tags && d.tags.length > 0}
        <div class="flex flex-wrap gap-1 mb-1">
          {#each d.tags as tag}
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
      

      {#if d._editing}
        <div class="mt-2 grid gap-2">
          <input class="border rounded p-2" placeholder="Title" bind:value={d._editTitle} />
          <textarea class="border rounded p-2" rows="6" placeholder="Content" bind:value={d._editContent}></textarea>
          <input 
            class="border rounded p-2" 
            placeholder="Tags (comma-separated)" 
            bind:value={d._editTags}
            type="text"
            autocomplete="off"
            spellcheck="false"
          />
          <div class="flex gap-2">
            <button class="border rounded px-2 hover:bg-gray-50 cursor-pointer" on:click={() => saveDocEdit(d, { title: d._editTitle, content: d._editContent, tags: d._editTags ? d._editTags.split(',').map(t => t.trim()).filter(Boolean) : [] })}>Save</button>
            <button class="border rounded px-2 hover:bg-gray-50 cursor-pointer" on:click={() => cancelEditDoc(d, i)}>Cancel</button>
          </div>
        </div>
      {/if}
    </li>
  {/each}
  {#if !docs.length}
    <li class="text-sm text-zinc-500">No docs.</li>
  {/if}
    </ul>
  </div>
</div>
