<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import ContextSummary from './ContextSummary.svelte';
  import CardsManager from './CardsManager.svelte';
  import DocsManager from './DocsManager.svelte';
  import EntityCards from './EntityCards.svelte';
  import { Search, X, Info, ChevronsLeft, ChevronsRight } from 'lucide-svelte';
  import InfoPopup from './InfoPopup.svelte';
  import { supabase } from '$lib/supabase.js';

  export let current = null;
  export let cards = [];
  export let loadingCards = false;
  export let showAddCardForm = false;
  export let cardType = 'character';
  export let cardTitle = '';
  export let cardContent = '';
  export let cardTags = '';
  export let search = ''; // Filter content by this search string
  export let isDesktop = false;
  export let user = null; // User object with tier info
  export let userPreferences = { cards_grid_size: 3 }; // User preferences including grid size
  // Desktop collapse button props
  export let showCollapseButton = false;
  export let isCollapsed = false;
  export let onToggleCollapse = null;
  export let activeTab = 'cards'; // 'summary', 'cards', or 'entities'
  
  // Export function to refresh card types from parent component
  export function refreshCardTypes() {
    // Refresh card types in the Binder
    loadProjectCardTypes();
    // Note: CardsManager doesn't need card type refresh since it uses cards table
  }

  const dispatch = createEventDispatcher();
  
  // Reference to CardsManager component
  let cardsManagerComponent;
  
  // Search highlighting state
  let currentSearchTerm = '';
  let highlightedCardId = null;
  
  
  
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
  
  
  // Helper function to get card type display name
  function getCardTypeDisplayName(type) {
    const projectType = projectCardTypes.find(ft => ft.type_key === type);
    return projectType ? projectType.display_name : type;
  }
  
  
  // Filter cards based on search term
  $: filteredCards = cards.filter(card => {
    const searchTerm = search.toLowerCase().trim();
    const cardTypeDisplayName = getCardTypeDisplayName(card.type);
    return !searchTerm || 
      card.title.toLowerCase().includes(searchTerm) ||
      card.content.toLowerCase().includes(searchTerm) ||
      cardTypeDisplayName.toLowerCase().includes(searchTerm) ||
      (card.tags || []).some(tag => tag.toLowerCase().includes(searchTerm));
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

</script>

<section class="h-full border-r border-gray-200 dark:border-gray-700 p-2 sm:p-3 flex flex-col mobile-sidebar">

  {#if current}
    <!-- Three-Tab Interface: Summary, Facts, Docs -->
    <div class="flex flex-col min-h-0 flex-1">
      
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
          Cards ({filteredCards.length})
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
