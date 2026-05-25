<script>
  import { createEventDispatcher } from 'svelte';
  import { X } from 'lucide-svelte';
  import SayLessModal from './SayLessModal.svelte';
  import SayLessButton from '../SayLessButton.svelte';
  import FeatureGate from '../FeatureGate.svelte';
  import TagSuggest from '../TagSuggest.svelte';
  import MarkdownEditor from '../MarkdownEditor.svelte';
  import { createModalClickHandler } from '$lib/utils/modalClickHandler.js';
  
  export let showModal = false;
  export let doc = null;
  export let projectId = null;
  export let user = null; // User object with tier info
  
  let editTitle = '';
  let editContent = '';
  let editTags = '';
  
  // Markdown editor state
  let useMarkdownEditor = false;
  let isFullScreen = false;
  let showPreview = false;
  let showSplitView = false;
  
  const dispatch = createEventDispatcher();
  
  // Modal click handler
  const modalClickHandler = createModalClickHandler(() => { closeModal(); });
  
  // SayLess state
  let showSayLessModal = false;
  let saylessOriginalText = '';
  let saylessFieldType = 'doc';
  
  // Reset form when modal opens/closes or doc changes
  $: if (showModal && doc) {
    editTitle = doc.title || '';
    editContent = doc.content || '';
    editTags = doc.tags ? doc.tags.join(', ') : '';
  }

  // Force markdown editor re-initialization when switching modes
  $: if (useMarkdownEditor && showModal) {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      // This will trigger the markdown editor to re-initialize
    }, 100);
  }
  
  function handleSave() {
    // Validate that a title is provided
    if (!editTitle || !editTitle.trim()) {
      alert('Please provide a title for this document.');
      return;
    }
    
    // Validate that content is provided
    if (!editContent || !editContent.trim()) {
      alert('Please provide content for this document.');
      return;
    }
    
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
  
  // SayLess handlers
  function handleSayLessClick() {
    if (!editContent.trim()) return;
    saylessOriginalText = editContent;
    saylessFieldType = 'doc';
    showSayLessModal = true;
  }
  
  function handleSayLessModalClose() {
    showSayLessModal = false;
    saylessOriginalText = '';
  }
  
  function handleSayLessReplace(event) {
    const { newText } = event.detail;
    editContent = newText;
    showSayLessModal = false;
    saylessOriginalText = '';
  }
  
  function handleAddTag(event) {
    const newTag = event.detail;
    const currentTags = editTags ? editTags.split(',').map(t => t.trim()).filter(Boolean) : [];
    if (!currentTags.includes(newTag)) {
      const updatedTags = [...currentTags, newTag];
      editTags = updatedTags.join(', ');
    }
  }
  
  // Markdown editor event handlers
  function handleMarkdownContentChange(event) {
    editContent = event.detail.content;
  }
  
  function handleMarkdownFullscreenToggle(event) {
    isFullScreen = event.detail.isFullScreen;
  }
  
  function handleMarkdownPreviewToggle(event) {
    showPreview = event.detail.showPreview;
  }
  
  function handleMarkdownSplitToggle(event) {
    showSplitView = event.detail.showSplitView;
  }
  
  // Get existing tags for TagSuggest component
  $: existingTagsArray = editTags ? editTags.split(',').map(t => t.trim()).filter(Boolean) : [];
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showModal}
  <!-- Modal Overlay -->
  <div 
    class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[99999] p-4" 
    class:fullscreen-overlay={isFullScreen}
    on:mousedown={modalClickHandler.handleMouseDown}
    on:click={modalClickHandler.handleClick}
    on:keydown={(e) => e.key === 'Escape' && closeModal()}
    role="dialog"
    aria-modal="true"
    aria-label="Edit document"
    tabindex="-1"
  >
    <!-- Modal Content -->
    <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col" style="background-color: var(--bg-modal, white);" class:fullscreen-modal={isFullScreen}>
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
            <div class="flex items-center gap-2">
              <!-- Markdown Editor Toggle -->
              <button
                on:click={() => useMarkdownEditor = !useMarkdownEditor}
                class="px-2 py-1 text-xs rounded border transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
              >
                {useMarkdownEditor ? 'Plain Text' : 'Markdown Editor'}
              </button>
              
              {#if editContent.trim() && !useMarkdownEditor}
                <FeatureGate {user} feature="say-less" requiredTier={1} let:hasAccess>
                  <SayLessButton
                    on:sayless={handleSayLessClick}
                    disabled={!editContent.trim() || !hasAccess}
                    size="sm"
                  />
                </FeatureGate>
              {/if}
            </div>
          </div>
          
                                   {#if useMarkdownEditor}
                           <!-- Markdown Editor -->
                           <div class="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden mx-4" style="height: 400px; max-width: calc(100% - 2rem); width: calc(100% - 2rem);">
                             <MarkdownEditor
                               key={useMarkdownEditor ? 'markdown' : 'plain'}
                               content={editContent}
                               placeholder="Enter your markdown content here..."
                               bind:isFullScreen
                               bind:showPreview
                               bind:showSplitView
                               on:content-change={handleMarkdownContentChange}
                               on:fullscreen-toggle={handleMarkdownFullscreenToggle}
                               on:preview-toggle={handleMarkdownPreviewToggle}
                               on:split-toggle={handleMarkdownSplitToggle}
                             />
                           </div>
          {:else}
            <!-- Regular Textarea -->
            <textarea 
              class="w-full text-sm border border-gray-300 dark:border-gray-600 bg-gray-50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" style="background-color: var(--bg-primary);"
              rows="8"
              placeholder="Enter your document content here..."
              bind:value={editContent}
            ></textarea>
          {/if}
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
            {user}
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

<!-- SayLess Modal -->
{#if showSayLessModal}
  <SayLessModal
    bind:visible={showSayLessModal}
    originalText={saylessOriginalText}
    fieldType={saylessFieldType}
    on:close={handleSayLessModalClose}
    on:replace={handleSayLessReplace}
  />
{/if}

<style>
  .fullscreen-overlay {
    padding: 0;
    align-items: stretch;
  }
  
  .fullscreen-modal {
    max-width: none;
    width: 100vw;
    height: 100vh;
    border-radius: 0;
    box-shadow: none;
  }
</style>
