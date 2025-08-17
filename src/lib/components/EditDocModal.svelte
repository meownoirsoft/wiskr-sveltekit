<script>
  import { createEventDispatcher } from 'svelte';
  import { X } from 'lucide-svelte';
  
  export let showModal = false;
  export let doc = null;
  
  let editTitle = '';
  let editContent = '';
  let editTags = '';
  
  const dispatch = createEventDispatcher();
  
  // Reset form when modal opens/closes or doc changes
  $: if (showModal && doc) {
    editTitle = doc.title || '';
    editContent = doc.content || '';
    editTags = doc.tags ? doc.tags.join(', ') : '';
  }
  
  function handleSave() {
    const tags = editTags ? editTags.split(',').map(t => t.trim()).filter(Boolean) : [];
    dispatch('save', {
      doc,
      editData: {
        title: editTitle,
        content: editContent,
        tags
      }
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
  <div class="fixed inset-0 backdrop-blur-sm bg-black bg-opacity-25 dark:bg-opacity-50 flex items-center justify-center z-50 p-4">
    <!-- Modal Content -->
    <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl" style="background-color: var(--bg-modal, white);">
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Document</h3>
          <span class="text-xs px-2 py-1 rounded-full font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
            doc
          </span>
        </div>
        <button 
          class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1"
          on:click={closeModal}
        >
          <X size="20" />
        </button>
      </div>
      
      <!-- Modal Body -->
      <div class="p-4 space-y-4">
        <!-- Title Input -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="edit-title">Name/Title</label>
          <input 
            class="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
            placeholder="Document title"
            bind:value={editTitle}
          />
        </div>
        
        <!-- Content Input -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="edit-content">Content</label>
          <textarea 
            class="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
            rows="8"
            placeholder="Enter your document content here..."
            bind:value={editContent}
          ></textarea>
        </div>
        
        <!-- Tags Input -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="edit-tags">Tags</label>
          <input 
            class="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
            placeholder="comma, separated, tags"
            bind:value={editTags}
          />
        </div>
      </div>
      
      <!-- Modal Footer -->
      <div class="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
        <button 
          class="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
          on:click={closeModal}
        >
          Cancel
        </button>
        <button 
          class="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
          on:click={handleSave}
        >
          Save Changes
        </button>
      </div>
    </div>
  </div>
{/if}
