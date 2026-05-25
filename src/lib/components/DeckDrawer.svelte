<script>
  import { createEventDispatcher } from 'svelte';
  import { X, Plus, GripVertical, Search } from 'lucide-svelte';

  export let isOpen = false;
  export let currentWorld = 'Bednomancer World';
  export let decks = [];

  const dispatch = createEventDispatcher();

  let searchQuery = '';
  let draggedDeck = null;
  let dragOverIndex = -1;
  let dragOverSection = null; // 'pinned' or 'unpinned'

  // Mock data for now
  $: filteredDecks = decks.filter(deck => 
    deck.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  

  // Simple array - always use the user's arbitrary order (drag and drop order)
  $: displayDecks = (() => {
    // When dragging, use the actual order to maintain correct indices
    if (draggedDeck) {
      return [...filteredDecks];
    }
    
    // Always use the actual order from the parent (respects drag and drop)
    return [...filteredDecks];
  })();

  function toggleDrawer() {
    isOpen = !isOpen;
    dispatch('toggle', { isOpen });
  }

  function createNewDeck() {
    dispatch('create-deck');
  }


  function handleDragStart(event, deck) {
    draggedDeck = deck;
    event.dataTransfer.setData('text/plain', deck.id);
    event.dataTransfer.effectAllowed = 'move';
    event.target.style.opacity = '0.5';
  }

  function handleDragEnd(event) {
    event.target.style.opacity = '1';
    // Clear draggedDeck after a small delay to prevent immediate clicks after dragging
    setTimeout(() => {
      draggedDeck = null;
    }, 100);
    dragOverIndex = -1;
  }

  function handleDragOver(event, index) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    dragOverIndex = index;
    
    // Determine which section we're hovering over
    const isPinnedSection = event.currentTarget.closest('.pinned-section');
    const isUnpinnedSection = event.currentTarget.closest('.unpinned-section');
    
    if (isPinnedSection) {
      dragOverSection = 'pinned';
    } else if (isUnpinnedSection) {
      dragOverSection = 'unpinned';
    }
  }

  function handleDragLeave(event) {
    // Only clear dragOverIndex if we're leaving the deck item entirely
    if (!event.currentTarget.contains(event.relatedTarget)) {
      dragOverIndex = -1;
      dragOverSection = null;
    }
  }

  function handleDrop(event, dropIndex) {
    event.preventDefault();
    console.log('🎯 DROP EVENT:', { draggedDeck: draggedDeck?.name, dropIndex });
    console.log('🎯 DISPLAY DECKS:', displayDecks.map((d, i) => ({ index: i, name: d.name, id: d.id })));
    
    if (draggedDeck && dropIndex !== undefined) {
      // Simple reorder - no pinned/unpinned separation
      const currentIndex = displayDecks.findIndex(deck => deck.id === draggedDeck.id);
      console.log('📌 REORDER:', { 
        currentIndex, 
        dropIndex, 
        deckName: draggedDeck.name,
        draggedDeckId: draggedDeck.id
      });
      
      if (currentIndex !== dropIndex) {
        console.log('📌 DISPATCHING REORDER EVENT');
        dispatch('reorder-deck', { 
          deckId: draggedDeck.id, 
          fromIndex: currentIndex, 
          toIndex: dropIndex
        });
      } else {
        console.log('📌 SAME POSITION - NO REORDER');
        console.log('📌 DEBUG: Why are they the same?', {
          currentIndex,
          dropIndex,
          draggedDeckId: draggedDeck.id,
          displayDecksLength: displayDecks.length
        });
      }
    }
    dragOverIndex = -1;
    dragOverSection = null;
  }

  function handleKeydown(event) {
    if (event.key === 'Escape' && isOpen) {
      toggleDrawer();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Backdrop -->
{#if isOpen}
  <div 
    class="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-sm"
    on:click={toggleDrawer}
  ></div>
{/if}

<!-- Drawer -->
<div 
  class="fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 z-[9999] border-l border-gray-200 dark:border-gray-700"
  class:translate-x-0={isOpen}
  class:translate-x-full={!isOpen}
>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
      <div>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{currentWorld}</h2>
      </div>
      <button
        class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        on:click={toggleDrawer}
      >
        <X size="20" />
      </button>
    </div>

    <!-- Search and New Deck -->
    <div class="p-4 space-y-3">
      <div class="relative">
        <Search size="16" class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search decks..."
          bind:value={searchQuery}
          class="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      
      <button
        class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        on:click={createNewDeck}
      >
        <Plus size="16" />
        New Deck
      </button>
    </div>

    <!-- All Decks -->
    <div class="flex-1 px-4 pb-4 overflow-y-auto">
      <div class="mb-2">
        <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Decks
          {#if draggedDeck}
            <span class="text-xs text-blue-600 dark:text-blue-400 ml-2">(Drag to reorder)</span>
          {/if}
        </h3>
      </div>
      
      <div class="space-y-1">
        {#each displayDecks as deck, index}
          <div 
            class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer group transition-all {dragOverIndex === index ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-300' : ''}"
            on:click={(e) => {
              // Prevent click if we just finished dragging
              if (draggedDeck) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              console.log('🔍 DeckDrawer: Dispatching view-deck for deck:', deck);
              dispatch('view-deck', { deck });
            }}
            draggable="true"
            on:dragstart={(e) => handleDragStart(e, deck)}
            on:dragend={handleDragEnd}
            on:dragover={(e) => handleDragOver(e, index)}
            on:dragleave={handleDragLeave}
            on:drop={(e) => handleDrop(e, index)}
          >
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <GripVertical size="14" class="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-900 dark:text-white truncate">{deck.name}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">{deck.cardCount} cards</div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Footer -->
    <div class="p-4 border-t border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-end text-sm text-gray-500 dark:text-gray-400">
        <button 
          class="hover:text-gray-700 dark:hover:text-gray-200 transition-colors bg-transparent border-none outline-none"
          style="background: none !important; border: none !important;"
          on:click={toggleDrawer}
        >
          Collapse »
        </button>
      </div>
    </div>
  </div>
</div>
