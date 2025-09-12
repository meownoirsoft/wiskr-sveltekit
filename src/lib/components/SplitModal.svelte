<!-- SplitModal.svelte - Magical card splitting interface -->
<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { X, Sparkles, Layers, Eye, Wand2, BookOpen, Lightbulb, Scissors, Compass, Clock } from 'lucide-svelte';
  import Card from './Card.svelte';
  import FannedCardDeck from './FannedCardDeck.svelte';
  import { markCardAsNew } from '$lib/stores/newCards.js';

  export let isOpen = false;
  export let sourceCard = null;
  export let projectId = null;

  const dispatch = createEventDispatcher();

  let loading = false;
  let activeTab = 'dismantle';
  let searchQuery = '';

  // Split feature states
  let dismantleResult = null;
  let refractResult = null;
  let unfoldResult = null;
  
  // Selection states for each split type
  let selectedDismantleCards = new Set();
  let selectedRefractCards = new Set();
  let selectedUnfoldCards = new Set();

  $: if (isOpen && sourceCard) {
    // Reset state when modal opens
    dismantleResult = null;
    refractResult = null;
    unfoldResult = null;
    activeTab = 'dismantle';
  }

  const splitTypes = [
    {
      id: 'dismantle',
      name: 'Dismantle',
      description: 'Extract distinct elements from the card',
      icon: Scissors,
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'refract',
      name: 'Refract', 
      description: 'Split by perspective: characters, setting, conflict, theme',
      icon: Compass,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'unfold',
      name: 'Unfold',
      description: 'Break down into timeline or sequential steps',
      icon: Clock,
      color: 'from-green-500 to-emerald-500'
    }
  ];

  async function performSplit(type) {
    if (!sourceCard) return;
    
    loading = true;
    
    try {
      const response = await fetch(`/api/cards/split/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardId: sourceCard.id,
          projectId: projectId
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        switch (type) {
          case 'dismantle':
            dismantleResult = result;
            break;
          case 'refract':
            refractResult = result;
            break;
          case 'unfold':
            unfoldResult = result;
            break;
        }
      } else {
        console.error(`Failed to perform ${type} split:`, response.status);
      }
    } catch (error) {
      console.error(`Error performing ${type} split:`, error);
    } finally {
      loading = false;
    }
  }


  function selectAllCards(type) {
    switch (type) {
      case 'dismantle':
        selectedDismantleCards = new Set(dismantleResult.cards.map((_, index) => index));
        break;
      case 'refract':
        selectedRefractCards = new Set(refractResult.cards.map((_, index) => index));
        break;
      case 'unfold':
        selectedUnfoldCards = new Set(unfoldResult.cards.map((_, index) => index));
        break;
    }
  }

  function deselectAllCards(type) {
    switch (type) {
      case 'dismantle':
        selectedDismantleCards = new Set();
        break;
      case 'refract':
        selectedRefractCards = new Set();
        break;
      case 'unfold':
        selectedUnfoldCards = new Set();
        break;
    }
  }

  function saveSplitResult(type) {
    console.log('🎴 SplitModal: saveSplitResult called for type:', type);
    
    let result;
    let selectedCards;
    
    switch (type) {
      case 'dismantle':
        result = dismantleResult;
        selectedCards = selectedDismantleCards;
        break;
      case 'refract':
        result = refractResult;
        selectedCards = selectedRefractCards;
        break;
      case 'unfold':
        result = unfoldResult;
        selectedCards = selectedUnfoldCards;
        break;
    }

    console.log('🎴 SplitModal: result:', result, 'selectedCards.size:', selectedCards?.size);

    if (result && result.cards && selectedCards.size > 0) {
      console.log('🎴 SplitModal: Dispatching save-card events for', selectedCards.size, 'cards');
      // Dispatch only selected cards as save events
      result.cards.forEach((card, index) => {
        if (selectedCards.has(index)) {
          console.log('🎴 SplitModal: Dispatching save-card event for:', card.title);
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
      
      // Close the modal after saving
      closeModal();
    } else {
      console.error('🎴 SplitModal: No result or no selected cards to save!');
    }
  }

  function closeModal() {
    dispatch('close');
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-[10002] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" on:click={closeModal}>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" on:click|stopPropagation>
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
            <Scissors size="24" class="text-white" />
          </div>
          <div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Split Cards to Create</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Break down your card into multiple focused pieces</p>
          </div>
        </div>
        <button
          class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          on:click={closeModal}
        >
          <X size="24" />
        </button>
      </div>

      <!-- Source Card and Results Layout -->
      {#if sourceCard}
        <div class="p-6 border-b border-gray-200 dark:border-gray-700">
          <div class="flex gap-6">
            <!-- Source Card -->
            <div class="flex-shrink-0">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Source Card</h3>
              <div class="max-w-xs">
                <Card card={sourceCard} showActions={false} />
              </div>
            </div>
            
            <!-- Results -->
            <div class="flex-1 min-w-0 flex flex-col">
              {#if activeTab === 'dismantle' && dismantleResult}
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Dismantled Elements</h3>
                  <div class="flex gap-2">
                    <button
                      class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      on:click={() => selectAllCards('dismantle')}
                    >
                      Select All
                    </button>
                    <button
                      class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      on:click={() => deselectAllCards('dismantle')}
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <div class="flex-1 -mt-4">
                  <FannedCardDeck 
                    cards={dismantleResult.cards}
                    selectedCards={selectedDismantleCards}
                    allowSelection={true}
                    on:selection-change={(e) => selectedDismantleCards = e.detail.selectedCards}
                  />
                </div>
                <div class="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Hold shift and hover for full card view
                </div>
                <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <span class="text-sm text-gray-600 dark:text-gray-400">
                    {selectedDismantleCards.size} of {dismantleResult.cards.length} selected
                  </span>
                  <button
                    class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    on:click={() => saveSplitResult('dismantle')}
                    disabled={selectedDismantleCards.size === 0}
                  >
                    Save Selected Elements ({selectedDismantleCards.size})
                  </button>
                </div>
              {:else if activeTab === 'refract' && refractResult}
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Refracted Perspectives</h3>
                  <div class="flex gap-2">
                    <button
                      class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      on:click={() => selectAllCards('refract')}
                    >
                      Select All
                    </button>
                    <button
                      class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      on:click={() => deselectAllCards('refract')}
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <div class="flex-1 -mt-4">
                  <FannedCardDeck 
                    cards={refractResult.cards}
                    selectedCards={selectedRefractCards}
                    allowSelection={true}
                    on:selection-change={(e) => selectedRefractCards = e.detail.selectedCards}
                  />
                </div>
                <div class="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Hold shift and hover for full card view
                </div>
                <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <span class="text-sm text-gray-600 dark:text-gray-400">
                    {selectedRefractCards.size} of {refractResult.cards.length} selected
                  </span>
                  <button
                    class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    on:click={() => saveSplitResult('refract')}
                    disabled={selectedRefractCards.size === 0}
                  >
                    Save Selected Perspectives ({selectedRefractCards.size})
                  </button>
                </div>
              {:else if activeTab === 'unfold' && unfoldResult}
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Unfolded Timeline</h3>
                  <div class="flex gap-2">
                    <button
                      class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      on:click={() => selectAllCards('unfold')}
                    >
                      Select All
                    </button>
                    <button
                      class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      on:click={() => deselectAllCards('unfold')}
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <div class="flex-1 -mt-4">
                  <FannedCardDeck 
                    cards={unfoldResult.cards}
                    selectedCards={selectedUnfoldCards}
                    allowSelection={true}
                    on:selection-change={(e) => selectedUnfoldCards = e.detail.selectedCards}
                  />
                </div>
                <div class="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Hold shift and hover for full card view
                </div>
                <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <span class="text-sm text-gray-600 dark:text-gray-400">
                    {selectedUnfoldCards.size} of {unfoldResult.cards.length} selected
                  </span>
                  <button
                    class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    on:click={() => saveSplitResult('unfold')}
                    disabled={selectedUnfoldCards.size === 0}
                  >
                    Save Selected Steps ({selectedUnfoldCards.size})
                  </button>
                </div>
              {:else}
                <div class="text-center py-12">
                  <div class="text-gray-400 dark:text-gray-500 mb-4">
                    <Scissors size="48" class="mx-auto" />
                  </div>
                  <p class="text-gray-500 dark:text-gray-400">Choose a split type and cast your spell to see results</p>
                  <p class="text-sm text-gray-400 dark:text-gray-500 mt-2">Your original card will not be affected</p>
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/if}

      <!-- Split Types Tabs -->
      <div class="p-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {#each splitTypes as splitType}
            <button
              class="p-4 rounded-lg border-2 transition-all hover:scale-105 {activeTab === splitType.id ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}"
              on:click={() => activeTab = splitType.id}
            >
              <div class="flex items-center gap-3 mb-2">
                <div class="p-2 bg-gradient-to-r {splitType.color} rounded-lg">
                  <svelte:component this={splitType.icon} size="20" class="text-white" />
                </div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{splitType.name}</h3>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400">{splitType.description}</p>
            </button>
          {/each}
        </div>

        <!-- Split Action -->
        <div class="flex justify-center mb-6">
          <button
            class="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all hover:scale-105 font-medium flex items-center gap-2"
            on:click={() => performSplit(activeTab)}
            disabled={loading}
          >
            {#if loading}
              <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Channeling Magic...</span>
            {:else}
              <Sparkles size="20" />
              <span>Cast {splitTypes.find(t => t.id === activeTab)?.name}</span>
            {/if}
          </button>
        </div>

      </div>
    </div>
  </div>
{/if}
