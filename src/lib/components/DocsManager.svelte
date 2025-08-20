<script>
  import { createEventDispatcher } from 'svelte';
  import { Plus, Pin, PinOff, Pencil, Trash, MoreHorizontal } from 'lucide-svelte';
  import EditDocModal from './EditDocModal.svelte';
  import AddDocModal from './AddDocModal.svelte';
import InfoPopup from './InfoPopup.svelte';
import LoadingSpinner from './LoadingSpinner.svelte';

  export let docs = [];
  export let loadingDocs = false;
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
      <div class="flex items-center gap-2">
        <h3 class="font-semibold text-gray-900 dark:text-gray-100">Docs</h3>
        <InfoPopup 
          title="Documentation" 
          content={`Docs are longer text documents that provide detailed information about your project. 
          They can include background information, specifications, guidelines, or any other contextual information that will help the wiskr understand your project better.
          <br /><br />
          If you find the wiskr has a hard time grasping a concept, you should add docs or add detail to them to improve understanding.`}
          buttonTitle="Learn about Documentation"
        />
      </div>
      <button 
        class="flex items-center gap-1 text-sm text-white px-2 py-1 rounded cursor-pointer" 
        style="background-color: var(--color-accent);"
        on:click={openAddModal}
        title="Add new doc"
      >
        <Plus size="16" />
        Doc
      </button>
    </div>

    {#if loadingDocs}
      <LoadingSpinner size="sm" text="Loading docs..." center={false} />
    {/if}
  </div>

  <!-- Scrollable Docs List -->
  <div class="flex-1 overflow-y-auto pr-1 relative">
    {#if loadingDocs}
      <LoadingSpinner overlay={true} backgroundColor="rgba(255, 255, 255, 0.7)" text="Loading docs..." />
    {/if}
    <div class="grid grid-cols-3 gap-2">
  {#each docs.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) as d, i}
    <div class="doc-card flex flex-col h-full text-sm border border-purple-200 dark:border-purple-400 rounded p-2" style="background-color: var(--bg-card);">
      <!-- Header: Title and Menu -->
      <div class="flex-shrink-0">
        <!-- Top row: Pin icon + Title + Menu (title wraps intelligently) -->
        <div class="flex items-start gap-2">
          {#if d.pinned}
            <Pin size="20" class="text-purple-600 flex-shrink-0 mt-0.5" />
          {/if}
          <div class="font-semibold leading-none break-words min-w-0 flex-1 pr-1 text-gray-900 dark:text-gray-100">{d.title}</div>
          <!-- Triple-dot menu - fixed to top right -->
          <div class="relative flex-shrink-0">
            <button 
              class="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer p-0" 
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
                  on:click={() => { toggleDocPin(d); closeMenu(); }}
                >
                  {#if d.pinned}
                    <PinOff size="16" />
                    Unpin
                  {:else}
                    <Pin size="16" />
                    Pin
                  {/if}
                </button>
                <button 
                  class="w-full px-3 py-2 text-sm text-left text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-500 flex items-center gap-2" 
                  on:click={() => { startEditDoc(d, i); closeMenu(); }}
                >
                  <Pencil size="16" />
                  Edit
                </button>
                <button 
                  class="w-full px-3 py-2 text-sm text-left hover:bg-red-50 dark:hover:bg-red-900 text-red-600 dark:text-red-400 flex items-center gap-2" 
                  on:click={() => { deleteDoc(d, i); closeMenu(); }}
                >
                  <Trash size="16" />
                  Delete
                </button>
              </div>
            {/if}
          </div>
        </div>
      </div>
      
      <!-- Content Preview -->
      <div class="doc-content text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-2 flex-1 min-h-0 overflow-y-auto content-scrollbar" style="max-height: 140px;">
        {d.content}
      </div>
      
      <!-- Tags row: Type tag and regular tags combined -->
      <div class="flex-shrink-0 flex flex-wrap gap-1">
        <span class="text-xs px-2 py-1 rounded-full font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">doc</span>
        {#if d.tags && d.tags.length > 0}
          {#each d.tags as tag}
            <button
              class="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors cursor-pointer"
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
  {#if !docs.length && !loadingDocs}
    <div class="col-span-3 text-sm text-zinc-500 dark:text-zinc-400 text-center py-8">No docs.</div>
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
