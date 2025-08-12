<script>
  import { createEventDispatcher } from 'svelte';
  import { Plus, Pin, PinOff, Pencil, Trash } from 'lucide-svelte';

  export let docs = [];
  export let showAddDocForm = false;
  export let docTitle = '';
  export let docContent = '';

  const dispatch = createEventDispatcher();

  function toggleAddForm() {
    showAddDocForm = !showAddDocForm;
  }

  function addDoc() {
    dispatch('add', { title: docTitle, content: docContent });
  }

  function cancelAdd() {
    showAddDocForm = false;
    dispatch('cancel-add');
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
        <div class="flex gap-1 flex-shrink-0 ml-2">
          <button class="text-xs text-zinc-500 hover:text-zinc-700 cursor-pointer p-1" on:click={() => toggleDocPin(d)} title={d.pinned ? 'Unpin' : 'Pin'}>
            {#if d.pinned}
              <PinOff size="18" />
            {:else}
              <Pin size="18" />
            {/if}
          </button>
          <button class="text-xs text-zinc-500 hover:text-zinc-700 cursor-pointer p-1" on:click={() => startEditDoc(d, i)} title="Edit">
            <Pencil size="18" />
          </button>
          <button class="text-xs text-red-500 hover:text-red-700 cursor-pointer p-1" on:click={() => deleteDoc(d, i)} title="Delete">
            <Trash size="18" />
          </button>
        </div>
      </div>
      
      <!-- Row 2: Content Preview -->
      <div class="text-xs text-gray-700 whitespace-pre-wrap mb-2">
        {d.content.slice(0, 400)}{d.content.length > 400 ? '…' : ''}
      </div>
      

      {#if d._editing}
        <div class="mt-2 grid gap-2">
          <input class="border rounded p-2" placeholder="Title" bind:value={d._editTitle} />
          <textarea class="border rounded p-2" rows="6" placeholder="Content" bind:value={d._editContent}></textarea>
          <div class="flex gap-2">
            <button class="border rounded px-2 hover:bg-gray-50 cursor-pointer" on:click={() => saveDocEdit(d, { title: d._editTitle, content: d._editContent })}>Save</button>
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
