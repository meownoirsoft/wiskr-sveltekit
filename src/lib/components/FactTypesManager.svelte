<script>
  import { onMount } from 'svelte';
  import { Plus, Trash2, GripVertical, Save, X } from 'lucide-svelte';
  import FeatureGate from './FeatureGate.svelte';
  
  export let projectId;
  export let user = null; // User object with tier info
  
  let factTypes = [];
  let loading = false;
  let saving = false;
  let showAddForm = false;
  let newFactType = { type_key: '', display_name: '', color_class: 'bg-blue-100 text-blue-700' };
  
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
    loadFactTypes();
  });
  
  async function loadFactTypes() {
    if (!projectId) return;
    
    loading = true;
    try {
      const response = await fetch(`/api/projects/${projectId}/fact-types`);
      const data = await response.json();
      
      if (response.ok) {
        factTypes = data.factTypes || [];
        // If no custom fact types exist, populate with defaults for editing
        if (factTypes.length === 0) {
          factTypes = getDefaultFactTypes();
          console.log('No custom fact types found, populating with defaults for customization');
        }
      } else {
        console.error('Failed to load fact types:', data.error);
        // Initialize with default types if API fails
        factTypes = getDefaultFactTypes();
      }
    } catch (error) {
      console.error('Error loading fact types:', error);
      factTypes = getDefaultFactTypes();
    } finally {
      loading = false;
    }
  }
  
  function getDefaultFactTypes() {
    return [
      { type_key: 'person', display_name: 'person', color_class: 'bg-blue-100 text-blue-700', sort_order: 1 },
      { type_key: 'place', display_name: 'place', color_class: 'bg-green-100 text-green-700', sort_order: 2 },
      { type_key: 'process', display_name: 'process', color_class: 'bg-purple-100 text-purple-700', sort_order: 3 },
      { type_key: 'term', display_name: 'term', color_class: 'bg-orange-100 text-orange-700', sort_order: 4 },
      { type_key: 'thing', display_name: 'thing', color_class: 'bg-red-100 text-red-700', sort_order: 5 }
    ];
  }
  
  async function saveFactTypes() {
    if (!projectId) return;
    
    saving = true;
    try {
      // Update sort orders based on current array position
      const updatedFactTypes = factTypes.map((ft, index) => ({
        ...ft,
        sort_order: index + 1
      }));
      
      const response = await fetch(`/api/projects/${projectId}/fact-types`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ factTypes: updatedFactTypes })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        factTypes = data.factTypes;
        // Show success message (you could add a toast notification here)
        console.log('Fact types saved successfully');
      } else {
        console.error('Failed to save fact types:', data.error);
        alert('Failed to save fact types: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving fact types:', error);
      alert('Error saving fact types');
    } finally {
      saving = false;
    }
  }
  
  function addFactType() {
    if (!newFactType.type_key.trim() || !newFactType.display_name.trim()) {
      alert('Please fill in both the key and display name');
      return;
    }
    
    // Check for duplicate keys
    if (factTypes.some(ft => ft.type_key === newFactType.type_key.trim())) {
      alert('A fact type with this key already exists');
      return;
    }
    
    const factType = {
      type_key: newFactType.type_key.trim().toLowerCase().replace(/\s+/g, '_'),
      display_name: newFactType.display_name.trim(),
      color_class: newFactType.color_class,
      sort_order: factTypes.length + 1
    };
    
    factTypes = [...factTypes, factType];
    
    // Reset form
    newFactType = { type_key: '', display_name: '', color_class: 'bg-blue-100 text-blue-700' };
    showAddForm = false;
  }
  
  function removeFactType(index) {
    if (confirm('Are you sure you want to remove this fact type? This action cannot be undone.')) {
      factTypes = factTypes.filter((_, i) => i !== index);
    }
  }
  
  function moveUp(index) {
    if (index > 0) {
      const temp = factTypes[index];
      factTypes[index] = factTypes[index - 1];
      factTypes[index - 1] = temp;
      factTypes = [...factTypes]; // Trigger reactivity
    }
  }
  
  function moveDown(index) {
    if (index < factTypes.length - 1) {
      const temp = factTypes[index];
      factTypes[index] = factTypes[index + 1];
      factTypes[index + 1] = temp;
      factTypes = [...factTypes]; // Trigger reactivity
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
  
  // Hover handlers for the "Add Custom Fact Type" button
  function handleHover(event) {
    event.target.style.backgroundColor = 'var(--color-accent-light)';
  }
  
  function handleLeave(event) {
    event.target.style.backgroundColor = 'transparent';
  }
</script>

<div class="space-y-3 min-h-[400px]">
  {#if loading}
    <div class="text-center py-6">
      <div class="text-gray-500">Loading fact types...</div>
    </div>
  {:else}
    <!-- Field Labels -->
    <div class="flex items-center gap-4 px-1 pb-0.5">
      <div class="cursor-move text-gray-400 dark:text-gray-500 w-5"></div>
      <div class="w-96">
        <label class="text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide" for="fact-type-name">Name</label>
      </div>
      <div class="w-32">
        <label class="text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide" for="fact-type-color">Color</label>
      </div>
      <div class="w-32">
        <label class="text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide ml-0" for="fact-type-preview">Preview</label>
      </div>
      <div class="flex-1"></div>
    </div>

    <!-- Current Fact Types -->
    <FeatureGate
      featureKey="custom-fact-types"
      {user}
      requiredTier={1}
      let:hasAccess
    >
      <div class="space-y-0.5">
        {#each factTypes as factType, index}
          <div class="flex items-center gap-4 px-1 py-0.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
            <!-- Drag Handle -->
            <div class="cursor-move text-gray-400 dark:text-gray-500 w-5">
              {#if hasAccess}
                <GripVertical size="20" />
              {:else}
                <div class="w-5 h-5 bg-gray-200 dark:bg-gray-600 rounded"></div>
              {/if}
            </div>
            
            <!-- Display Name -->
            <div class="w-96">
              {#if hasAccess}
                <input
                  type="text"
                  bind:value={factType.display_name}
                  class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded focus:outline-none focus:ring-2" style="--tw-ring-color: var(--color-accent);" 
                  on:focus={() => {this.style.borderColor='var(--color-accent)'; this.style.boxShadow='0 0 0 2px var(--color-accent-light)';}} 
                  on:blur={() => {this.style.borderColor=''; this.style.boxShadow='';}}
                  placeholder="Fact type name"
                />
              {:else}
                <input
                  type="text"
                  value={factType.display_name}
                  disabled
                  class="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded cursor-not-allowed"
                  placeholder="Fact type name"
                />
              {/if}
            </div>
            
            <!-- Color Selector -->
            <div class="w-32">
              {#if hasAccess}
                <select
                  bind:value={factType.color_class}
                  class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-2" style="--tw-ring-color: var(--color-accent);" 
                  on:focus={() => {this.style.borderColor='var(--color-accent)'; this.style.boxShadow='0 0 0 2px var(--color-accent-light)';}} 
                  on:blur={() => {this.style.borderColor=''; this.style.boxShadow='';}}
                >
                  {#each colorOptions as color}
                    <option value={color.class}>{color.name}</option>
                  {/each}
                </select>
              {:else}
                <select
                  value={factType.color_class}
                  disabled
                  class="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded cursor-not-allowed"
                >
                  <option value={factType.color_class}>{colorOptions.find(c => c.class === factType.color_class)?.name || 'Color'}</option>
                </select>
              {/if}
            </div>
            
            <!-- Preview -->
            <div class="w-32 flex justify-start">
              <span class="text-xs px-2 py-1 rounded-full font-medium {factType.color_class}">
                {factType.display_name}
              </span>
            </div>
            
            <!-- Actions on the right -->
            <div class="flex-1 flex items-center justify-end gap-2">
              {#if hasAccess}
                <!-- Move buttons -->
                <div class="flex flex-col gap-0.5 items-center">
                  <button
                    on:click={() => moveUp(index)}
                    disabled={index === 0}
                    class="p-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    on:click={() => moveDown(index)}
                    disabled={index === factTypes.length - 1}
                    class="p-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    ↓
                  </button>
                </div>
                
                <!-- Remove Button -->
                <button
                  on:click={() => removeFactType(index)}
                  class="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded cursor-pointer"
                  title="Remove fact type"
                >
                  <Trash2 size="16" />
                </button>
              {:else}
                <!-- Disabled buttons -->
                <div class="flex flex-col gap-0.5 items-center">
                  <button
                    disabled
                    class="p-0.5 text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50"
                    title="Move up (Pro feature)"
                  >
                    ↑
                  </button>
                  <button
                    disabled
                    class="p-0.5 text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50"
                    title="Move down (Pro feature)"
                  >
                    ↓
                  </button>
                </div>
                
                <!-- Disabled Remove Button -->
                <button
                  disabled
                  class="p-1 text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50"
                  title="Remove fact type (Pro feature)"
                >
                  <Trash2 size="16" />
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </FeatureGate>
    
    <!-- Add New Fact Type -->
    <div class="border-t border-gray-200 dark:border-gray-700 pt-2">
      <FeatureGate
        featureKey="custom-fact-types"
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
            Add Custom Fact Type
          </button>
        {:else if hasAccess && showAddForm}
          <div class="p-3 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-800">
            <h3 class="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">Add New Fact Type</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="fact-type-key">Type Key</label>
                <input
                  type="text"
                  bind:value={newFactType.type_key}
                  class="w-full px-2 py-1.5 text-sm font-mono border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded focus:outline-none focus:ring-2" 
                  style="--tw-ring-color: var(--color-accent);" 
                  on:focus={() => { this.style.borderColor='var(--color-accent)'; this.style.boxShadow='0 0 0 2px var(--color-accent-light)'; }} 
                  on:blur={() => { this.style.borderColor=''; this.style.boxShadow=''; }}
                  placeholder="e.g., organization"
                />
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Lowercase, no spaces (used internally)</p>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="fact-type-display-name">Display Name</label>
                <input
                  type="text"
                  bind:value={newFactType.display_name}
                  class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded focus:outline-none focus:ring-2" 
                  style="--tw-ring-color: var(--color-accent);" 
                  on:focus={() => { this.style.borderColor='var(--color-accent)'; this.style.boxShadow='0 0 0 2px var(--color-accent-light)'; }} 
                  on:blur={() => { this.style.borderColor=''; this.style.boxShadow=''; }}
                  placeholder="e.g., Organization"
                />
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">What users will see</p>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="fact-type-color">Color</label>
                <select
                  bind:value={newFactType.color_class}
                  class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-2" 
                  style="--tw-ring-color: var(--color-accent);" 
                  on:focus={() => { this.style.borderColor='var(--color-accent)'; this.style.boxShadow='0 0 0 2px var(--color-accent-light)'; }} 
                  on:blur={() => { this.style.borderColor=''; this.style.boxShadow=''; }}
                >
                  {#each colorOptions as color}
                    <option value={color.class}>{color.name}</option>
                  {/each}
                </select>
              </div>
            </div>
            
            <div class="flex items-center gap-2">
              <button
                on:click={addFactType}
                class="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer"
              >
                <Save size="16" />
                Add Fact Type
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
            Add Custom Fact Type
          </button>
        {/if}
      </FeatureGate>
    </div>
    
    <!-- Save Button -->
    <div class="flex justify-end pt-3 border-t">
      <button
        on:click={saveFactTypes}
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
