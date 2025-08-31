<script>
  import { createEventDispatcher } from 'svelte';
  import { X } from 'lucide-svelte';
  import SayLessModal from './SayLessModal.svelte';
  import SayLessButton from '../SayLessButton.svelte';
  import TagSuggest from '../TagSuggest.svelte';
  import FeatureGate from '../FeatureGate.svelte';
  
  export let showModal = false;
  export let fact = null;
  export let projectFactTypes = [];
  export let projectId = null;
  export let user = null; // User object with tier info
  
  let editKey = '';
  let editValue = '';
  let editTags = '';
  let editType = '';
  
  const dispatch = createEventDispatcher();
  
  // SayLess state
  let showSayLessModal = false;
  let saylessOriginalText = '';
  let saylessFieldType = 'fact';
  
  // Reset form when modal opens/closes or fact changes
  $: if (showModal && fact) {
    editKey = fact.key || '';
    editValue = fact.value || '';
    editTags = fact.tags ? fact.tags.join(', ') : '';
    editType = fact.type || '';
  }
  
  function handleSave() {
    // Validate that a fact type is selected (not empty or placeholder)
    if (!editType || editType === '') {
      alert('Please select a fact type.');
      return;
    }
    
    const tags = editTags ? editTags.split(',').map(t => t.trim()).filter(Boolean) : [];
    dispatch('save', {
      fact,
      editData: {
        type: editType,
        key: editKey,
        value: editValue,
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
  
  function getTypeTagClass(type) {
    const projectType = projectFactTypes.find(ft => ft.type_key === type);
    if (projectType && projectType.color_class) {
      return projectType.color_class;
    }
    
    const tagStyles = {
      person: 'bg-blue-100 text-blue-700',
      place: 'bg-green-100 text-green-700',
      process: 'bg-purple-100 text-purple-700',
      term: 'bg-orange-100 text-orange-700',
      thing: 'bg-red-100 text-red-700',
      character: 'bg-blue-100 text-blue-700',
      location: 'bg-green-100 text-green-700',
      mechanic: 'bg-purple-100 text-purple-700',
      glossary: 'bg-orange-100 text-orange-700',
      entity: 'bg-red-100 text-red-700'
    };
    return tagStyles[type] || 'bg-gray-100 text-gray-700';
  }
  
  // SayLess handlers
  function handleSayLessClick() {
    if (!editValue.trim()) return;
    saylessOriginalText = editValue;
    saylessFieldType = 'fact';
    showSayLessModal = true;
  }
  
  function handleSayLessModalClose() {
    showSayLessModal = false;
    saylessOriginalText = '';
  }
  
  function handleSayLessReplace(event) {
    const { newText } = event.detail;
    editValue = newText;
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
  
  // Get existing tags for TagSuggest component
  $: existingTagsArray = editTags ? editTags.split(',').map(t => t.trim()).filter(Boolean) : [];
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showModal}
  <!-- Modal Overlay -->
  <div class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
    <!-- Modal Content -->
    <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl" style="background-color: var(--bg-modal, white);">
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Fact</h3>
          {#if editType}
            <span class="text-xs px-2 py-1 rounded-full font-medium {getTypeTagClass(editType)}">
              {projectFactTypes.find(ft => ft.type_key === editType)?.display_name || editType}
            </span>
          {/if}
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
        <!-- Type Selection -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="edit-type">Type</label>
          <select class="select-with-placeholder w-full text-sm border border-gray-300 dark:border-gray-600 bg-gray-50 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" style="background-color: var(--bg-primary);" bind:value={editType}>
            <option value="" disabled>Select a fact type...</option>
            {#if projectFactTypes.length > 0}
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
        </div>
        
        <!-- Key Input -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="edit-key">Name/Title</label>
          <input 
            class="w-full text-sm border border-gray-300 dark:border-gray-600 bg-gray-50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" style="background-color: var(--bg-primary);"
            placeholder="e.g., Cheddar"
            bind:value={editKey}
          />
        </div>
        
        <!-- Value Input -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300" for="edit-value">Content</label>
            {#if editValue.trim()}
              <FeatureGate
                featureKey="say-less"
                {user}
                requiredTier={1}
                let:hasAccess
              >
                <SayLessButton
                  on:sayless={handleSayLessClick}
                  disabled={!editValue.trim() || !hasAccess}
                  size="sm"
                />
              </FeatureGate>
            {/if}
          </div>
          <textarea 
            class="w-full text-sm border border-gray-300 dark:border-gray-600 bg-gray-50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" style="background-color: var(--bg-primary);"
            rows="4"
            placeholder="Enter the fact details..."
            bind:value={editValue}
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
            content={editValue}
            title={editKey}
            type={editType}
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
