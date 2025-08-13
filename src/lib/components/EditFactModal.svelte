<script>
  import { createEventDispatcher } from 'svelte';
  import { X } from 'lucide-svelte';
  
  export let showModal = false;
  export let fact = null;
  export let projectFactTypes = [];
  
  let editKey = '';
  let editValue = '';
  let editTags = '';
  let editType = '';
  
  const dispatch = createEventDispatcher();
  
  // Reset form when modal opens/closes or fact changes
  $: if (showModal && fact) {
    editKey = fact.key || '';
    editValue = fact.value || '';
    editTags = fact.tags ? fact.tags.join(', ') : '';
    editType = fact.type || '';
  }
  
  function handleSave() {
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
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showModal}
  <!-- Modal Overlay -->
  <div class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <!-- Modal Content -->
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md">
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-4 border-b">
        <div class="flex items-center gap-3">
          <h3 class="text-lg font-semibold">Edit Fact</h3>
          {#if editType}
            <span class="text-xs px-2 py-1 rounded-full font-medium {getTypeTagClass(editType)}">
              {projectFactTypes.find(ft => ft.type_key === editType)?.display_name || editType}
            </span>
          {/if}
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
        <!-- Type Selection -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select class="w-full border rounded-md px-3 py-2" bind:value={editType}>
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
          <label class="block text-sm font-medium text-gray-700 mb-1">Key</label>
          <input 
            class="w-full border rounded-md px-3 py-2" 
            placeholder="e.g., Cheddar"
            bind:value={editKey}
          />
        </div>
        
        <!-- Value Input -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Value</label>
          <textarea 
            class="w-full border rounded-md px-3 py-2" 
            rows="4"
            placeholder="Enter the fact details..."
            bind:value={editValue}
          ></textarea>
        </div>
        
        <!-- Tags Input -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tags</label>
          <input 
            class="w-full border rounded-md px-3 py-2" 
            placeholder="comma, separated, tags"
            bind:value={editTags}
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
          class="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          on:click={handleSave}
        >
          Save Changes
        </button>
      </div>
    </div>
  </div>
{/if}
