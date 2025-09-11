<!-- CardsManager.svelte - MTG-style card collection manager -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { Plus, Filter, Grid, List, Star, Zap, Package, Layers, Brain } from 'lucide-svelte';
  import Card from './Card.svelte';
  import CardZoomView from './CardZoomView.svelte';
  import EditCardModal from './modals/EditCardModal.svelte';
  import AddCardModal from './modals/AddCardModal.svelte';
  import PackOpener from './PackOpener.svelte';
  import LoadingSpinner from './LoadingSpinner.svelte';

  // Rarity configurations with explicit colors (matching Card.svelte)
  const rarityConfig = {
    common: {
      borderColor: '#14b8a6', // teal-500
      bgColor: '#f0fdfa', // teal-50
      bgColorDark: '#064e3b', // dark green
      textColor: '#0f766e', // teal-700
      textColorDark: '#6ee7b7' // bright green
    },
    special: {
      borderColor: '#3b82f6', // blue-500
      bgColor: '#eff6ff', // blue-50
      bgColorDark: '#1e3a8a', // blue-800
      textColor: '#1d4ed8', // blue-700
      textColorDark: '#60a5fa' // blue-400
    },
    rare: {
      borderColor: '#8b5cf6', // purple-500
      bgColor: '#faf5ff', // purple-50
      bgColorDark: '#581c87', // purple-800
      textColor: '#6b21a8', // purple-700
      textColorDark: '#a78bfa' // purple-400
    },
    legendary: {
      borderColor: '#f97316', // orange-500
      bgColor: '#fff7ed', // orange-50
      bgColorDark: '#9a3412', // orange-800
      textColor: '#c2410c', // orange-700
      textColorDark: '#fb923c' // orange-400
    }
  };

  function getRarityConfig(rarity) {
    return rarityConfig[rarity] || rarityConfig.common;
  }

  function isDarkMode() {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark') || 
           (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  export let cards = [];
  export let loadingCards = false;
  export let showAddCardForm = false;
  export let worldId = null;
  export let user = null;
  export let searchTerm = '';
  export let cardsGridSize = 3;
  export let userPreferences = { display_name: null }; // User preferences
  
  let projectCardTypes = [];
  let loadingCardTypes = false;
  let showEditModal = false;
  let editingCard = null;
  let showAddModal = false;
  let showPackOpener = false;
  let showCardZoom = false;
  let zoomedCard = null;
  let generatingEmbeddings = false;
  let embeddingsStatus = '';
  let selectedCards = new Set();
  let viewMode = 'binder'; // 'binder', 'timeline', 'clusters'
  let rarityFilter = 'all'; // 'all', 'common', 'special', 'rare', 'legendary'
  let progressFilter = 'all'; // 'all', 'raw', 'rough', 'crystal', 'cut', 'shimmer'
  let pinFilter = 'all'; // 'all', 'pinned', 'unpinned'
  let sortBy = 'title'; // 'title', 'rarity', 'progress', 'mana_cost', 'created_at'
  let sortOrder = 'asc'; // 'asc' or 'desc'
  let updatingCards = new Set(); // Track cards currently being updated

  const dispatch = createEventDispatcher();

  // Load project card types when worldId changes
  $: if (worldId) {
    loadProjectCardTypes();
  }

  // React to showAddCardForm prop changes from parent
  $: if (showAddCardForm && !showAddModal) {
    showAddModal = true;
    showAddCardForm = false;
  }

  // Debug: Log cards received by CardsManager
  $: if (cards.length > 0) {
    // console.log('🔍 CardsManager received cards:', cards.map(c => ({ id: c.id, title: c.title, art_url: c.art_url, hasArtUrl: !!c.art_url })));
  }

  // Filter cards based on search, rarity, and progress
  $: filteredCards = cards.filter(card => {
    const matchesSearch = !searchTerm || 
      card.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRarity = rarityFilter === 'all' || card.rarity === rarityFilter;
    const matchesProgress = progressFilter === 'all' || 
      (progressFilter === 'raw' && card.progress === 1) ||
      (progressFilter === 'rough' && card.progress === 2) ||
      (progressFilter === 'crystal' && card.progress === 3) ||
      (progressFilter === 'cut' && card.progress === 4) ||
      (progressFilter === 'shimmer' && card.progress === 5);
    const matchesPin = pinFilter === 'all' || 
      (pinFilter === 'pinned' && card.pinned) ||
      (pinFilter === 'unpinned' && !card.pinned);
    
    return matchesSearch && matchesRarity && matchesProgress && matchesPin;
  });

  // Sort cards by pinned status first, then by selected sort criteria
  $: sortedCards = filteredCards.sort((a, b) => {
    // Pinned cards first
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    
    // Then sort by selected criteria
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
        aValue = new Date(a.created_date || a.created_at || 0);
        bValue = new Date(b.created_date || b.created_at || 0);
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
      
      // If values are equal, sort by title as secondary sort
      if (sortBy === 'created_at' && aValue.getTime() === bValue.getTime()) {
        const aTitle = (a.title || '').toLowerCase();
        const bTitle = (b.title || '').toLowerCase();
        return aTitle.localeCompare(bTitle);
      }
      
      return 0;
    }
  });

  // Group cards by day for timeline view
  $: cardsByDay = sortedCards.reduce((groups, card) => {
    const date = new Date(card.created_date || card.created_at);
    const dayKey = date.toDateString(); // e.g., "Mon Jan 15 2024"
    
    if (!groups[dayKey]) {
      groups[dayKey] = {
        date: date,
        dayKey: dayKey,
        cards: []
      };
    }
    groups[dayKey].cards.push(card);
    return groups;
  }, {});

  // Convert to array and sort by date DESC
  $: dayGroups = Object.values(cardsByDay).sort((a, b) => b.date - a.date);

  async function loadProjectCardTypes() {
    if (!worldId) return;
    
    loadingCardTypes = true;
    try {
      const response = await fetch(`/api/projects/${worldId}/card-types`, {
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
    } finally {
      loadingCardTypes = false;
    }
  }

  function getDefaultCardTypes() {
    return [
      { type_key: 'character', display_name: 'Character', color_class: 'bg-blue-100 text-blue-700', sort_order: 1 },
      { type_key: 'location', display_name: 'Location', color_class: 'bg-green-100 text-green-700', sort_order: 2 },
      { type_key: 'concept', display_name: 'Concept', color_class: 'bg-purple-100 text-purple-700', sort_order: 3 },
      { type_key: 'item', display_name: 'Item', color_class: 'bg-orange-100 text-orange-700', sort_order: 4 },
      { type_key: 'event', display_name: 'Event', color_class: 'bg-red-100 text-red-700', sort_order: 5 }
    ];
  }

  function openAddModal() {
    showAddModal = true;
  }

  async function generateEmbeddings() {
    if (generatingEmbeddings) return;
    
    generatingEmbeddings = true;
    embeddingsStatus = 'Starting...';
    
    try {
      const response = await fetch('/api/cards/generate-embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: worldId })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        embeddingsStatus = `✅ ${result.message}`;
        // Dispatch event to parent to reload context (this will sync with server)
        dispatch('reload-context');
      } else {
        embeddingsStatus = `❌ Error: ${result.error}`;
      }
    } catch (error) {
      embeddingsStatus = `❌ Error: ${error.message}`;
    } finally {
      generatingEmbeddings = false;
      // Clear status after 5 seconds
      setTimeout(() => {
        embeddingsStatus = '';
      }, 5000);
    }
  }

  function handleAddModalSave(event) {
    const { title, content, tags, rarity, progress, type } = event.detail;
    dispatch('add', {
      title,
      content,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      rarity: rarity || 'common',
      progress: progress || 1,
      type: type || 'concept',
      world_id: worldId
    });
    showAddModal = false;
  }

  function handleAddModalCancel() {
    showAddModal = false;
  }

  function handleCardAction(event) {
    const { type, detail } = event;
    const { card } = detail;
    
    switch (type) {
      case 'select':
        if (selectedCards.has(card.id)) {
          selectedCards.delete(card.id);
        } else {
          selectedCards.add(card.id);
        }
        selectedCards = selectedCards; // Trigger reactivity
        break;
      case 'edit':
        editingCard = card;
        showEditModal = true;
        break;
      case 'delete':
        dispatch('delete', { card });
        break;
      case 'toggle-pin':
        dispatch('toggle-pin', { card });
        break;
      case 'progress-change':
        console.log('CardsManager: Received progress-change event for card:', card.id, 'target level:', detail.targetLevel);
        handleProgressChange(card, detail.targetLevel);
        break;
      case 'rarity-change':
        dispatch('rarity-change', { card });
        break;
      case 'rarity-upgrade':
        console.log('CardsManager: Received rarity-upgrade event for card:', card.id, 'timestamp:', Date.now());
        handleRarityUpgrade(card);
        break;
      case 'rarity-downgrade':
        console.log('CardsManager: Received rarity-downgrade event for card:', card.id);
        handleRarityDowngrade(card);
        break;
      case 'split':
        dispatch('split', { card });
        break;
      case 'merge':
        dispatch('merge', { card });
        break;
      case 'generate-art':
        dispatch('generate-art', { card });
        break;
    }
  }

  function handleEditModalSave(event) {
    const { card, updates } = event.detail;
    dispatch('edit', { card, updates });
    showEditModal = false;
    editingCard = null;
  }

  function handleEditModalCancel() {
    showEditModal = false;
    editingCard = null;
  }

  function openCardZoom(event) {
    zoomedCard = event.detail.card;
    showCardZoom = true;
  }

  function closeCardZoom() {
    showCardZoom = false;
    zoomedCard = null;
  }

  function handleCardZoomSave(event) {
    const { card } = event.detail;
    
    // Update the local cards array
    cards = cards.map(c => c.id === card.id ? card : c);
    
    dispatch('edit', { card, updates: card });
    closeCardZoom();
  }

  function handleCardZoomDelete(event) {
    const { card } = event.detail;
    dispatch('delete', { card });
    closeCardZoom(); // Close the zoom view after dispatching delete
  }

  function handleCardZoomRarityChange(event) {
    const { card, newRarity } = event.detail;
    dispatch('rarity-change', { card, newRarity });
  }

  function handleCardZoomProgressChange(event) {
    const { card, targetLevel } = event.detail;
    dispatch('progress-change', { card, targetLevel });
  }

  function handleCardZoomTogglePin(event) {
    const { card } = event.detail;
    dispatch('toggle-pin', { card });
  }

  function handleCardZoomMerge(event) {
    const { card } = event.detail;
    dispatch('merge', { card });
  }

  function handleCardSave(event) {
    console.log('CardsManager: handleCardSave called with:', event.detail);
    dispatch('save-card', event.detail);
  }

  function handleCardZoomSplit(event) {
    const { card } = event.detail;
    dispatch('split', { card });
  }

  function handleCardZoomOpenDeck(event) {
    const { deckId, deckName } = event.detail;
    // Close the card zoom view first
    closeCardZoom();
    // Then dispatch the open-deck event
    dispatch('open-deck', { deckId, deckName });
  }

  async function handleCardZoomGenerateArt(event) {
    const { card, artUrl, source, model } = event.detail;
    console.log('🔍 CardsManager received art update:', { cardId: card.id, artUrl, source, model });
    
    // Optimistically update the cards array to keep UI in sync
    const updatedCards = cards.map(c => 
      c.id === card.id 
        ? { ...c, art_url: artUrl, ...(model && source === 'ai' ? { art_model: model } : {}) }
        : c
    );
    
    console.log('🔍 CardsManager updating cards array:', updatedCards.find(c => c.id === card.id));
    cards = updatedCards;
    
    // Save art URL to database
    try {
      console.log('🔍 CardsManager: Sending art URL to database:', { cardId: card.id, artUrl, artModel: model });
      const response = await fetch('/api/cards/art', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cardId: card.id,
          artUrl: artUrl,
          artModel: model
        })
      });
      
      console.log('🔍 CardsManager: API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API error response:', errorText);
        throw new Error(`Failed to save art URL to database: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Art URL saved to database successfully:', result);
    } catch (error) {
      console.error('❌ Error saving art URL to database:', error);
      // TODO: Show user-friendly error message
    }
    
    dispatch('generate-art', { card, artUrl, source });
  }

  function handlePackComplete(event) {
    const { cards } = event.detail;
    showPackOpener = false;
    
    // Dispatch the new cards to parent component
    dispatch('pack-complete', { cards });
  }

  async function handleRarityUpgrade(card) {
    // Prevent multiple simultaneous updates
    if (updatingCards.has(card.id)) {
      console.log('Card already being updated, ignoring click');
      return;
    }
    
    console.log('🔍 CardsManager: Card object for upgrade:', {
      id: card.id,
      title: card.title,
      rarity: card.rarity,
      type: typeof card.rarity
    });
    
    const rarityOrder = ['common', 'special', 'rare', 'legendary'];
    const currentIndex = rarityOrder.indexOf(card.rarity);
    
    console.log('🔍 CardsManager: Current rarity index:', currentIndex, 'for rarity:', card.rarity);
    
    if (currentIndex < rarityOrder.length - 1) {
      const newRarity = rarityOrder[currentIndex + 1];
      console.log('🔍 CardsManager: Upgrading from', card.rarity, 'to', newRarity);
      await updateCardRarity(card, newRarity);
    } else {
      console.log('🔍 CardsManager: Cannot upgrade - already at max rarity');
    }
  }

  async function handleRarityDowngrade(card) {
    // Prevent multiple simultaneous updates
    if (updatingCards.has(card.id)) {
      console.log('Card already being updated, ignoring click');
      return;
    }
    
    const rarityOrder = ['common', 'special', 'rare', 'legendary'];
    const currentIndex = rarityOrder.indexOf(card.rarity);
    
    if (currentIndex > 0) {
      const newRarity = rarityOrder[currentIndex - 1];
      await updateCardRarity(card, newRarity);
    }
  }

  async function updateCardRarity(card, newRarity) {
    console.log('Updating card rarity:', card.id, 'from', card.rarity, 'to', newRarity);
    
    // Mark card as being updated
    updatingCards.add(card.id);
    
    // Optimistically update the UI first for immediate feedback
    cards = cards.map(c => 
      c.id === card.id 
        ? { ...c, rarity: newRarity }
        : c
    );

    try {
      const response = await fetch('/api/cards/rarity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardId: card.id,
          newRarity: newRarity
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update rarity');
      }

      const result = await response.json();
      console.log('Rarity update successful:', result);
      
      // Dispatch event to parent to reload context (this will sync with server)
      dispatch('reload-context');

    } catch (error) {
      console.error('Error updating card rarity:', error);
      
      // Revert the optimistic update on error
      cards = cards.map(c => 
        c.id === card.id 
          ? { ...c, rarity: card.rarity }
          : c
      );
      
      alert(`Failed to update rarity: ${error.message}`);
    } finally {
      // Remove card from updating set
      updatingCards.delete(card.id);
    }
  }

  async function handleProgressChange(card, targetLevel) {
    // Prevent multiple simultaneous updates
    if (updatingCards.has(card.id)) {
      console.log('Card already being updated, ignoring progress click');
      return;
    }

    console.log('CardsManager: Updating card progress:', card.id, 'from', card.progress, 'to', targetLevel);

    // Mark card as being updated
    updatingCards.add(card.id);

    // Optimistically update the UI first for immediate feedback
    cards = cards.map(c =>
      c.id === card.id
        ? { ...c, progress: targetLevel }
        : c
    );

    try {
      const response = await fetch('/api/cards/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardId: card.id,
          newProgress: targetLevel
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update progress');
      }

      const result = await response.json();
      console.log('Progress update successful:', result);

      // Dispatch event to parent to reload context (this will sync with server)
      dispatch('reload-context');

    } catch (error) {
      console.error('Error updating card progress:', error);

      // Revert the optimistic update on error
      cards = cards.map(c =>
        c.id === card.id
          ? { ...c, progress: card.progress }
          : c
      );

      alert(`Failed to update progress: ${error.message}`);
    } finally {
      // Remove card from updating set
      updatingCards.delete(card.id);
    }
  }

  function clearFilters() {
    rarityFilter = 'all';
    progressFilter = 'all';
    pinFilter = 'all';
  }

  function getRarityCount(rarity) {
    return cards.filter(card => card.rarity === rarity).length;
  }

  function getPinCount(pinStatus) {
    if (pinStatus === 'pinned') {
      return cards.filter(card => card.pinned).length;
    } else if (pinStatus === 'unpinned') {
      return cards.filter(card => !card.pinned).length;
    }
    return cards.length;
  }

  function getProgressCount(progress) {
    return cards.filter(card => card.progress === progress).length;
  }
</script>

<div class="cards-manager h-full flex flex-col">
  <!-- Header -->
  <div class="flex-shrink-0 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <!-- Filters inline -->
        <div class="flex items-center gap-4">
          <!-- Rarity Filter -->
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Rarity:</label>
            <select 
              bind:value={rarityFilter}
              class="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All ({cards.length})</option>
              <option value="common">Common ({getRarityCount('common')})</option>
              <option value="special">Special ({getRarityCount('special')})</option>
              <option value="rare">Rare ({getRarityCount('rare')})</option>
              <option value="legendary">Legendary ({getRarityCount('legendary')})</option>
            </select>
          </div>

          <!-- Progress Filter -->
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Progress:</label>
            <select 
              bind:value={progressFilter}
              class="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All</option>
              <option value="raw">Raw ({getProgressCount(1)})</option>
              <option value="rough">Rough ({getProgressCount(2)})</option>
              <option value="crystal">Crystal ({getProgressCount(3)})</option>
              <option value="cut">Cut ({getProgressCount(4)})</option>
              <option value="shimmer">Shimmer ({getProgressCount(5)})</option>
            </select>
          </div>

          <!-- Pin Filter -->
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Pin:</label>
            <select 
              bind:value={pinFilter}
              class="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All ({getPinCount('all')})</option>
              <option value="pinned">📌 Pinned ({getPinCount('pinned')})</option>
              <option value="unpinned">📍 Unpinned ({getPinCount('unpinned')})</option>
            </select>
          </div>

          <!-- Sort Controls -->
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Sort:</label>
            <select 
              bind:value={sortBy}
              class="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="created_at">Date Created</option>
              <option value="title">Title</option>
              <option value="rarity">Rarity</option>
              <option value="progress">Progress</option>
              <option value="mana_cost">Mana Cost</option>
            </select>
            <button
              on:click={() => sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'}
              class="flex items-center gap-1 px-2 py-1 text-sm bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded transition-colors"
              title={`Currently ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
            >
              {#if sortOrder === 'asc'}
                ↑ Asc
              {:else}
                ↓ Desc
              {/if}
            </button>
          </div>

          <!-- Clear Filters -->
          {#if rarityFilter !== 'all' || progressFilter !== 'all' || pinFilter !== 'all'}
            <button
              class="text-sm text-blue-600 dark:text-blue-500 hover:underline"
              on:click={clearFilters}
            >
              Clear Filters
            </button>
          {/if}
        </div>
        
        <div class="flex items-center gap-2">
          <button
            class="flex items-center gap-1 px-3 py-1 text-sm rounded-lg transition-all hover:scale-105 active:scale-95 font-medium"
            style="background-color: var(--color-accent); color: var(--color-accent-text);"
            on:click={openAddModal}
            title="Create New Card"
          >
            <Plus size="16" />
            <span>New Card</span>
          </button>
          
          <button
            class="flex items-center gap-1 px-3 py-1 text-sm rounded-lg transition-all hover:scale-105 active:scale-95 font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white"
            on:click={() => showPackOpener = true}
            title="Summon Pack from the Void"
          >
            <Package size="16" />
            <span>Summon Pack</span>
          </button>
          
          <button
            class="flex items-center gap-1 px-3 py-1 text-sm rounded-lg transition-all hover:scale-105 active:scale-95 font-medium bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
            on:click={generateEmbeddings}
            disabled={generatingEmbeddings}
            title="Generate AI embeddings for semantic search"
          >
            <Brain size="16" />
            <span>{generatingEmbeddings ? 'Generating...' : 'Generate Embeddings'}</span>
          </button>
          
        </div>
      </div>

      <!-- Embeddings Status -->
      {#if embeddingsStatus}
        <div class="mt-2 p-2 text-sm rounded-lg {embeddingsStatus.startsWith('✅') ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'}">
          {embeddingsStatus}
        </div>
      {/if}

      <!-- View Mode Toggle -->
      <div class="flex items-center gap-2">
        <button
          id="toggle-decks"
          class="flex items-center gap-1 px-3 py-1 text-sm rounded-lg transition-all hover:scale-105 active:scale-95 font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          on:click={() => {
            // Dispatch event to toggle deck drawer
            window.dispatchEvent(new CustomEvent('toggle-deck-drawer'));
          }}
          title="Toggle Decks"
        >
          <Layers size="16" />
          <span>Decks</span>
        </button>
        <div class="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            class="px-3 py-1 text-sm rounded-md transition-colors {viewMode === 'binder' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}"
            on:click={() => viewMode = 'binder'}
            title="Binder View"
          >
            <Grid size="16" />
          </button>
          <button
            id="toggle-timeline"
            class="px-3 py-1 text-sm rounded-md transition-colors {viewMode === 'timeline' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}"
            on:click={() => viewMode = 'timeline'}
            title="Timeline View"
          >
            <List size="16" />
          </button>
        </div>
      </div>
    </div>

  </div>

  <!-- Cards Grid -->
  <div class="flex-1 overflow-y-auto p-4">
    {#if loadingCards}
      <LoadingSpinner overlay={true} text="Loading cards..." />
    {/if}

    {#if viewMode === 'binder'}
      <!-- Line 577 -->
      <div class="cards-grid gap-4" style:grid-template-columns="repeat({cardsGridSize}, minmax(0, 1fr))">
        {#each sortedCards as card (card.id)}
          <!-- Line 580 -->
          <Card 
            {card}
            {searchTerm}
            isSelected={selectedCards.has(card.id)}
            showActions={false}
            on:card-click={openCardZoom}
            on:select={handleCardAction}
            on:edit={handleCardAction}
            on:delete={handleCardAction}
            on:toggle-pin={handleCardAction}
            on:progress-change={handleCardAction}
            on:rarity-change={handleCardAction}
            on:rarity-upgrade={handleCardAction}
            on:rarity-downgrade={handleCardAction}
            on:split={handleCardAction}
            on:merge={handleCardAction}
            on:generate-art={handleCardAction}
          />
        {/each}
      </div>
    {:else if viewMode === 'timeline'}
      <div class="space-y-6" id="timeline-view">
        {#each dayGroups as dayGroup (dayGroup.dayKey)}
          <div class="space-y-3">
            <!-- Day Header -->
            <div class="flex items-center gap-3 py-2">
              <div class="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
              <div class="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300">
                {dayGroup.date.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
              <div class="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
            </div>
            
            <!-- Cards for this day -->
            {#each dayGroup.cards as card (card.id)}
              <div 
                class="card-timeline flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                style:border-color={getRarityConfig(card.rarity).borderColor}
                style:border-width="2px"
                style:border-style="solid"
                on:click={() => openCardZoom({ detail: { card } })}
                role="button"
                tabindex="0"
                on:keydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openCardZoom({ detail: { card } });
                  }
                }}
              >
                <div class="rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center" style="width: 88px; height: 48px;">
                  {#if card.art_url}
                    <img 
                      src={card.art_url} 
                      alt="Card art" 
                      class="object-cover rounded"
                      style="width: 100%; height: 100%; max-width: 220px; max-height: 120px;"
                    />
                  {:else}
                    <img
                      src="/wiskr-art-default.webp"
                      alt="Default card art"
                      class="object-cover rounded"
                      style="width: 100%; height: 100%; max-width: 220px; max-height: 120px;"
                      draggable="false"
                    />
                  {/if}
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-medium text-gray-900 dark:text-gray-100 truncate">{card.title || card.key}</h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400 break-words">{card.content}</p>
                </div>
                <div class="flex items-center gap-2">
                  <span 
                    class="text-xs px-2 py-1 rounded-full font-bold uppercase"
                    style:background-color={isDarkMode() ? getRarityConfig(card.rarity).bgColorDark : getRarityConfig(card.rarity).bgColor}
                    style:color={isDarkMode() ? getRarityConfig(card.rarity).textColorDark : getRarityConfig(card.rarity).textColor}
                    style:border-color={getRarityConfig(card.rarity).borderColor}
                    style:border-width="1px"
                    style:border-style="solid"
                  >
                    {card.rarity}
                  </span>
                  <div class="flex items-center gap-1">
                    {#each Array(5) as _, i}
                      <Star size="12" class={card.progress > i ? 'text-yellow-500 fill-current' : 'text-gray-300'} />
                    {/each}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/each}
      </div>
    {/if}

    {#if !sortedCards.length && !loadingCards}
      <div class="text-center py-12">
        <div class="text-gray-400 dark:text-gray-500 mb-4">
          <Zap size="48" class="mx-auto" />
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No cards found</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-4">
          {searchTerm || rarityFilter !== 'all' || progressFilter !== 'all' || pinFilter !== 'all'
            ? 'Try adjusting your filters or search terms.' 
            : 'Create your first card to get started!'}
        </p>
        {#if !searchTerm && rarityFilter === 'all' && progressFilter === 'all' && pinFilter === 'all'}
          <button
            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all hover:scale-105"
            style="background-color: var(--color-accent); color: var(--color-accent-text);"
            on:click={openAddModal}
          >
            <Plus size="16" />
            Create Your First Card
          </button>
        {/if}
      </div>
    {/if}
  </div>
</div>

<!-- Modals -->
{#if showAddModal}
  <AddCardModal
    projectCardTypes={projectCardTypes}
    on:save={handleAddModalSave}
    on:cancel={handleAddModalCancel}
  />
{/if}

{#if showEditModal && editingCard}
  <EditCardModal
    card={editingCard}
    projectCardTypes={projectCardTypes}
    on:save={handleEditModalSave}
    on:cancel={handleEditModalCancel}
  />
{/if}

{#if showPackOpener}
  <PackOpener
    isOpen={showPackOpener}
    {worldId}
    {user}
    on:pack-complete={handlePackComplete}
  />
{/if}

<!-- Card Zoom View -->
<CardZoomView 
  card={zoomedCard}
  bind:isOpen={showCardZoom}
  userPreferences={userPreferences}
  on:close={closeCardZoom}
  on:save={handleCardZoomSave}
  on:delete={handleCardZoomDelete}
  on:rarity-change={handleCardZoomRarityChange}
  on:progress-change={handleCardZoomProgressChange}
  on:toggle-pin={handleCardZoomTogglePin}
  on:merge={handleCardZoomMerge}
  on:save-card={handleCardSave}
  on:split={handleCardZoomSplit}
  on:generate-art={handleCardZoomGenerateArt}
  on:open-deck={handleCardZoomOpenDeck}
/>

<style>
  .cards-grid {
    display: grid;
    grid-auto-rows: minmax(300px, auto);
  }
</style>
