<!-- MergeModal.svelte - Magical card merging interface -->
<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { X, Sparkles, Layers, Eye, Wand2, BookOpen, Lightbulb } from 'lucide-svelte';
  import Card from './Card.svelte';
  import FannedCardDeck from './FannedCardDeck.svelte';

  export let isOpen = false;
  export let sourceCard = null;
  export let projectId = null;

  const dispatch = createEventDispatcher();

  let selectedCards = [];
  let availableCards = [];
  let loading = false;
  let activeTab = 'conjure';
  let searchQuery = '';
  let filteredCards = [];

  // Merge feature states
  let conjureResult = null;
  let weaveResult = null;
  let divineResults = [];
  let selectedConjureCards = new Set();
  let selectedWeaveCards = new Set();
  let selectedDivineCards = new Set();
  let selectedAvailableCards = new Set();

  $: if (isOpen && sourceCard) {
    loadAvailableCards();
  }

  $: filteredCards = availableCards.filter(card => 
    card.id !== sourceCard?.id &&
    !selectedCards.some(selected => selected.id === card.id) &&
    (searchQuery === '' || 
     card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     card.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  async function loadAvailableCards() {
    if (!projectId) return;
    
    try {
      const response = await fetch(`/api/projects/${projectId}/cards`);
      if (response.ok) {
        const data = await response.json();
        availableCards = data.cards || [];
      }
    } catch (error) {
      console.error('Error loading cards:', error);
    }
  }

  function selectCard(card) {
    if (selectedCards.length < 4) { // Limit to 4 cards max
      selectedCards = [...selectedCards, card];
      console.log('Selected cards:', selectedCards.length, selectedCards);
    }
  }

  function removeCard(cardId) {
    selectedCards = selectedCards.filter(card => card.id !== cardId);
  }

  function clearSelection() {
    selectedCards = [];
    conjureResult = null;
    weaveResult = null;
    divineResults = [];
    selectedConjureCards = new Set();
    selectedWeaveCards = new Set();
    selectedDivineCards = new Set();
    selectedAvailableCards = new Set();
  }

  function toggleConjureCardSelection(index) {
    if (selectedConjureCards.has(index)) {
      selectedConjureCards.delete(index);
    } else {
      selectedConjureCards.add(index);
    }
    selectedConjureCards = selectedConjureCards; // Trigger reactivity
  }

  function toggleWeaveCardSelection(index) {
    if (selectedWeaveCards.has(index)) {
      selectedWeaveCards.delete(index);
    } else {
      selectedWeaveCards.add(index);
    }
    selectedWeaveCards = selectedWeaveCards; // Trigger reactivity
  }

  function toggleDivineCardSelection(index) {
    if (selectedDivineCards.has(index)) {
      selectedDivineCards.delete(index);
    } else {
      selectedDivineCards.add(index);
    }
    selectedDivineCards = selectedDivineCards; // Trigger reactivity
  }

  function selectAllDivineCards() {
    selectedDivineCards = new Set(divineResults.map((_, index) => index));
  }

  function deselectAllDivineCards() {
    selectedDivineCards = new Set();
  }

  function toggleAvailableCardSelection(index) {
    if (selectedAvailableCards.has(index)) {
      selectedAvailableCards.delete(index);
    } else {
      selectedAvailableCards.add(index);
    }
    selectedAvailableCards = selectedAvailableCards; // Trigger reactivity
  }

  function selectAllAvailableCards() {
    selectedAvailableCards = new Set(filteredCards.map((_, index) => index));
  }

  function deselectAllAvailableCards() {
    selectedAvailableCards = new Set();
  }

  function addSelectedCards() {
    selectedAvailableCards.forEach(index => {
      const card = filteredCards[index];
      if (card && !selectedCards.some(selected => selected.id === card.id)) {
        selectedCards = [...selectedCards, card];
      }
    });
    selectedAvailableCards = new Set();
  }

  function saveSelectedDivineCards() {
    console.log('🎴 MergeModal: Saving selected divine cards:', selectedDivineCards.size);
    divineResults.forEach((card, index) => {
      if (selectedDivineCards.has(index)) {
        console.log('🎴 MergeModal: Dispatching save-card event for:', card.title);
        dispatch('save-card', {
          title: card.title,
          content: card.content,
          tags: card.tags || [],
          rarity: card.rarity || 'common',
          progress: card.progress || 0,
          type: card.type || 'idea',
          project_id: projectId
        });
      }
    });
    closeModal();
  }

  async function performConjure() {
    if (selectedCards.length < 1) return;
    
    console.log('Performing conjure with:', {
      sourceCard: sourceCard?.title,
      selectedCards: selectedCards.map(c => c.title),
      projectId
    });
    
    loading = true;
    try {
      const response = await fetch('/api/cards/merge/conjure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCardId: sourceCard.id,
          selectedCardIds: selectedCards.map(c => c.id),
          projectId
        })
      });

      console.log('Conjure response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Conjure result:', result);
        // Convert tags array to string for editing
        conjureResult = {
          ...result,
          tags: Array.isArray(result.tags) ? result.tags.join(', ') : result.tags || ''
        };
        dispatch('conjure-complete', result);
      } else {
        const error = await response.json();
        console.error('Conjure API error:', error);
      }
    } catch (error) {
      console.error('Error performing conjure:', error);
    } finally {
      loading = false;
    }
  }

  async function performWeave() {
    if (selectedCards.length < 1) return;
    
    loading = true;
    try {
      const response = await fetch('/api/cards/merge/weave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCardId: sourceCard.id,
          selectedCardIds: selectedCards.map(c => c.id),
          projectId
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Convert tags array to string for editing
        weaveResult = {
          ...result,
          tags: Array.isArray(result.tags) ? result.tags.join(', ') : result.tags || ''
        };
        dispatch('weave-complete', result);
      }
    } catch (error) {
      console.error('Error performing weave:', error);
    } finally {
      loading = false;
    }
  }

  async function performDivine() {
    if (selectedCards.length < 1) return;
    
    loading = true;
    try {
      const response = await fetch('/api/cards/merge/divine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCardId: sourceCard.id,
          selectedCardIds: selectedCards.map(c => c.id),
          projectId
        })
      });

      if (response.ok) {
        const result = await response.json();
        divineResults = result.cards || [];
        dispatch('divine-complete', result);
      }
    } catch (error) {
      console.error('Error performing divine:', error);
    } finally {
      loading = false;
    }
  }

  function closeModal() {
    isOpen = false;
    clearSelection();
    dispatch('close');
  }

  function saveConjureResult() {
    console.log('MergeModal: saveConjureResult called');
    console.log('MergeModal: conjureResult:', conjureResult);
    
    if (conjureResult) {
      // Convert tags string back to array
      const cardData = {
        ...conjureResult,
        tags: typeof conjureResult.tags === 'string' 
          ? conjureResult.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
          : conjureResult.tags || []
      };
      
      console.log('MergeModal: Dispatching save-card event with:', cardData);
      dispatch('save-card', cardData);
      closeModal();
    } else {
      console.error('MergeModal: No conjureResult to save!');
    }
  }

  function saveWeaveResult() {
    console.log('🎴 MergeModal: saveWeaveResult called');
    console.log('🎴 MergeModal: weaveResult:', weaveResult);
    
    if (weaveResult) {
      // Convert tags string back to array
      const cardData = {
        ...weaveResult,
        tags: typeof weaveResult.tags === 'string' 
          ? weaveResult.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
          : weaveResult.tags || []
      };
      
      console.log('🎴 MergeModal: Dispatching save-card event with:', cardData);
      dispatch('save-card', cardData);
      closeModal();
    } else {
      console.error('🎴 MergeModal: No weaveResult to save!');
    }
  }

  function saveDivineResult(card) {
    dispatch('save-card', card);
  }

  function closeResult() {
    conjureResult = null;
    weaveResult = null;
    divineResults = [];
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" on:click={closeModal}>
    <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-7xl w-full mx-4 max-h-[90vh] overflow-hidden" on:click|stopPropagation>
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <Wand2 size="24" class="text-purple-500" />
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Merge Cards to Create</h2>
        </div>
        <button
          class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          on:click={closeModal}
        >
          <X size="20" />
        </button>
      </div>


      <!-- Tab Content -->
      <div class="flex-1 overflow-hidden">
        {#if activeTab === 'conjure'}
          <!-- Conjure Tab - Three Column Layout -->
          <div class="flex h-full">
            <!-- Left: Source Card -->
            <div class="w-1/3 p-4 border-r border-gray-200 dark:border-gray-700">
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Source Card</h4>
              <div class="flex justify-center mt-8">
                {#if sourceCard}
                  <Card 
                    card={sourceCard}
                    searchTerm=""
                    showActions={false}
                    xPaddingClass="px-2"
                    key={sourceCard?.id || 'no-id'}
                  />
                {:else}
                  <div class="w-64 h-80 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center">
                    <p class="text-gray-500 dark:text-gray-400 text-sm">No source card</p>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Middle: Action Area -->
            <div class="w-1/3 p-4 flex flex-col items-center justify-start relative">
              <!-- Tab Navigation -->
              <div class="flex gap-2 mb-6">
                <button
                  class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors {activeTab === 'conjure' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}"
                  on:click={() => activeTab = 'conjure'}
                >
                  <Sparkles size="16" />
                  Conjure
                </button>
                <button
                  class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors {activeTab === 'weave' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}"
                  on:click={() => activeTab = 'weave'}
                >
                  <Layers size="16" />
                  Weave
                </button>
                <button
                  class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors {activeTab === 'divine' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}"
                  on:click={() => activeTab = 'divine'}
                >
                  <Eye size="16" />
                  Divine
                </button>
              </div>

              <div class="text-center mb-6">
                <Sparkles size="48" class="mx-auto text-purple-500 mb-4" />
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Conjure</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">Combine cards to create a creative new concept</p>
              </div>

              <!-- Search -->
              <div class="w-full mb-4">
                <input
                  type="text"
                  placeholder="Search cards..."
                  bind:value={searchQuery}
                  class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <!-- Action Button -->
              {#if selectedCards.length >= 1}
                <button
                  class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-lg font-semibold"
                  on:click={performConjure}
                  disabled={loading}
                >
                  {#if loading}
                    <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {:else}
                    <Sparkles size="16" />
                  {/if}
                  Conjure New Idea
                </button>
              {:else}
                <div class="text-center text-gray-500 dark:text-gray-400 text-sm">
                  Select a card to combine
                </div>

                <div class="text-center text-gray-500 dark:text-gray-400 text-sm">
                  Your original card will not be affected.
                </div>
              {/if}
            </div>

            <!-- Right: Card Selection -->
            <div class="w-1/3 p-4 border-l border-gray-200 dark:border-gray-700 flex flex-col">

              <!-- Selected Cards -->
              {#if selectedCards.length > 0}
                <div class="mb-4">
                  <h5 class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Selected Cards</h5>
                  <div class="flex flex-col items-center space-y-3 pl-4">
                    {#each selectedCards as card}
                      <div class="relative w-full max-w-[280px]">
                        <Card 
                          {card}
                          showActions={false}
                          xPaddingClass="px-2"
                        />
                        <button
                          class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10"
                          on:click={() => removeCard(card.id)}
                        >
                          <X size="12" />
                        </button>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              <!-- Available Cards -->
              <div class="flex-1 flex flex-col">
                <div class="flex items-center justify-between mb-2">
                  <h5 class="text-xs font-medium text-gray-600 dark:text-gray-400">Available Cards</h5>
                  <div class="flex gap-2">
                    <button
                      class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      on:click={selectAllAvailableCards}
                    >
                      Select All
                    </button>
                    <button
                      class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      on:click={deselectAllAvailableCards}
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <div class="flex-1 -mt-4 mt-4">
                  <FannedCardDeck 
                    cards={filteredCards}
                    selectedCards={selectedAvailableCards}
                    allowSelection={true}
                    containerHeight="h-[28rem]"
                    on:selection-change={(e) => selectedAvailableCards = e.detail.selectedCards}
                  />
                </div>
                <div class="text-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Hold shift and hover for full card view
                </div>
                <div class="flex justify-between items-center mt-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <span class="text-sm text-gray-600 dark:text-gray-400">
                    {selectedAvailableCards.size} of {filteredCards.length} selected
                  </span>
                  <button
                    class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    on:click={addSelectedCards}
                    disabled={selectedAvailableCards.size === 0}
                  >
                    Add Selected ({selectedAvailableCards.size})
                  </button>
                </div>
              </div>
            </div>
          </div>

        {:else if activeTab === 'weave'}
          <!-- Weave Tab - Three Column Layout -->
          <div class="flex h-full">
            <!-- Left: Source Card -->
            <div class="w-1/3 p-4 border-r border-gray-200 dark:border-gray-700">
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Source Card</h4>
              <div class="flex justify-center mt-8">
                {#if sourceCard}
                  <Card 
                    card={sourceCard}
                    searchTerm=""
                    showActions={false}
                    xPaddingClass="px-2"
                    key={sourceCard?.id || 'no-id'}
                  />
                {:else}
                  <div class="w-64 h-80 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center">
                    <p class="text-gray-500 dark:text-gray-400 text-sm">No source card</p>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Middle: Action Area -->
            <div class="w-1/3 p-4 flex flex-col items-center justify-start relative">
              <!-- Tab Navigation -->
              <div class="flex gap-2 mb-6">
                <button
                  class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors {activeTab === 'conjure' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}"
                  on:click={() => activeTab = 'conjure'}
                >
                  <Sparkles size="16" />
                  Conjure
                </button>
                <button
                  class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors {activeTab === 'weave' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}"
                  on:click={() => activeTab = 'weave'}
                >
                  <Layers size="16" />
                  Weave
                </button>
                <button
                  class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors {activeTab === 'divine' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}"
                  on:click={() => activeTab = 'divine'}
                >
                  <Eye size="16" />
                  Divine
                </button>
              </div>

              <div class="text-center mb-6">
                <Layers size="48" class="mx-auto text-blue-500 mb-4" />
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Weave</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">Unify and summarize cards into a cohesive concept</p>
              </div>

              <!-- Search -->
              <div class="w-full mb-4">
                <input
                  type="text"
                  placeholder="Search cards..."
                  bind:value={searchQuery}
                  class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <!-- Action Button -->
              {#if selectedCards.length >= 1}
                <button
                  class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-lg font-semibold"
                  on:click={performWeave}
                  disabled={loading}
                >
                  {#if loading}
                    <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {:else}
                    <Layers size="16" />
                  {/if}
                  Weave Together
                </button>
              {:else}
                <div class="text-center text-gray-500 dark:text-gray-400 text-sm">
                  Select a card to weave
                </div>
              {/if}
            </div>

            <!-- Right: Card Selection -->
            <div class="w-1/3 p-4 border-l border-gray-200 dark:border-gray-700 flex flex-col">

              <!-- Selected Cards -->
              {#if selectedCards.length > 0}
                <div class="mb-4">
                  <h5 class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Selected Cards</h5>
                  <div class="flex flex-col items-center space-y-3 pl-4">
                    {#each selectedCards as card}
                      <div class="relative w-full max-w-[280px]">
                        <Card 
                          {card}
                          showActions={false}
                          xPaddingClass="px-2"
                        />
                        <button
                          class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10"
                          on:click={() => removeCard(card.id)}
                        >
                          <X size="12" />
                        </button>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              <!-- Available Cards -->
              <div class="flex-1 flex flex-col">
                <div class="flex items-center justify-between mb-2">
                  <h5 class="text-xs font-medium text-gray-600 dark:text-gray-400">Available Cards</h5>
                  <div class="flex gap-2">
                    <button
                      class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      on:click={selectAllAvailableCards}
                    >
                      Select All
                    </button>
                    <button
                      class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      on:click={deselectAllAvailableCards}
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <div class="flex-1 -mt-4 mt-4">
                  <FannedCardDeck 
                    cards={filteredCards}
                    selectedCards={selectedAvailableCards}
                    allowSelection={true}
                    containerHeight="h-[28rem]"
                    on:selection-change={(e) => selectedAvailableCards = e.detail.selectedCards}
                  />
                </div>
                <div class="text-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Hold shift and hover for full card view
                </div>
                <div class="flex justify-between items-center mt-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <span class="text-sm text-gray-600 dark:text-gray-400">
                    {selectedAvailableCards.size} of {filteredCards.length} selected
                  </span>
                  <button
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    on:click={addSelectedCards}
                    disabled={selectedAvailableCards.size === 0}
                  >
                    Add Selected ({selectedAvailableCards.size})
                  </button>
                </div>
              </div>
            </div>
          </div>

        {:else if activeTab === 'divine'}
          <!-- Divine Tab - Three Column Layout -->
          <div class="flex h-full">
            <!-- Left: Source Card -->
            <div class="w-1/3 p-4 border-r border-gray-200 dark:border-gray-700">
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Source Card</h4>
              <div class="flex justify-center mt-8">
                {#if sourceCard}
                  <Card 
                    card={sourceCard}
                    searchTerm=""
                    showActions={false}
                    xPaddingClass="px-2"
                    key={sourceCard?.id || 'no-id'}
                  />
                {:else}
                  <div class="w-64 h-80 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center">
                    <p class="text-gray-500 dark:text-gray-400 text-sm">No source card</p>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Middle: Action Area -->
            <div class="w-1/3 p-4 flex flex-col items-center justify-start relative">
              <!-- Tab Navigation -->
              <div class="flex gap-2 mb-6">
                <button
                  class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors {activeTab === 'conjure' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}"
                  on:click={() => activeTab = 'conjure'}
                >
                  <Sparkles size="16" />
                  Conjure
                </button>
                <button
                  class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors {activeTab === 'weave' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}"
                  on:click={() => activeTab = 'weave'}
                >
                  <Layers size="16" />
                  Weave
                </button>
                <button
                  class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors {activeTab === 'divine' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}"
                  on:click={() => activeTab = 'divine'}
                >
                  <Eye size="16" />
                  Divine
                </button>
              </div>

              <div class="text-center mb-6">
                <Eye size="48" class="mx-auto text-green-500 mb-4" />
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Divine</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">Generate 3 derivative cards from the concept</p>
              </div>

              <!-- Search -->
              <div class="w-full mb-4">
                <input
                  type="text"
                  placeholder="Search cards..."
                  bind:value={searchQuery}
                  class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <!-- Action Button -->
              {#if selectedCards.length >= 1}
                <button
                  class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-lg font-semibold"
                  on:click={performDivine}
                  disabled={loading}
                >
                  {#if loading}
                    <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {:else}
                    <Eye size="16" />
                  {/if}
                  Divine Insights
                </button>
              {:else}
                <div class="text-center text-gray-500 dark:text-gray-400 text-sm">
                  Select a card to divine from
                </div>
              {/if}
            </div>

            <!-- Right: Card Selection -->
            <div class="w-1/3 p-4 border-l border-gray-200 dark:border-gray-700 flex flex-col">

              <!-- Selected Cards -->
              {#if selectedCards.length > 0}
                <div class="mb-4">
                  <h5 class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Selected Cards</h5>
                  <div class="flex flex-col items-center space-y-3 pl-4">
                    {#each selectedCards as card}
                      <div class="relative w-full max-w-[280px]">
                        <Card 
                          {card}
                          showActions={false}
                          xPaddingClass="px-2"
                        />
                        <button
                          class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10"
                          on:click={() => removeCard(card.id)}
                        >
                          <X size="12" />
                        </button>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              <!-- Available Cards -->
              <div class="flex-1 flex flex-col">
                <div class="flex items-center justify-between mb-2">
                  <h5 class="text-xs font-medium text-gray-600 dark:text-gray-400">Available Cards</h5>
                  <div class="flex gap-2">
                    <button
                      class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      on:click={selectAllAvailableCards}
                    >
                      Select All
                    </button>
                    <button
                      class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      on:click={deselectAllAvailableCards}
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <div class="flex-1 -mt-4 mt-4">
                  <FannedCardDeck 
                    cards={filteredCards}
                    selectedCards={selectedAvailableCards}
                    allowSelection={true}
                    containerHeight="h-[28rem]"
                    on:selection-change={(e) => selectedAvailableCards = e.detail.selectedCards}
                  />
                </div>
                <div class="text-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Hold shift and hover for full card view
                </div>
                <div class="flex justify-between items-center mt-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <span class="text-sm text-gray-600 dark:text-gray-400">
                    {selectedAvailableCards.size} of {filteredCards.length} selected
                  </span>
                  <button
                    class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    on:click={addSelectedCards}
                    disabled={selectedAvailableCards.size === 0}
                  >
                    Add Selected ({selectedAvailableCards.size})
                  </button>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Result Overlay -->
      {#if conjureResult || weaveResult || divineResults.length > 0}
        <div class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" on:click={closeResult}>
          <div class="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto" on:click|stopPropagation>
            {#if conjureResult}
              <div class="flex items-center justify-between mb-4">
                <h4 class="text-lg font-semibold text-gray-900 dark:text-white">✨ Conjured Card</h4>
                <button
                  class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  on:click={closeResult}
                  title="Close results"
                >
                  <X size="20" />
                </button>
              </div>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                  <input
                    type="text"
                    bind:value={conjureResult.title}
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
                  <textarea
                    bind:value={conjureResult.content}
                    rows="10"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  ></textarea>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    bind:value={conjureResult.tags}
                    placeholder="Enter tags separated by commas"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div class="flex gap-2">
                  <button
                    class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    on:click={saveConjureResult}
                  >
                    Save Card
                  </button>
                  <button
                    class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    on:click={() => conjureResult = null}
                  >
                    Regenerate
                  </button>
                </div>
              </div>
            {:else if weaveResult}
              <div class="flex items-center justify-between mb-4">
                <h4 class="text-lg font-semibold text-gray-900 dark:text-white">🧵 Woven Card</h4>
                <button
                  class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  on:click={closeResult}
                  title="Close results"
                >
                  <X size="20" />
                </button>
              </div>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                  <input
                    type="text"
                    bind:value={weaveResult.title}
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
                  <textarea
                    bind:value={weaveResult.content}
                    rows="6"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  ></textarea>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    bind:value={weaveResult.tags}
                    placeholder="Enter tags separated by commas"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div class="flex gap-2">
                  <button
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    on:click={saveWeaveResult}
                  >
                    Save Card
                  </button>
                  <button
                    class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    on:click={() => weaveResult = null}
                  >
                    Regenerate
                  </button>
                </div>
              </div>
            {:else if divineResults.length > 0}
              <div class="flex flex-col h-full">
                <div class="flex items-center justify-between mb-4">
                  <h4 class="text-lg font-semibold text-gray-900 dark:text-white">🔮 Divined Cards</h4>
                  <div class="flex items-center gap-2">
                    <button
                      class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      on:click={closeResult}
                      title="Close results"
                    >
                      <X size="20" />
                    </button>
                  </div>
                </div>
                <div class="flex items-center justify-between mb-4">
                  <div class="flex gap-2">
                    <button
                      class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      on:click={selectAllDivineCards}
                    >
                      Select All
                    </button>
                    <button
                      class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      on:click={deselectAllDivineCards}
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <div class="flex-1 -mt-4 mt-4">
                  <FannedCardDeck 
                    cards={divineResults}
                    selectedCards={selectedDivineCards}
                    allowSelection={true}
                    containerHeight="h-[28rem]"
                    on:selection-change={(e) => selectedDivineCards = e.detail.selectedCards}
                  />
                </div>
                <div class="text-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Hold shift and hover for full card view
                </div>
                <div class="flex justify-between items-center mt-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <span class="text-sm text-gray-600 dark:text-gray-400">
                    {selectedDivineCards.size} of {divineResults.length} selected
                  </span>
                  <button
                    class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    on:click={saveSelectedDivineCards}
                    disabled={selectedDivineCards.size === 0}
                  >
                    Save Selected Cards ({selectedDivineCards.size})
                  </button>
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
