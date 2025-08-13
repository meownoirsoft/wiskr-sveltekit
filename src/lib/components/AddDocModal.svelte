<script>
  import { createEventDispatcher } from 'svelte';
  import { X } from 'lucide-svelte';
  
  export let showModal = false;
  export let docTitle = '';
  export let docContent = '';
  export let docTags = '';
  
  const dispatch = createEventDispatcher();
  
  function handleSave() {
    const tags = docTags ? docTags.split(',').map(t => t.trim()).filter(Boolean) : [];
    dispatch('add', {
      title: docTitle,
      content: docContent,
      tags
    });
    closeModal();
  }
  
  function closeModal() {
    showModal = false;
    dispatch('close');
  }
  
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      closeModal();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showModal}
  <!-- Modal Overlay -->
  <div class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <!-- Modal Content -->
    <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl">
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-4 border-b">
        <div class="flex items-center gap-3">
          <h3 class="text-lg font-semibold">Add New Document</h3>
          <span class="text-xs px-2 py-1 rounded-full font-medium bg-purple-100 text-purple-700">
            doc
          </span>
        </div>
        <button 
          class="text-gray-400 hover:text-gray-600 p-1"
          on:click={closeModal}
        >
          <X size="20" />
        </button>
      </div>
      
      <!-- Modal Body -->
      <div class="p-4 space-y-4">
        <!-- Title Input -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input 
            class="w-full border rounded-md px-3 py-2" 
            placeholder="Document title"
            bind:value={docTitle}
          />
        </div>
        
        <!-- Content Input -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Content</label>
          <textarea 
            class="w-full border rounded-md px-3 py-2" 
            rows="8"
            placeholder="Enter your document content here... (longer notes, lore, specs)"
            bind:value={docContent}
          ></textarea>
        </div>
        
        <!-- Tags Input -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tags</label>
          <input 
            class="w-full border rounded-md px-3 py-2" 
            placeholder="comma, separated, tags"
            bind:value={docTags}
          />
        </div>
      </div>
      
      <!-- Modal Footer -->
      <div class="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
        <button 
          class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          on:click={closeModal}
        >
          Cancel
        </button>
        <button 
          class="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
          on:click={handleSave}
        >
          Add Document
        </button>
      </div>
    </div>
  </div>
{/if}
