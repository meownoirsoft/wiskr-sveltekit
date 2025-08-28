<script>
  import { createEventDispatcher } from 'svelte';
  import { X } from 'lucide-svelte';
  import TLDRModal from './TLDRModal.svelte';
  import TLDRButton from './TLDRButton.svelte';
  import TagSuggest from './TagSuggest.svelte';
  
  export let showModal = false;
  export let doc = null;
  export let projectId = null;
  
  let editTitle = '';
  let editContent = '';
  let editTags = '';
  
  const dispatch = createEventDispatcher();
  
  // TL;DR state
  let showTLDRModal = false;
  let tldrOriginalText = '';
  let tldrFieldType = 'doc';
  
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
  
  // TL;DR handlers
  function handleTLDRClick() {
    if (!editContent.trim()) return;
    tldrOriginalText = editContent;
    tldrFieldType = 'doc';
    showTLDRModal = true;
  }
  
  function handleTLDRModalClose() {
    showTLDRModal = false;
    tldrOriginalText = '';
  }
  
  function handleTLDRReplace(event) {
    const { newText } = event.detail;
    editContent = newText;
    showTLDRModal = false;
    tldrOriginalText = '';
  }
  
  function handleAddTag(event) {
    const newTag = event.detail;
    const currentTags = editTags ? editTags.split(',').map(t => t.trim()).filter(Boolean) : [];
    if (!currentTags.includes(newTag)) {
      const updatedTags = [...currentTags, newTag];
      editTags = updatedTags.join(', ');
    }
  }
  
  // Get existing tags for TagSuggest component
  $: existingTagsArray = editTags ? editTags.split(',').map(t => t.trim()).filter(Boolean) : [];
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showModal}
  <!-- Modal Overlay -->
  <div class="fixed inset-0 backdrop-blur-sm   flex items-center justify-center z-[99999] p-4">
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
          class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-blue-400 p-1"
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
            class="w-full text-sm border border-gray-300 dark:border-gray-600 bg-gray-50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" style="background-color: var(--bg-primary);"
            placeholder="Document title"
            bind:value={editTitle}
          />
        </div>
        
        <!-- Content Input -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300" for="edit-content">Content</label>
            {#if editContent.trim()}
              <TLDRButton
                on:tldr={handleTLDRClick}
                disabled={!editContent.trim()}
                size="sm"
              />
            {/if}
          </div>
          <textarea 
            class="w-full text-sm border border-gray-300 dark:border-gray-600 bg-gray-50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" style="background-color: var(--bg-primary);"
            rows="8"
            placeholder="Enter your document content here..."
            bind:value={editContent}
          ></textarea>
        </div>
        
        <!-- Tags Input -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="edit-tags">Tags</label>
          <input 
            class="w-full text-sm border border-gray-300 dark:border-gray-600 bg-gray-50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" style="background-color: var(--bg-primary);"
            placeholder="comma, separated, tags"
            bind:value={editTags}
          />
          
          <!-- Tag Suggestions -->
          <TagSuggest
            content={editContent}
            title={editTitle}
            type="doc"
            {projectId}
            existingTags={existingTagsArray}
            on:add-tag={handleAddTag}
          />
        </div>
      </div>
      
      <!-- Modal Footer -->
      <div class="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
        <button 
          class="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-blue-400"
          on:click={closeModal}
        >
          Cancel
        </button>
        <button 
          class="px-4 py-2 text-sm rounded-md" 
          style="background-color: var(--color-accent); color: var(--color-accent-text);"
          on:click={handleSave}
        >
          Save
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- TL;DR Modal -->
{#if showTLDRModal}
  <TLDRModal
    bind:visible={showTLDRModal}
    originalText={tldrOriginalText}
    fieldType={tldrFieldType}
    on:close={handleTLDRModalClose}
    on:replace={handleTLDRReplace}
  />
{/if}
