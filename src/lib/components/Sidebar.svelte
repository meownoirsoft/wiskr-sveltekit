<script>
  import { createEventDispatcher } from 'svelte';
  import ContextSummary from './ContextSummary.svelte';
  import FactsManager from './FactsManager.svelte';
  import DocsManager from './DocsManager.svelte';
  import { Search, X, ToggleLeft, ToggleRight } from 'lucide-svelte';

  export let current = null;
  export let facts = [];
  export let docs = [];
  export let loadingFacts = false;
  export let showAddFactForm = false;
  export let factType = 'character';
  export let factKey = '';
  export let factValue = '';
  export let factTags = '';
  export let showAddDocForm = false;
  export let docTitle = '';
  export let docContent = '';
  export let docTags = '';
  export let search = ''; // Search term from global search

  const dispatch = createEventDispatcher();
  
  // Reference to FactsManager component
  let factsManagerComponent;
  
  // Tab state - exported so parent can control it
  export let activeTab = 'facts'; // 'summary', 'facts', or 'docs'
  
  // Tag filtering state
  let tagSearch = '';
  let selectedTags = [];
  let tagFilterMode = 'AND'; // 'AND' or 'OR'
  let showTagAutocomplete = false;
  let tagSearchInput;
  
  // Project fact types for filtering
  let projectFactTypes = [];
  
  // Load project fact types when current project changes
  $: if (current?.id) {
    loadProjectFactTypes();
  }
  
  async function loadProjectFactTypes() {
    if (!current?.id) return;
    
    try {
      const response = await fetch(`/api/projects/${current.id}/fact-types`);
      const data = await response.json();
      
      if (response.ok) {
        projectFactTypes = data.factTypes || [];
      } else {
        console.error('Failed to load fact types:', data.error);
        projectFactTypes = getDefaultFactTypes();
      }
    } catch (error) {
      console.error('Error loading fact types:', error);
      projectFactTypes = getDefaultFactTypes();
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
  
  // Helper function to get fact type display name
  function getFactTypeDisplayName(type) {
    const projectType = projectFactTypes.find(ft => ft.type_key === type);
    return projectType ? projectType.display_name : type;
  }
  
  // Get all available tags for current tab
  $: availableTags = activeTab === 'facts' 
    ? [...new Set(facts.flatMap(f => f.tags || []))].sort()
    : activeTab === 'docs'
    ? [...new Set(docs.flatMap(d => d.tags || []))].sort()
    : [];
  
  // Filter suggestions based on search and exclude already selected tags
  $: tagSuggestions = availableTags
    .filter(tag => 
      tag.toLowerCase().includes(tagSearch.toLowerCase()) && 
      !selectedTags.includes(tag)
    )
    .slice(0, 10);
  
  // Filter facts/docs based on selected tags and search term
  $: filteredFacts = facts.filter(fact => {
    // First apply search term filter
    const searchTerm = search.toLowerCase().trim();
    const matchesSearch = !searchTerm || 
      fact.key.toLowerCase().includes(searchTerm) ||
      fact.value.toLowerCase().includes(searchTerm) ||
      (fact.tags || []).some(tag => tag.toLowerCase().includes(searchTerm));
    
    if (!matchesSearch) return false;
    
    // Then apply tag filters if any
    if (selectedTags.length === 0) return true;
    
    const factTags = fact.tags || [];
    const factTypeDisplayName = getFactTypeDisplayName(fact.type);
    // Combine regular tags with the fact type display name for filtering
    const allFilterableItems = [...factTags, factTypeDisplayName];
    
    if (tagFilterMode === 'AND') {
      return selectedTags.every(tag => allFilterableItems.includes(tag));
    } else {
      return selectedTags.some(tag => allFilterableItems.includes(tag));
    }
  });
  
  $: filteredDocs = docs.filter(doc => {
    // First apply search term filter
    const searchTerm = search.toLowerCase().trim();
    const matchesSearch = !searchTerm || 
      doc.title.toLowerCase().includes(searchTerm) ||
      (doc.content || '').toLowerCase().includes(searchTerm) ||
      (doc.tags || []).some(tag => tag.toLowerCase().includes(searchTerm));
    
    if (!matchesSearch) return false;
    
    // Then apply tag filters if any
    if (selectedTags.length === 0) return true;
    
    const docTags = doc.tags || [];
    if (tagFilterMode === 'AND') {
      return selectedTags.every(tag => docTags.includes(tag));
    } else {
      return selectedTags.some(tag => docTags.includes(tag));
    }
  });
  
  function addTagFilter(tag) {
    if (!selectedTags.includes(tag)) {
      selectedTags = [...selectedTags, tag];
    }
    tagSearch = '';
    showTagAutocomplete = false;
  }
  
  function removeTagFilter(index) {
    selectedTags = selectedTags.filter((_, i) => i !== index);
  }
  
  function clearAllFilters() {
    selectedTags = [];
    tagSearch = '';
  }
  
  function toggleFilterMode() {
    tagFilterMode = tagFilterMode === 'AND' ? 'OR' : 'AND';
  }
  
  function handleTagSearchKeydown(event) {
    if (event.key === 'Enter' && tagSuggestions.length > 0) {
      event.preventDefault();
      addTagFilter(tagSuggestions[0]);
    } else if (event.key === 'Escape') {
      showTagAutocomplete = false;
      tagSearch = '';
    }
  }
  
  function handleTagClick(event) {
    addTagFilter(event.detail);
  }
  
  function handleTypeClick(event) {
    addTagFilter(event.detail);
  }

  // Context summary events
  function handleBriefRegenerate() {
    dispatch('brief-regenerate');
  }

  // Facts manager events
  function handleFactAdd(event) {
    dispatch('fact-add', event.detail);
  }

  function handleFactCancelAdd() {
    dispatch('fact-cancel-add');
  }

  function handleFactStartEdit(event) {
    dispatch('fact-start-edit', event.detail);
  }

  function handleFactCancelEdit(event) {
    dispatch('fact-cancel-edit', event.detail);
  }

  function handleFactSaveEdit(event) {
    dispatch('fact-save-edit', event.detail);
  }

  function handleFactDelete(event) {
    dispatch('fact-delete', event.detail);
  }

  function handleFactTogglePin(event) {
    dispatch('fact-toggle-pin', event.detail);
  }

  // Docs manager events
  function handleDocAdd(event) {
    dispatch('doc-add', event.detail);
  }

  function handleDocCancelAdd() {
    dispatch('doc-cancel-add');
  }

  function handleDocStartEdit(event) {
    dispatch('doc-start-edit', event.detail);
  }

  function handleDocCancelEdit(event) {
    dispatch('doc-cancel-edit', event.detail);
  }

  function handleDocSaveEdit(event) {
    dispatch('doc-save-edit', event.detail);
  }

  function handleDocDelete(event) {
    dispatch('doc-delete', event.detail);
  }

  function handleDocTogglePin(event) {
    dispatch('doc-toggle-pin', event.detail);
  }
  
  // Export function to refresh fact types from parent component
  export function refreshFactTypes() {
    // Refresh fact types in both the Sidebar and FactsManager
    loadProjectFactTypes();
    if (factsManagerComponent) {
      factsManagerComponent.refreshFactTypes();
    }
  }
</script>

<section class="h-full border-r p-3 bg-gray-50 flex flex-col mobile-sidebar">
  <h2 class="text-lg font-semibold mb-4">Project Context</h2>

  {#if current}
    <!-- Three-Tab Interface: Summary, Facts, Docs -->
    <div class="flex flex-col min-h-0 flex-1">
      <!-- Tag Search Bar (only show for facts/docs tabs) -->
      {#if activeTab !== 'summary'}
        <div class="mb-3 space-y-2">
          <!-- Search Input -->
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size="16" class="text-gray-400" />
            </div>
            <input
              bind:this={tagSearchInput}
              bind:value={tagSearch}
              on:keydown={handleTagSearchKeydown}
              on:focus={() => showTagAutocomplete = true}
              on:blur={() => setTimeout(() => showTagAutocomplete = false, 200)}
              class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search tags..."
            />
            
            <!-- Autocomplete Dropdown -->
            {#if showTagAutocomplete && tagSuggestions.length > 0}
              <div class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-32 overflow-y-auto">
                {#each tagSuggestions as suggestion}
                  <button
                    class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    on:mousedown|preventDefault={() => addTagFilter(suggestion)}
                  >
                    {suggestion}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
          
          <!-- Selected Tags & Controls -->
          {#if selectedTags.length > 0}
            <div class="space-y-2">
              <!-- Filter Mode Toggle -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <button
                    on:click={toggleFilterMode}
                    class="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    title={`Currently using ${tagFilterMode} logic`}
                  >
                    {#if tagFilterMode === 'AND'}
                      <ToggleRight size="14" class="text-blue-600" />
                      <span class="font-medium text-blue-700">AND</span>
                    {:else}
                      <ToggleLeft size="14" class="text-green-600" />
                      <span class="font-medium text-green-700">OR</span>
                    {/if}
                  </button>
                  <span class="text-xs text-gray-500">
                    {tagFilterMode === 'AND' ? 'All tags required' : 'Any tag matches'}
                  </span>
                </div>
                <button
                  on:click={clearAllFilters}
                  class="text-xs text-red-600 hover:text-red-700 px-2 py-1 hover:bg-red-50 rounded transition-colors"
                >
                  Clear all
                </button>
              </div>
              
              <!-- Tag Breadcrumbs -->
              <div class="flex flex-wrap gap-1">
                {#each selectedTags as tag, index}
                  <span class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    {tag}
                    <button
                      on:click={() => removeTagFilter(index)}
                      class="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                      title="Remove tag"
                    >
                      <X size="12" />
                    </button>
                  </span>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}
      
      <!-- Tab Headers -->
      <div class="flex border-b mb-3">
        <button
          class="px-3 py-2 font-medium text-sm border-b-2 transition-colors {
            activeTab === 'facts' 
              ? 'border-blue-500 text-blue-600 bg-blue-50' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }"
          on:click={() => activeTab = 'facts'}
        >
          Facts ({selectedTags.length > 0 ? filteredFacts.length : facts.length})
        </button>
        <button
          class="px-3 py-2 font-medium text-sm border-b-2 transition-colors {
            activeTab === 'docs' 
              ? 'border-blue-500 text-blue-600 bg-blue-50' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }"
          on:click={() => activeTab = 'docs'}
        >
          Docs ({selectedTags.length > 0 ? filteredDocs.length : docs.length})
        </button>
        <button
          class="px-3 py-2 font-medium text-sm border-b-2 transition-colors {
            activeTab === 'summary' 
              ? 'border-blue-500 text-blue-600 bg-blue-50' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }"
          on:click={() => activeTab = 'summary'}
        >
          Summary
        </button>
      </div>
      
      <!-- Tab Content -->
      <div class="flex-1 min-h-0 overflow-auto">
        {#if activeTab === 'summary'}
          <ContextSummary 
            {current}
            on:regenerate={handleBriefRegenerate}
          />
        {:else if activeTab === 'facts'}
          <FactsManager
            bind:this={factsManagerComponent}
            facts={filteredFacts}
            {loadingFacts}
            projectId={current?.id}
            bind:showAddFactForm
            bind:factType
            bind:factKey
            bind:factValue
            bind:factTags
            on:add={handleFactAdd}
            on:cancel-add={handleFactCancelAdd}
            on:start-edit={handleFactStartEdit}
            on:cancel-edit={handleFactCancelEdit}
            on:save-edit={handleFactSaveEdit}
            on:delete={handleFactDelete}
            on:toggle-pin={handleFactTogglePin}
            on:tag-click={handleTagClick}
            on:type-click={handleTypeClick}
          />
        {:else if activeTab === 'docs'}
          <DocsManager
            docs={filteredDocs}
            bind:showAddDocForm
            bind:docTitle
            bind:docContent
            bind:docTags
            on:add={handleDocAdd}
            on:cancel-add={handleDocCancelAdd}
            on:start-edit={handleDocStartEdit}
            on:cancel-edit={handleDocCancelEdit}
            on:save-edit={handleDocSaveEdit}
            on:delete={handleDocDelete}
            on:toggle-pin={handleDocTogglePin}
            on:tag-click={handleTagClick}
          />
        {/if}
      </div>
    </div>
  {:else}
    <p>Select a project</p>
  {/if}
</section>
