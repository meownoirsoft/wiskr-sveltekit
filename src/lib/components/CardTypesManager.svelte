<script>
  import { onMount } from 'svelte';
  import { Plus, Trash2, GripVertical, Save, X } from 'lucide-svelte';
  import FeatureGate from './FeatureGate.svelte';
  
  export let projectId;
  export let user = null; // User object with tier info
  
  let cardTypes = [];
  let loading = false;
  let saving = false;
  let showAddForm = false;
  let showActionMenu = null; // Track which action menu is open
  let newCardType = { type_key: '', display_name: '', color_class: 'bg-blue-100 text-blue-700' };
  
  const colorOptions = [
    { class: 'bg-blue-100 text-blue-700', name: 'Blue' },
    { class: 'bg-green-100 text-green-700', name: 'Green' },
    { class: 'bg-purple-100 text-purple-700', name: 'Purple' },
    { class: 'bg-orange-100 text-orange-700', name: 'Orange' },
    { class: 'bg-red-100 text-red-700', name: 'Red' },
    { class: 'bg-yellow-100 text-yellow-700', name: 'Yellow' },
    { class: 'bg-pink-100 text-pink-700', name: 'Pink' },
    { class: 'bg-indigo-100 text-indigo-700', name: 'Indigo' },
    { class: 'bg-gray-100 text-gray-700', name: 'Gray' }
  ];
  
  onMount(() => {
    loadCardTypes();
  });
  
  async function loadCardTypes() {
    if (!projectId) return;
    
    loading = true;
    try {
      const response = await fetch(`/api/projects/${projectId}/card-types`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (response.ok) {
        cardTypes = data.cardTypes || [];
        // If no custom card types exist, populate with defaults for editing
        if (cardTypes.length === 0) {
          cardTypes = getDefaultCardTypes();
          console.log('No custom card types found, populating with defaults for customization');
        }
      } else {
        console.error('Failed to load card types:', data.error);
        // Initialize with default types if API fails
        cardTypes = getDefaultCardTypes();
      }
    } catch (error) {
      console.error('Error loading card types:', error);
      cardTypes = getDefaultCardTypes();
    } finally {
      loading = false;
    }
  }
  
  function getDefaultCardTypes() {
    return [
      { type_key: 'person', display_name: 'person', color_class: 'bg-blue-100 text-blue-700', sort_order: 1 },
      { type_key: 'place', display_name: 'place', color_class: 'bg-green-100 text-green-700', sort_order: 2 },
      { type_key: 'process', display_name: 'process', color_class: 'bg-purple-100 text-purple-700', sort_order: 3 },
      { type_key: 'term', display_name: 'term', color_class: 'bg-orange-100 text-orange-700', sort_order: 4 },
      { type_key: 'thing', display_name: 'thing', color_class: 'bg-red-100 text-red-700', sort_order: 5 }
    ];
  }
  
  async function saveCardTypes() {
    if (!projectId) return;
    
    saving = true;
    try {
      // Update sort orders based on current array position
      const updatedCardTypes = cardTypes.map((ft, index) => ({
        ...ft,
        sort_order: index + 1
      }));
      
      const response = await fetch(`/api/projects/${projectId}/card-types`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ cardTypes: updatedCardTypes })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        cardTypes = data.cardTypes;
        // Show success message (you could add a toast notification here)
        console.log('Card types saved successfully');
      } else {
        console.error('Failed to save card types:', data.error);
        alert('Failed to save card types: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving card types:', error);
      alert('Error saving card types');
    } finally {
      saving = false;
    }
  }
  
  function addCardType() {
    if (!newCardType.type_key.trim() || !newCardType.display_name.trim()) {
      alert('Please fill in both the key and display name');
      return;
    }
    
    // Check for duplicate keys
    if (cardTypes.some(ft => ft.type_key === newCardType.type_key.trim())) {
      alert('A card type with this key already exists');
      return;
    }
    
    const cardType = {
      type_key: newCardType.type_key.trim().toLowerCase().replace(/\s+/g, '_'),
      display_name: newCardType.display_name.trim(),
      color_class: newCardType.color_class,
      sort_order: cardTypes.length + 1
    };
    
    cardTypes = [...cardTypes, cardType];
    
    // Reset form
    newCardType = { type_key: '', display_name: '', color_class: 'bg-blue-100 text-blue-700' };
    showAddForm = false;
  }
  
  function removeCardType(index) {
    if (confirm('Are you sure you want to remove this card type? This action cannot be undone.')) {
      cardTypes = cardTypes.filter((_, i) => i !== index);
    }
  }
  
  function moveUp(index) {
    if (index > 0) {
      const temp = cardTypes[index];
      cardTypes[index] = cardTypes[index - 1];
      cardTypes[index - 1] = temp;
      cardTypes = [...cardTypes]; // Trigger reactivity
    }
  }
  
  function moveDown(index) {
    if (index < cardTypes.length - 1) {
      const temp = cardTypes[index];
      cardTypes[index] = cardTypes[index + 1];
      cardTypes[index + 1] = temp;
      cardTypes = [...cardTypes]; // Trigger reactivity
    }
  }
  
  function getColorPreview(colorClass) {
    const colorMap = {
      'bg-blue-100 text-blue-700': '#dbeafe',
      'bg-green-100 text-green-700': '#dcfce7',
      'bg-purple-100 text-purple-700': '#f3e8ff',
      'bg-orange-100 text-orange-700': '#fed7aa',
      'bg-red-100 text-red-700': '#fee2e2',
      'bg-yellow-100 text-yellow-700': '#fef3c7',
      'bg-pink-100 text-pink-700': '#fce7f3',
      'bg-indigo-100 text-indigo-700': '#e0e7ff',
      'bg-gray-100 text-gray-700': '#f3f4f6'
    };
    return colorMap[colorClass] || '#f3f4f6';
  }
  
  // Hover handlers for the "Add Custom Card Type" button
  function handleHover(event) {
    event.target.style.backgroundColor = 'var(--color-accent-light)';
  }
  
  function handleLeave(event) {
    event.target.style.backgroundColor = 'transparent';
  }
  
  // Close action menu when clicking outside
  function handleClickOutside(event) {
    if (showActionMenu !== null && !event.target.closest('.action-menu')) {
      showActionMenu = null;
    }
  }
