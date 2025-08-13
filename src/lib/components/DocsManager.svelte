<script>
  import { createEventDispatcher } from 'svelte';
  import { Plus, Pin, PinOff, Pencil, Trash, MoreHorizontal } from 'lucide-svelte';
  import EditDocModal from './EditDocModal.svelte';
  import AddDocModal from './AddDocModal.svelte';

  export let docs = [];
  export let showAddDocForm = false;
  export let docTitle = '';
  export let docContent = '';
  export let docTags = '';
  let openMenuIndex = -1; // Track which doc menu is open
  let showEditModal = false;
  let editingDoc = null;
  let showAddModal = false;

  const dispatch = createEventDispatcher();

  function openAddModal() {
    showAddModal = true;
  }

  function handleAddModalSave(event) {
    dispatch('add', event.detail);
    showAddModal = false;
  }

  function handleAddModalClose() {
    showAddModal = false;
  }
  
  function handleTagClick(tag) {
    dispatch('tag-click', tag);
  }

  function startEditDoc(doc, index) {
    editingDoc = doc;
    showEditModal = true;
    closeMenu();
  }

  function handleModalSave(event) {
    dispatch('save-edit', event.detail);
  }

  function handleModalClose() {
    showEditModal = false;
    editingDoc = null;
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
        on:click={openAddModal}
        title="Add new doc"
      >
        <Plus size="16" />
        Add Doc
      </button>
    </div>
  </div>

  <!-- Scrollable Docs List -->
  <div class="flex-1 overflow-y-auto pr-1">
    <div class="grid grid-cols-3 gap-2">
  {#each docs.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) as d, i}
    <div class="text-sm border border-purple-200 rounded p-2 bg-white">
      <!-- Header: Title, Type Tag, and Menu -->
      <div class="mb-2">
        <!-- Top row: Pin icon + Title (can wrap) -->
        <div class="flex items-start gap-2 mb-1">
          {#if d.pinned}
            <Pin size="14" class="text-purple-600 flex-shrink-0 mt-0.5" />
          {/if}
          <div class="font-semibold leading-tight break-words min-w-0 flex-1">{d.title}</div>
        </div>
        <!-- Bottom row: Type tag and menu -->
        <div class="flex items-center justify-between">
          <span class="text-xs px-2 py-1 rounded-full font-medium bg-purple-100 text-purple-700">doc</span>
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
      

    </div>
  {/each}
  {#if !docs.length}
    <div class="col-span-3 text-sm text-zinc-500 text-center py-8">No docs.</div>
  {/if}
    </div>
  </div>
</div>

<!-- Edit Doc Modal -->
<EditDocModal 
  bind:showModal={showEditModal}
  doc={editingDoc}
  on:save={handleModalSave}
  on:close={handleModalClose}
/>

<!-- Add Doc Modal -->
<AddDocModal 
  bind:showModal={showAddModal}
  on:save={handleAddModalSave}
  on:close={handleAddModalClose}
/>
