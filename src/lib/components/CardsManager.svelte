<!-- CardsManager.svelte - MTG-style card collection manager -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { Plus, Filter, Grid, List, Star, Zap } from 'lucide-svelte';
  import Card from './Card.svelte';
  import EditCardModal from './modals/EditCardModal.svelte';
  import AddCardModal from './modals/AddCardModal.svelte';
  import LoadingSpinner from './LoadingSpinner.svelte';

  export let cards = [];
  export let loadingCards = false;
  export let showAddCardForm = false;
  export let worldId = null;
  export let user = null;
  export let searchTerm = '';
  export let cardsGridSize = 3;
  
  let projectFactTypes = [];
  let loadingFactTypes = false;
  let showEditModal = false;
  let editingCard = null;
  let showAddModal = false;
  let selectedCards = new Set();
  let viewMode = 'binder'; // 'binder', 'timeline', 'clusters'
  let rarityFilter = 'all'; // 'all', 'common', 'special', 'rare', 'legendary'
  let progressFilter = 'all'; // 'all', 'raw', 'rough', 'crystal', 'cut', 'shimmer'

  const dispatch = createEventDispatcher();

  // Load project fact types when worldId changes
  $: if (worldId) {
    loadProjectFactTypes();
  }

  // React to showAddCardForm prop changes from parent
  $: if (showAddCardForm && !showAddModal) {
    showAddModal = true;
    showAddCardForm = false;
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
    
    return matchesSearch && matchesRarity && matchesProgress;
  });

  // Sort cards: pinned first, then by investment cost (mana), then by creation date
  $: sortedCards = filteredCards.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    if (a.investment_cost !== b.investment_cost) return (b.investment_cost || 0) - (a.investment_cost || 0);
    return new Date(b.created_at) - new Date(a.created_at);
  });

  async function loadProjectFactTypes() {
    if (!worldId) return;
    
    loadingFactTypes = true;
    try {
      const response = await fetch(`/api/projects/${worldId}/fact-types`, {
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
    } finally {
      loadingFactTypes = false;
    }
  }

  function getDefaultFactTypes() {
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
        dispatch('progress-change', { card });
        break;
      case 'rarity-change':
        dispatch('rarity-change', { card });
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

  function clearFilters() {
    rarityFilter = 'all';
    progressFilter = 'all';
  }

  function getRarityCount(rarity) {
    return cards.filter(card => card.rarity === rarity).length;
  }

  function getProgressCount(progress) {
    return cards.filter(card => card.progress === progress).length;
  }
</script>

<div class="cards-manager h-full flex flex-col">
  <!-- Header -->
  <div class="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Cards</h2>
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
        </div>
      </div>

      <!-- View Mode Toggle -->
      <div class="flex items-center gap-2">
        <div class="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            class="px-3 py-1 text-sm rounded-md transition-colors {viewMode === 'binder' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}"
            on:click={() => viewMode = 'binder'}
            title="Binder View"
          >
            <Grid size="16" />
          </button>
          <button
            class="px-3 py-1 text-sm rounded-md transition-colors {viewMode === 'timeline' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}"
            on:click={() => viewMode = 'timeline'}
            title="Timeline View"
          >
            <List size="16" />
          </button>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-4 flex-wrap">
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

      <!-- Clear Filters -->
      {#if rarityFilter !== 'all' || progressFilter !== 'all'}
        <button
          class="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          on:click={clearFilters}
        >
          Clear Filters
        </button>
      {/if}
    </div>
  </div>

  <!-- Cards Grid -->
  <div class="flex-1 overflow-y-auto p-4">
    {#if loadingCards}
      <LoadingSpinner overlay={true} text="Loading cards..." />
    {/if}

    {#if viewMode === 'binder'}
      <div class="cards-grid gap-4" style="grid-template-columns: repeat({cardsGridSize}, minmax(0, 1fr));">
        {#each sortedCards as card (card.id)}
          <Card 
            {card}
            {searchTerm}
            isSelected={selectedCards.has(card.id)}
            on:select={handleCardAction}
            on:edit={handleCardAction}
            on:delete={handleCardAction}
            on:toggle-pin={handleCardAction}
            on:progress-change={handleCardAction}
            on:rarity-change={handleCardAction}
            on:split={handleCardAction}
            on:merge={handleCardAction}
            on:generate-art={handleCardAction}
          />
        {/each}
      </div>
    {:else if viewMode === 'timeline'}
      <div class="space-y-3">
        {#each sortedCards as card (card.id)}
          <div class="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div class="w-12 h-12 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              {#if card.art_url}
                <img src={card.art_url} alt="Card art" class="w-full h-full object-cover rounded" />
              {:else}
                <span class="text-gray-400">🎨</span>
              {/if}
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-medium text-gray-900 dark:text-gray-100 truncate">{card.title || card.key}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 truncate">{card.content || card.value}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
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
    {/if}

    {#if !sortedCards.length && !loadingCards}
      <div class="text-center py-12">
        <div class="text-gray-400 dark:text-gray-500 mb-4">
          <Zap size="48" class="mx-auto" />
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No cards found</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-4">
          {searchTerm || rarityFilter !== 'all' || progressFilter !== 'all' 
            ? 'Try adjusting your filters or search terms.' 
            : 'Create your first card to get started!'}
        </p>
        {#if !searchTerm && rarityFilter === 'all' && progressFilter === 'all'}
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
    {projectFactTypes}
    on:save={handleAddModalSave}
    on:cancel={handleAddModalCancel}
  />
{/if}

{#if showEditModal && editingCard}
  <EditCardModal
    card={editingCard}
    {projectFactTypes}
    on:save={handleEditModalSave}
    on:cancel={handleEditModalCancel}
  />
{/if}

<style>
  .cards-grid {
    display: grid;
    grid-auto-rows: minmax(300px, auto);
  }
</style>
