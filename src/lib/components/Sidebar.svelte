<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import ContextSummary from './ContextSummary.svelte';
  import FactsManager from './FactsManager.svelte';
  import CardsManager from './CardsManager.svelte';
  import DocsManager from './DocsManager.svelte';
  import EntityCards from './EntityCards.svelte';
  import { Search, X, ToggleLeft, ToggleRight, Info, ChevronsLeft, ChevronsRight } from 'lucide-svelte';
  import InfoPopup from './InfoPopup.svelte';
  import { supabase } from '$lib/supabase.js';

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
  export let search = ''; // Filter content by this search string
  export let isDesktop = false;
  export let user = null; // User object with tier info
  export let userPreferences = { facts_grid_size: 3 }; // User preferences including grid size
  // Desktop collapse button props
  export let showCollapseButton = false;
  export let isCollapsed = false;
  export let onToggleCollapse = null;

  const dispatch = createEventDispatcher();
  
  // Reference to FactsManager component
  let factsManagerComponent;
  
  // Search highlighting state
  let currentSearchTerm = '';
  let highlightedFactId = null;
  let highlightedDocId = null;
  
  // Tab state - exported so parent can control it
  export let activeTab = 'facts'; // 'summary', 'facts', 'docs', or 'entities'
  
  // Tag filtering state
  let selectedTags = [];
  let tagFilterMode = 'AND'; // 'AND' or 'OR'
  
  // Project fact types for filtering
  let projectFactTypes = [];
  
  // Admin check state
  let userIsAdmin = false;
  
  // Load admin status on mount
  onMount(async () => {
    try {
      const response = await fetch('/api/auth/admin', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        userIsAdmin = data.isAdmin || false;
      } else {
        userIsAdmin = false;
      }
      
      // If non-admin user was on entities tab, switch to facts tab
      if (!userIsAdmin && activeTab === 'entities') {
        activeTab = 'facts';
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      userIsAdmin = false;
    }
    
    // Listen for search highlight events
    window.addEventListener('search:highlight-result', handleSearchHighlight);
    
    return () => {
      window.removeEventListener('search:highlight-result', handleSearchHighlight);
    };
  });
  
  // Load project fact types when current project changes
  $: if (current?.id) {
    loadProjectFactTypes();
  }
  
  // Update currentSearchTerm when search prop changes for highlighting
  $: if (search && search.trim()) {
    currentSearchTerm = search.trim();
  } else {
    currentSearchTerm = '';
  }
  
  async function loadProjectFactTypes() {
    if (!current?.id) return;
    
    try {
      const response = await fetch(`/api/projects/${current.id}/fact-types`, {
        credentials: 'include'
      });
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
  
  // Search highlighting methods
  function handleSearchHighlight(event) {
    const { result, searchTerm } = event.detail;
    
    if (result.type === 'facts') {
      highlightFact(result.id, searchTerm);
    } else if (result.type === 'docs') {
      highlightDoc(result.id, searchTerm);
    }
  }
  
  function highlightFact(factId, searchTerm) {
    highlightedFactId = factId;
    currentSearchTerm = searchTerm;
    
    // Switch to facts tab if not already there
    if (activeTab !== 'facts') {
      activeTab = 'facts';
    }
    
    // Scroll to the fact
    setTimeout(() => {
      const factElement = document.querySelector(`[data-fact-id="${factId}"]`);
      if (factElement) {
        factElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        factElement.classList.add('search-highlight-scroll');
        setTimeout(() => {
          factElement.classList.remove('search-highlight-scroll');
        }, 3000);
      }
    }, 100);
  }
  
  function highlightDoc(docId, searchTerm) {
    highlightedDocId = docId;
    currentSearchTerm = searchTerm;
    
    // Switch to docs tab if not already there
    if (activeTab !== 'docs') {
      activeTab = 'docs';
    }
    
    // Scroll to the doc
    setTimeout(() => {
      const docElement = document.querySelector(`[data-doc-id="${docId}"]`);
      if (docElement) {
        docElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        docElement.classList.add('search-highlight-scroll');
        setTimeout(() => {
          docElement.classList.remove('search-highlight-scroll');
        }, 3000);
      }
    }, 100);
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
  
  // Auto-populate selectedTags based on global search (only for 3+ characters)
  $: {
    if (search && search.trim() && search.trim().length >= 3) {
      const searchTerm = search.toLowerCase().trim();
      const matchingTags = availableTags.filter(tag => 
        tag.toLowerCase().includes(searchTerm)
      );
      
      // Also check fact types
      const matchingTypes = projectFactTypes
        .filter(ft => ft.display_name.toLowerCase().includes(searchTerm))
        .map(ft => ft.display_name);
      
      // Set selectedTags to only the matching tags and types (replace, don't accumulate)
      selectedTags = [...matchingTags, ...matchingTypes];
    } else {
      // Clear selected tags when search is less than 3 characters or empty
      selectedTags = [];
    }
  }
  
  // Filter facts/docs based on selected tags and search term
  $: filteredFacts = facts.filter(fact => {
    // First apply search term filter
    const searchTerm = search.toLowerCase().trim();
    const factTypeDisplayName = getFactTypeDisplayName(fact.type);
    const matchesSearch = !searchTerm || 
      fact.key.toLowerCase().includes(searchTerm) ||
      fact.value.toLowerCase().includes(searchTerm) ||
      factTypeDisplayName.toLowerCase().includes(searchTerm) ||
      (fact.tags || []).some(tag => tag.toLowerCase().includes(searchTerm));
    
    
    if (!matchesSearch) return false;
    
    // Then apply tag filters if any
    if (selectedTags.length === 0) return true;
    
    const factTags = fact.tags || [];
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
  }
  
  function removeTagFilter(index) {
    selectedTags = selectedTags.filter((_, i) => i !== index);
  }
  
  function clearAllFilters() {
    selectedTags = [];
  }
  
  function toggleFilterMode() {
    tagFilterMode = tagFilterMode === 'AND' ? 'OR' : 'AND';
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

  // Card-specific event handlers
  function handleFactEdit(event) {
    dispatch('fact-edit', event.detail);
  }

  function handleCardProgressChange(event) {
    dispatch('card-progress-change', event.detail);
  }

  function handleCardRarityChange(event) {
    dispatch('card-rarity-change', event.detail);
  }

  function handleCardSplit(event) {
    dispatch('card-split', event.detail);
  }

  function handleCardMerge(event) {
    dispatch('card-merge', event.detail);
  }

  function handleCardGenerateArt(event) {
    dispatch('card-generate-art', event.detail);
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
  
  // Bulk pin/unpin functions
  function bulkPinFiltered() {
    if (activeTab === 'facts') {
      filteredFacts.forEach(fact => {
        if (!fact.pinned) {
          dispatch('fact-toggle-pin', fact);
        }
      });
    } else if (activeTab === 'docs') {
      filteredDocs.forEach(doc => {
        if (!doc.pinned) {
          dispatch('doc-toggle-pin', doc);
        }
      });
    }
  }
  
  function bulkUnpinFiltered() {
    if (activeTab === 'facts') {
      filteredFacts.forEach(fact => {
        if (fact.pinned) {
          dispatch('fact-toggle-pin', fact);
        }
      });
    } else if (activeTab === 'docs') {
      filteredDocs.forEach(doc => {
        if (doc.pinned) {
          dispatch('doc-toggle-pin', doc);
        }
      });
    }
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

<section class="h-full border-r border-gray-200 dark:border-gray-700 p-2 sm:p-3 flex flex-col mobile-sidebar">
  <div class="flex items-center justify-between mb-1 sm:mb-0">
    <div class="flex items-center gap-2">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Project Context</h2>
	  {#if !isCollapsed}
        <InfoPopup
          title="Project Context"
          content="<p><strong>Project Context</strong> is your AI assistant's memory system for each project.</p><p>It consists of three main components:</p><ul><li><strong>Facts</strong> - Key information about people, places, processes, terms, and things in your project. These help the AI understand your domain.</li><li><strong>Docs</strong> - Longer form documents, notes, and references that provide detailed background information.</li><li><strong>Summary</strong> - An AI-generated overview of your project based on facts and docs.</li></ul><p><strong>Pinning</strong> prioritizes important items for AI context. Use <strong>filtering</strong> to focus on specific topics or tags.</p><p>The AI uses pinned items first, then pulls from the broader context as needed for each conversation.</p>"
          buttonTitle="Learn about Project Context"
        />
      {/if}
    </div>
  </div>

  {#if current}
    <!-- Three-Tab Interface: Summary, Facts, Docs -->
    <div class="flex flex-col min-h-0 flex-1">
      <!-- Selected Tags & Controls (reserve space on all tabs) -->
      <div class="mb-3 space-y-2 transition-all duration-200">
        {#if activeTab !== 'summary' && selectedTags.length > 0}
          <!-- Selected Tags & Controls -->
          <div class="space-y-2">
            <!-- Filter Mode Toggle -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <button
                  on:click={toggleFilterMode}
                  class="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded transition-colors"
                  title={`Currently using ${tagFilterMode} logic`}
                >
                  {#if tagFilterMode === 'AND'}
                    <ToggleRight size="14" class="text-blue-600" />
                    <span class="font-medium" style="color: var(--color-accent);">AND</span>
                  {:else}
                    <ToggleLeft size="14" class="text-green-600" />
                    <span class="font-medium text-green-700">OR</span>
                  {/if}
                </button>
                <span class="text-xs text-gray-500 dark:text-gray-400">
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
            
            <!-- Bulk Pin/Unpin Controls -->
            <div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
              <div class="flex items-center gap-2">
                <button
                  on:click={bulkPinFiltered}
                  class="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors" style="background-color: var(--color-accent-light); color: var(--color-accent);"
                  title="Pin all filtered {activeTab}"
                >
                  📌 Pin all ({activeTab === 'facts' ? filteredFacts.length : filteredDocs.length})
                </button>
                <button
                  on:click={bulkUnpinFiltered}
                  class="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                  title="Unpin all filtered {activeTab}"
                >
                  📍 Unpin all ({activeTab === 'facts' ? filteredFacts.filter(f => f.pinned).length : filteredDocs.filter(d => d.pinned).length})
                </button>
              </div>
              <span class="text-xs text-gray-500 dark:text-gray-400">
                {activeTab === 'facts' 
                  ? `${filteredFacts.filter(f => f.pinned).length} of ${filteredFacts.length} pinned`
                  : `${filteredDocs.filter(d => d.pinned).length} of ${filteredDocs.length} pinned`
                }
              </span>
            </div>
            
            <!-- Tag Breadcrumbs -->
            <div class="flex flex-wrap gap-1">
              {#each selectedTags as tag, index}
                <span class="inline-flex items-center gap-1 text-xs" style="background-color: var(--color-accent-light); color: var(--color-accent); padding-top: 0px !important; padding-bottom: 0px !important; padding-left: 10px !important; padding-right: 2px !important; min-height: 0 !important;">
                  {tag}
                  <button
                    on:click={() => removeTagFilter(index)}
                    class="hover:opacity-80 p-0 m-0 transition-opacity flex items-center justify-center"
                    style="height: 16px !important; width: 16px !important; min-height: 0 !important;"
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
      
      <!-- Tab Headers -->
      <div class="flex border-b border-gray-200 dark:border-gray-600 mb-3">
        <button
          class="px-3 py-1 sm:py-2 font-medium border-b-2 transition-colors"
          style="{
            activeTab === 'facts' 
              ? `border-color: var(--color-accent); color: var(--color-accent); background-color: var(--color-accent-light); font-size: 15px;` 
              : 'border-color: transparent; font-size: 15px;'
          } {activeTab !== 'facts' ? 'color: #6b7280;' : ''}"
          on:click={() => activeTab = 'facts'}
        >
          Facts ({selectedTags.length > 0 ? filteredFacts.length : facts.length})
        </button>
        <button
          class="px-3 py-1 sm:py-2 font-medium border-b-2 transition-colors"
          style="{
            activeTab === 'docs' 
              ? `border-color: var(--color-accent); color: var(--color-accent); background-color: var(--color-accent-light); font-size: 15px;` 
              : 'border-color: transparent; font-size: 15px;'
          } {activeTab !== 'docs' ? 'color: #6b7280;' : ''}"
          on:click={() => activeTab = 'docs'}
        >
          Docs ({selectedTags.length > 0 ? filteredDocs.length : docs.length})
        </button>
        {#if userIsAdmin}
          <button
            class="px-3 py-1 sm:py-2 font-medium border-b-2 transition-colors"
            style="{
              activeTab === 'entities' 
                ? `border-color: var(--color-accent); color: var(--color-accent); background-color: var(--color-accent-light); font-size: 15px;` 
                : 'border-color: transparent; font-size: 15px;'
            } {activeTab !== 'entities' ? 'color: #6b7280;' : ''}"
            on:click={() => activeTab = 'entities'}
          >
            Entities
          </button>
        {/if}
        <button
          class="px-3 py-1 sm:py-2 font-medium border-b-2 transition-colors"
          style="{
            activeTab === 'summary' 
              ? `border-color: var(--color-accent); color: var(--color-accent); background-color: var(--color-accent-light); font-size: 15px;` 
              : 'border-color: transparent; font-size: 15px;'
          } {activeTab !== 'summary' ? 'color: #6b7280;' : ''}"
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
          <CardsManager
            bind:this={factsManagerComponent}
            cards={filteredFacts}
            loadingCards={loadingFacts}
            worldId={current?.id}
            {user}
            bind:showAddCardForm={showAddFactForm}
            searchTerm={currentSearchTerm}
            cardsGridSize={userPreferences.facts_grid_size}
            on:add={handleFactAdd}
            on:edit={handleFactEdit}
            on:delete={handleFactDelete}
            on:toggle-pin={handleFactTogglePin}
            on:progress-change={handleCardProgressChange}
            on:rarity-change={handleCardRarityChange}
            on:split={handleCardSplit}
            on:merge={handleCardMerge}
            on:generate-art={handleCardGenerateArt}
          />
        {:else if activeTab === 'docs'}
          <DocsManager
            docs={filteredDocs}
            loadingDocs={loadingFacts}
            projectId={current?.id}
            {user}
            bind:showAddDocForm
            bind:docTitle
            bind:docContent
            bind:docTags
            searchTerm={currentSearchTerm}
            factsGridSize={userPreferences.facts_grid_size}
            on:add={handleDocAdd}
            on:cancel-add={handleDocCancelAdd}
            on:start-edit={handleDocStartEdit}
            on:cancel-edit={handleDocCancelEdit}
            on:save-edit={handleDocSaveEdit}
            on:delete={handleDocDelete}
            on:toggle-pin={handleDocTogglePin}
            on:tag-click={handleTagClick}
          />
        {:else if activeTab === 'entities'}
          <EntityCards 
            projectId={current?.id}
            facts={facts}
            on:cards-generated={() => {
              // Optionally reload facts or do other updates when cards are generated
            }}
          />
        {/if}
      </div>
    </div>
  {:else}
    <p class="text-gray-600 dark:text-gray-400">Select a project</p>
  {/if}
</section>
