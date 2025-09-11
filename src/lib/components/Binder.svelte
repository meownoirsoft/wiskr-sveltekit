<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import ContextSummary from './ContextSummary.svelte';
  import CardsManager from './CardsManager.svelte';
  import DocsManager from './DocsManager.svelte';
  import EntityCards from './EntityCards.svelte';
  import { Search, X, ToggleLeft, ToggleRight, Info, ChevronsLeft, ChevronsRight } from 'lucide-svelte';
  import InfoPopup from './InfoPopup.svelte';
  import { supabase } from '$lib/supabase.js';

  export let current = null;
  export let cards = [];
  export let docs = [];
  export let loadingCards = false;
  export let showAddCardForm = false;
  export let cardType = 'character';
  export let cardTitle = '';
  export let cardContent = '';
  export let cardTags = '';
  export let showAddDocForm = false;
  export let docTitle = '';
  export let docContent = '';
  export let docTags = '';
  export let search = ''; // Filter content by this search string
  export let isDesktop = false;
  export let user = null; // User object with tier info
  export let userPreferences = { cards_grid_size: 3 }; // User preferences including grid size
  // Desktop collapse button props
  export let showCollapseButton = false;
  export let isCollapsed = false;
  export let onToggleCollapse = null;

  const dispatch = createEventDispatcher();
  
  // Reference to CardsManager component
  let cardsManagerComponent;
  
  // Search highlighting state
  let currentSearchTerm = '';
  let highlightedCardId = null;
  let highlightedDocId = null;
  
  // Tab state - exported so parent can control it
  export let activeTab = 'cards'; // 'summary', 'cards', 'docs', or 'entities'
  
  // Tag filtering state
  let selectedTags = [];
  let tagFilterMode = 'AND'; // 'AND' or 'OR'
  
  // Sorting state
  let sortBy = 'title'; // 'title', 'rarity', 'progress', 'mana_cost', 'created_at'
  let sortOrder = 'asc'; // 'asc' or 'desc'
  
  // Project card types for filtering
  let projectCardTypes = [];
  
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
      
      // If non-admin user was on entities tab, switch to cards tab
      if (!userIsAdmin && activeTab === 'entities') {
        activeTab = 'cards';
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
  
  // Load project card types when current project changes
  $: if (current?.id) {
    loadProjectCardTypes();
  }
  
  // Update currentSearchTerm when search prop changes for highlighting
  $: if (search && search.trim()) {
    currentSearchTerm = search.trim();
  } else {
    currentSearchTerm = '';
  }
  
  async function loadProjectCardTypes() {
    if (!current?.id) return;
    
    try {
      const response = await fetch(`/api/projects/${current.id}/card-types`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (response.ok) {
        projectCardTypes = data.cardTypes || [];
      } else {
        console.error('Failed to load card types:', data.error);
        projectCardTypes = getDefaultCardTypes();
      }
    } catch (error) {
      console.error('Error loading card types:', error);
      projectCardTypes = getDefaultCardTypes();
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
  
  // Search highlighting methods
  function handleSearchHighlight(event) {
    const { result, searchTerm } = event.detail;
    
    if (result.type === 'cards') {
      highlightCard(result.id, searchTerm);
    } else if (result.type === 'docs') {
      highlightDoc(result.id, searchTerm);
    }
  }
  
  function highlightCard(cardId, searchTerm) {
    highlightedCardId = cardId;
    currentSearchTerm = searchTerm;
    
    // Switch to cards tab if not already there
    if (activeTab !== 'cards') {
      activeTab = 'cards';
    }
    
    // Scroll to the card
    setTimeout(() => {
      const cardElement = document.querySelector(`[data-card-id="${cardId}"]`);
      if (cardElement) {
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        cardElement.classList.add('search-highlight-scroll');
        setTimeout(() => {
          cardElement.classList.remove('search-highlight-scroll');
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
  
  // Helper function to get card type display name
  function getCardTypeDisplayName(type) {
    const projectType = projectCardTypes.find(ft => ft.type_key === type);
    return projectType ? projectType.display_name : type;
  }
  
  // Get all available tags for current tab
  $: availableTags = activeTab === 'cards' 
    ? [...new Set(cards.flatMap(card => card.tags || []))].sort()
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
      
      // Also check card types
      const matchingTypes = projectCardTypes
        .filter(ft => ft.display_name.toLowerCase().includes(searchTerm))
        .map(ft => ft.display_name);
      
      // Set selectedTags to only the matching tags and types (replace, don't accumulate)
      selectedTags = [...matchingTags, ...matchingTypes];
    } else {
      // Clear selected tags when search is less than 3 characters or empty
      selectedTags = [];
    }
  }
  
  // Filter cards/docs based on selected tags and search term
  $: filteredCards = cards.filter(card => {
    // First apply search term filter
    const searchTerm = search.toLowerCase().trim();
    const cardTypeDisplayName = getCardTypeDisplayName(card.type);
    const matchesSearch = !searchTerm || 
      card.title.toLowerCase().includes(searchTerm) ||
      card.content.toLowerCase().includes(searchTerm) ||
      cardTypeDisplayName.toLowerCase().includes(searchTerm) ||
      (card.tags || []).some(tag => tag.toLowerCase().includes(searchTerm));
    
    
    if (!matchesSearch) return false;
    
    // Then apply tag filters if any
    if (selectedTags.length === 0) return true;
    
    const cardTags = card.tags || [];
    // Combine regular tags with the card type display name for filtering
    const allFilterableItems = [...cardTags, cardTypeDisplayName];
    
    if (tagFilterMode === 'AND') {
      return selectedTags.every(tag => allFilterableItems.includes(tag));
    } else {
      return selectedTags.some(tag => allFilterableItems.includes(tag));
    }
  });
  
  // Sort the filtered cards when sortBy or sortOrder changes, but only when not loading
  $: sortedCards = loadingCards ? filteredCards : [...filteredCards].sort((a, b) => {
    // Apply sorting
    let aValue, bValue;
    
    switch (sortBy) {
      case 'title':
        aValue = a.title?.toLowerCase() || '';
        bValue = b.title?.toLowerCase() || '';
        break;
      case 'rarity':
        const rarityOrder = { 'common': 1, 'special': 2, 'rare': 3, 'legendary': 4 };
        aValue = rarityOrder[a.rarity] || 0;
        bValue = rarityOrder[b.rarity] || 0;
        break;
      case 'progress':
        aValue = a.progress || 0;
        bValue = b.progress || 0;
        break;
      case 'mana_cost':
        aValue = a.mana_cost || 0;
        bValue = b.mana_cost || 0;
        break;
      case 'created_at':
      default:
        aValue = new Date(a.created_at || 0);
        bValue = new Date(b.created_at || 0);
        break;
    }
    
    if (sortBy === 'title') {
      // String comparison
      return sortOrder === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    } else {
      // Numeric/date comparison
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      
      // If values are equal (especially for dates), sort by title as secondary sort
      if (sortBy === 'created_at' && aValue.getTime() === bValue.getTime()) {
        const aTitle = (a.title || '').toLowerCase();
        const bTitle = (b.title || '').toLowerCase();
        return aTitle.localeCompare(bTitle);
      }
      
      return 0;
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

  // Cards manager events
  function handleCardAdd(event) {
    dispatch('card-add', event.detail);
  }

  function handleCardCancelAdd() {
    dispatch('card-cancel-add');
  }

  function handleCardStartEdit(event) {
    dispatch('card-start-edit', event.detail);
  }

  function handleCardCancelEdit(event) {
    dispatch('card-cancel-edit', event.detail);
  }

  function handleCardSaveEdit(event) {
    dispatch('card-save-edit', event.detail);
  }

  function handleCardDelete(event) {
    dispatch('card-delete', event.detail);
  }

  function handleCardTogglePin(event) {
    dispatch('card-toggle-pin', event.detail);
  }

  // Card-specific event handlers from CardsManager
  function handleCardEdit(event) {
    // This handles both edit modal opening and zoom view saves
    const { card, updates } = event.detail;
    
    if (updates) {
      // This is a save event from zoom view - forward to save handler
      console.log('Card save event received from zoom view:', event.detail);
      dispatch('card-save-edit', { card, editData: updates });
    } else {
      // This is an edit modal opening event
      console.log('Card edit modal event received:', event.detail);
      dispatch('card-start-edit', event.detail);
    }
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

  function handlePackComplete(event) {
    // Reload cards to include the new pack cards
    dispatch('reload-context');
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
    if (activeTab === 'cards') {
      filteredCards.forEach(card => {
        if (!card.pinned) {
          dispatch('card-toggle-pin', card);
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
    if (activeTab === 'cards') {
      filteredCards.forEach(card => {
        if (card.pinned) {
          dispatch('card-toggle-pin', card);
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
  
  // Export function to refresh card types from parent component
  export function refreshCardTypes() {
    // Refresh card types in the Binder
    loadProjectCardTypes();
    // Note: CardsManager doesn't need card type refresh since it uses cards table
  }
</script>

<section class="h-full border-r border-gray-200 dark:border-gray-700 p-2 sm:p-3 flex flex-col mobile-sidebar">

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
                  title="Pin all filtered {activeTab === 'cards' ? 'cards' : activeTab}"
                >
                  📌 Pin all ({activeTab === 'cards' ? filteredCards.length : filteredDocs.length})
                </button>
                <button
                  on:click={bulkUnpinFiltered}
                  class="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                  title="Unpin all filtered {activeTab === 'cards' ? 'cards' : activeTab}"
                >
                  📍 Unpin all ({activeTab === 'cards' ? sortedCards.filter(card => card.pinned).length : filteredDocs.filter(d => d.pinned).length})
                </button>
              </div>
              <span class="text-xs text-gray-500 dark:text-gray-400">
                {activeTab === 'cards' 
                  ? `${sortedCards.filter(card => card.pinned).length} of ${sortedCards.length} pinned`
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
      
      <!-- Tab Headers - Hidden for Cards UI -->
      <!-- <div class="flex border-b border-gray-200 dark:border-gray-600 mb-3">
        <button
          class="px-3 py-1 sm:py-2 font-medium border-b-2 transition-colors"
          style="{
            activeTab === 'cards' 
              ? `border-color: var(--color-accent); color: var(--color-accent); background-color: var(--color-accent-light); font-size: 15px;` 
              : 'border-color: transparent; font-size: 15px;'
          } {activeTab !== 'cards' ? 'color: #6b7280;' : ''}"
          on:click={() => activeTab = 'cards'}
        >
          Cards ({selectedTags.length > 0 ? filteredCards.length : cards.length})
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
      </div> -->
      
      <!-- Tab Content -->
      <div class="flex-1 min-h-0 overflow-auto">
        {#if activeTab === 'summary'}
          <ContextSummary 
            {current}
            on:regenerate={handleBriefRegenerate}
          />
        {:else if activeTab === 'cards'}
          <CardsManager
            bind:this={cardsManagerComponent}
            cards={sortedCards}
            loadingCards={loadingCards}
            worldId={current?.id}
            {user}
            {userPreferences}
            bind:showAddCardForm={showAddCardForm}
            searchTerm={currentSearchTerm}
            cardsGridSize={userPreferences.cards_grid_size}
            on:add={handleCardAdd}
            on:edit={handleCardEdit}
            on:delete={handleCardDelete}
            on:toggle-pin={handleCardTogglePin}
            on:progress-change={handleCardProgressChange}
            on:rarity-change={handleCardRarityChange}
            on:split={handleCardSplit}
            on:merge={handleCardMerge}
            on:generate-art={handleCardGenerateArt}
            on:pack-complete={handlePackComplete}
          />
        {:else if activeTab === 'docs'}
          <DocsManager
            docs={filteredDocs}
            loadingDocs={loadingCards}
            projectId={current?.id}
            {user}
            bind:showAddDocForm
            bind:docTitle
            bind:docContent
            bind:docTags
            searchTerm={currentSearchTerm}
            cardsGridSize={userPreferences.cards_grid_size}
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
            cards={cards}
            on:cards-generated={() => {
              // Optionally reload cards or do other updates when cards are generated
            }}
          />
        {/if}
      </div>
    </div>
  {:else}
    <p class="text-gray-600 dark:text-gray-400">Select a project</p>
  {/if}
</section>