</script>

<div class="space-y-3 min-h-[150px] md:min-h-[350px] w-full max-h-[60vh] overflow-y-auto" on:click={handleClickOutside}>
  {#if loading}
    <div class="text-center py-6">
      <div class="text-gray-500">Loading card types...</div>
    </div>
  {:else}
    

         <!-- Current Card Types -->
     <FeatureGate
       featureKey="custom-card-types"
       {user}
       requiredTier={1}
       className="w-full"
       let:hasAccess
     >
      <!-- Desktop: New layout -->
      <div class="hidden md:block space-y-3">
        {#each cardTypes as cardType, index}
          <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
            <!-- Top row: Name input + Action buttons -->
            <div class="flex items-center gap-3 mb-3">
              <!-- Drag Handle -->
              <div class="cursor-move text-gray-400 dark:text-gray-500">
                {#if hasAccess}
                  <GripVertical size="20" />
                {:else}
                  <div class="w-5 h-5 bg-gray-200 dark:bg-gray-600 rounded"></div>
                {/if}
              </div>
              
              <!-- Display Name -->
              <div class="flex-1">
                {#if hasAccess}
                  <input
                    type="text"
                    bind:value={cardType.display_name}
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded focus:outline-none focus:ring-2" style="--tw-ring-color: var(--color-accent);" 
                    on:focus={() => {this.style.borderColor='var(--color-accent)'; this.style.boxShadow='0 0 0 2px var(--color-accent-light)';}} 
                    on:blur={() => {this.style.borderColor=''; this.style.boxShadow='';}}
                    placeholder="Card type name"
                  />
                {:else}
                  <input
                    type="text"
                    value={cardType.display_name}
                    disabled
                    class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded cursor-not-allowed"
                    placeholder="Card type name"
                  />
                {/if}
              </div>
              
              <!-- Action buttons -->
              <div class="flex items-center gap-2">
                {#if hasAccess}
                  <!-- Move buttons -->
                  <button
                    on:click={() => moveUp(index)}
                    disabled={index === 0}
                    class="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed rounded border border-gray-200 dark:border-gray-600"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    on:click={() => moveDown(index)}
                    disabled={index === cardTypes.length - 1}
                    class="p-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    ↓
                  </button>
                  
                  <!-- Remove Button -->
                  <button
                    on:click={() => removeCardType(index)}
                    class="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded cursor-pointer border border-red-200 dark:border-red-700"
                    title="Remove card type"
                  >
                    <Trash2 size="16" />
                  </button>
                {:else}
                  <!-- Disabled buttons -->
                  <button
                    disabled
                    class="p-2 text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50 rounded border border-gray-200 dark:border-gray-600"
                    title="Move up (Pro feature)"
                  >
                    ↑
                  </button>
                  <button
                    disabled
                    class="p-2 text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50 rounded border border-gray-200 dark:border-gray-600"
                    title="Move down (Pro feature)"
                  >
                    ↓
                  </button>
                  
                  <button
                    disabled
                    class="p-2 text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50 rounded border border-gray-200 dark:border-gray-600"
                    title="Remove card type (Pro feature)"
                  >
                    <Trash2 size="16" />
                  </button>
                {/if}
              </div>
            </div>
            
            <!-- Bottom row: Color + Preview -->
            <div class="grid grid-cols-2 gap-4">
              <!-- Color Selector -->
              <div>
                {#if hasAccess}
                  <select
                    bind:value={cardType.color_class}
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-2" style="--tw-ring-color: var(--color-accent);" 
                    on:focus={() => {this.style.borderColor='var(--color-accent)'; this.style.boxShadow='0 0 0 2px var(--color-accent-light)';}} 
                    on:blur={() => {this.style.borderColor=''; this.style.boxShadow='';}}
                  >
                    {#each colorOptions as color}
                      <option value={color.class}>{color.name}</option>
                    {/each}
                  </select>
                {:else}
                  <select
                    value={cardType.color_class}
                    disabled
                    class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded cursor-not-allowed"
                  >
                    <option value={cardType.color_class}>{colorOptions.find(c => c.class === cardType.color_class)?.name || 'Color'}</option>
                  </select>
                {/if}
              </div>
              
              <!-- Preview -->
              <div class="flex items-center gap-2">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Preview</label>
                <span class="text-sm px-3 py-2 rounded-full font-medium {cardType.color_class}">
                  {cardType.display_name}
                </span>
              </div>
            </div>
          </div>
        {/each}
      </div>

                     <!-- Mobile: Same layout as desktop -->
        <div class="md:hidden space-y-3 w-full">
          {#each cardTypes as cardType, index}
            <div class="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
             <!-- Top row: Name input + Action buttons -->
             <div class="flex items-center gap-3 mb-3">
               <!-- Drag Handle -->
               <div class="cursor-move text-gray-400 dark:text-gray-500">
                 {#if hasAccess}
                   <GripVertical size="20" />
                 {:else}
                   <div class="w-5 h-5 bg-gray-200 dark:bg-gray-600 rounded"></div>
                 {/if}
               </div>
               
               <!-- Display Name -->
               <div class="flex-1">
                 {#if hasAccess}
                   <input
                     type="text"
                     bind:value={cardType.display_name}
                     class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded focus:outline-none focus:ring-2" style="--tw-ring-color: var(--color-accent);" 
                     on:focus={() => {this.style.borderColor='var(--color-accent)'; this.style.boxShadow='0 0 0 2px var(--color-accent-light)';}} 
                     on:blur={() => {this.style.borderColor=''; this.style.boxShadow='';}}
                     placeholder="Card type name"
                   />
                 {:else}
                   <input
                     type="text"
                     value={cardType.display_name}
                     disabled
                     class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded cursor-not-allowed"
                     placeholder="Card type name"
                   />
                 {/if}
               </div>
               
               <!-- Action Menu (Mobile) -->
               <div class="relative">
                 {#if hasAccess}
                   <button
                     on:click={(e) => { e.stopPropagation(); showActionMenu = showActionMenu === index ? null : index; }}
                     class="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded border border-gray-200 dark:border-gray-600"
                     title="Actions"
                   >
                     ⋯
                   </button>
                   
                   <!-- Dropdown Menu -->
                   {#if showActionMenu === index}
                     <div class="action-menu absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-[120px]">
                       <div class="py-1">
                         <button
                           on:click={(e) => { e.stopPropagation(); moveUp(index); showActionMenu = null; }}
                           disabled={index === 0}
                           class="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                         >
                           ↑ Move Up
                         </button>
                         <button
                           on:click={(e) => { e.stopPropagation(); moveDown(index); showActionMenu = null; }}
                           disabled={index === cardTypes.length - 1}
                           class="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                         >
                           ↓ Move Down
                         </button>
                         <div class="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                         <button
                           on:click={(e) => { e.stopPropagation(); removeCardType(index); showActionMenu = null; }}
                           class="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2"
                         >
                           <Trash2 size="14" />
                           Remove
                         </button>
                       </div>
                     </div>
                   {/if}
                 {:else}
                   <button
                     disabled
                     class="p-2 text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50 rounded border border-gray-200 dark:border-gray-600"
                     title="Actions (Pro feature)"
                   >
                     ⋯
                   </button>
                 {/if}
               </div>
             </div>
             
                                         <!-- Bottom row: Color + Preview (side by side, color indented under name) -->
              <div class="grid grid-cols-2 gap-4">
               <!-- Color Selector (indented under name) -->
               <div class="ml-10">
                 {#if hasAccess}
                   <select
                     bind:value={cardType.color_class}
                     class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-2" style="--tw-ring-color: var(--color-accent);" 
                     on:focus={() => {this.style.borderColor='var(--color-accent)'; this.style.boxShadow='0 0 0 2px var(--color-accent-light)';}} 
                     on:blur={() => {this.style.borderColor=''; this.style.boxShadow='';}}
                   >
                     {#each colorOptions as color}
                       <option value={color.class}>{color.name}</option>
                     {/each}
                   </select>
                 {:else}
                   <select
                     value={cardType.color_class}
                     disabled
                     class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded cursor-not-allowed"
                   >
                     <option value={cardType.color_class}>{colorOptions.find(c => c.class === cardType.color_class)?.name || 'Color'}</option>
                   </select>
                 {/if}
               </div>
               
               <!-- Preview -->
               <div class="flex items-center gap-2">
                 <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Preview</label>
                 <span class="text-sm px-3 py-2 rounded-full font-medium {cardType.color_class}">
                   {cardType.display_name}
                 </span>
               </div>
              </div>
           </div>
         {/each}
       </div>
    </FeatureGate>
    
    <!-- Add New Card Type -->
    <div class="border-t border-gray-200 dark:border-gray-700 pt-2">
      <FeatureGate
        featureKey="custom-card-types"
        {user}
        requiredTier={1}
        let:hasAccess
      >
        {#if hasAccess && !showAddForm}
          <!-- svelte-ignore a11y-mouse-events-have-key-events -->
          <button
            on:click={() => showAddForm = true}
            class="flex items-center gap-2 px-3 py-2 border rounded cursor-pointer" style="color: var(--color-accent); border-color: var(--color-accent-border); background-color: transparent;" 
            on:mouseenter={handleHover} 
            on:mouseleave={handleLeave}
          >
            <Plus size="16" />
            Add Custom Card Type
          </button>
        {:else if hasAccess && showAddForm}
          <div class="p-3 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-800">
            <h3 class="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">Add New Card Type</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="card-type-key">Type Key</label>
                <input
                  type="text"
                  bind:value={newCardType.type_key}
                  class="w-full px-2 py-1.5 text-sm font-mono border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded focus:outline-none focus:ring-2" 
                  style="--tw-ring-color: var(--color-accent);" 
                  on:focus={() => { this.style.borderColor='var(--color-accent)'; this.style.boxShadow='0 0 0 2px var(--color-accent-light)'; }} 
                  on:blur={() => { this.style.borderColor=''; this.style.boxShadow=''; }}
                  placeholder="e.g., organization"
                />
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Lowercase, no spaces (used internally)</p>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="card-type-display-name">Display Name</label>
                <input
                  type="text"
                  bind:value={newCardType.display_name}
                  class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded focus:outline-none focus:ring-2" 
                  style="--tw-ring-color: var(--color-accent);" 
                  on:focus={() => { this.style.borderColor='var(--color-accent)'; this.style.boxShadow='0 0 0 2px var(--color-accent-light)'; }} 
                  on:blur={() => { this.style.borderColor=''; this.style.boxShadow=''; }}
                  placeholder="e.g., Organization"
                />
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">What users will see</p>
              </div>
              
              <div>
                <select
                  bind:value={newCardType.color_class}
                  class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-2" 
                  style="--tw-ring-color: var(--color-accent);" 
                  on:focus={() => { this.style.borderColor='var(--color-accent)'; this.style.boxShadow='0 0 0 2px var(--color-accent-light)'; }} 
                  on:blur={() => { this.style.boxShadow=''; }}
                >
                  {#each colorOptions as color}
                    <option value={color.class}>{color.name}</option>
                  {/each}
                </select>
              </div>
            </div>
            
            <div class="flex items-center gap-2">
              <button
                on:click={addCardType}
                class="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer"
              >
                <Save size="16" />
                Add Card Type
              </button>
              
              <button
                on:click={() => showAddForm = false}
                class="flex items-center gap-2 px-3 py-1.5 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer"
              >
                <X size="16" />
                Cancel
              </button>
            </div>
          </div>
        {:else}
          <!-- Disabled Add Button for free users -->
          <button
            disabled
            class="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
          >
            <Plus size="16" />
            Add Custom Card Type
          </button>
        {/if}
      </FeatureGate>
    </div>
    
    <!-- Save Button -->
    <div class="flex justify-end pt-3 border-t">
      <button
        on:click={saveCardTypes}
        disabled={saving}
        class="flex items-center gap-2 px-4 py-2 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed" 
        style="background-color: var(--color-accent);" 
        on:mouseover={() => { this.style.backgroundColor='var(--color-accent-hover)'; }}
        on:focus={() => { this.style.backgroundColor='var(--color-accent-hover)'; }}
        on:mouseout={() => { this.style.backgroundColor='var(--color-accent)'; }}
        on:blur={() => { this.style.backgroundColor='var(--color-accent)'; }}
      >
        <Save size="16" />
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  {/if}
</div>
