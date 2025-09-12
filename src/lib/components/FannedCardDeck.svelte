<!-- FannedCardDeck.svelte - MTG/Hearthstone-style fanned card display -->
<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import Card from './Card.svelte';
  import CardPreviewModal from './CardPreviewModal.svelte';

  export let cards = [];
  export let selectedCards = new Set();
  export let allowSelection = true;
  export let cardWidth = 'w-48';
  export let cardHeight = 'h-64';
  export let maxRotation = 0; // degrees - set to 0 for straight line
  export let cardSpacing = 80; // pixels - more spread out
  export let containerHeight = 'h-96'; // configurable container height
  export let allowDrag = false; // Enable drag and drop functionality
  export let autoFit = false; // Auto-fit cards without scrolling when possible
  export let smartSpacing = false; // Use compact spacing when possible, fan only when needed
  export let allowReordering = false; // Enable cards as drop zones for reordering

  const dispatch = createEventDispatcher();
  
  let scrollContainer;
  let scrollPosition = 0;
  let scrollStep = 40; // pixels per scroll step - very small steps for precise control
  let hoveredCardIndex = -1; // Track which card is currently hovered
  let cachedSpacing = null;
  let lastContainerWidth = null;
  let lastCardsLength = null;
  
  // Preview modal state
  let previewCard = null;
  let showPreview = false;
  let hoverTimer = null;
  let hoverTimeout = 1500; // 1.5 seconds

  function toggleCardSelection(index) {
    if (!allowSelection) return;
    
    if (selectedCards.has(index)) {
      selectedCards.delete(index);
    } else {
      selectedCards.add(index);
    }
    
    // Trigger reactivity by reassigning the Set
    selectedCards = selectedCards;
    
    // Also dispatch the selection change to the parent
    dispatch('selection-change', { selectedCards });
  }

  function handleCardClick(index) {
    if (allowSelection) {
      toggleCardSelection(index);
    }
    dispatch('card-click', { card: cards[index], index });
  }

  function handleDragStart(e, card) {
    if (!allowDrag) return;
    e.dataTransfer.setData('text/plain', JSON.stringify(card));
    e.dataTransfer.setData('application/json', JSON.stringify(card));
    e.dataTransfer.effectAllowed = 'move';
    dispatch('drag-start', { card, event: e });
  }

  function handleDragEnd(e) {
    if (!allowDrag) return;
    dispatch('drag-end', { event: e });
  }

  function handleCardDragOver(e, index) {
    if (!allowReordering) return;
    e.preventDefault();
    e.stopPropagation();
    dispatch('card-drag-over', { index, event: e });
  }

  function handleCardDragLeave(e, index) {
    if (!allowReordering) return;
    e.preventDefault();
    e.stopPropagation();
    dispatch('card-drag-leave', { index, event: e });
  }

  function handleCardDrop(e, index) {
    if (!allowReordering) return;
    e.preventDefault();
    e.stopPropagation();
    dispatch('card-drop', { index, event: e });
  }

  function handleCardMouseEnter(index, event) {
    // Only show preview if SHIFT key is held
    if (!event.shiftKey) {
      return;
    }

    startPreviewTimer(index);
  }

  function startPreviewTimer(index) {
    // Clear any existing timer
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }

    // Set new timer for preview
    hoverTimer = setTimeout(() => {
      previewCard = cards[index];
      showPreview = true;
    }, hoverTimeout);
  }

  function handleCardMouseLeave(index) {
    // Clear timer if mouse leaves before timeout
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
  }

  function closePreview() {
    showPreview = false;
    previewCard = null;
  }

  function handleMouseEnter(e, index) {
    // Clear any previously hovered card
    if (hoveredCardIndex >= 0 && hoveredCardIndex !== index) {
      const prevCard = scrollContainer?.querySelector(`[data-card-index="${hoveredCardIndex}"]`);
      if (prevCard) {
        prevCard.classList.remove('hovered');
        prevCard.style.zIndex = `${hoveredCardIndex + 10}`;
      }
    }
    
    // Set new hovered card
    hoveredCardIndex = index;
    e.currentTarget.classList.add('hovered');
    e.currentTarget.style.zIndex = '100';
    
    // Apply hover transform that preserves the base transform
    const baseTransform = cardStyles[index].split(';')[0];
    const hoverTransform = baseTransform + ' translateY(-12px) scale(1.05)';
    e.currentTarget.style.transform = hoverTransform;

    // Start preview timer
    handleCardMouseEnter(index, e);
  }

  function handleMouseLeave(e, index) {
    // Only remove hover if this is the currently hovered card
    if (hoveredCardIndex === index) {
      hoveredCardIndex = -1;
      e.currentTarget.classList.remove('hovered');
      e.currentTarget.style.zIndex = `${index + 10}`;
      
      // Reset to the base transform
      const baseTransform = cardStyles[index].split(';')[0] + ';';
      e.currentTarget.style.transform = baseTransform;
    }

    // Clear preview timer
    handleCardMouseLeave(index);
  }


  function getCardStyle(index) {
    const rotation = (index - (cards.length - 1) / 2) * maxRotation;
    const translateX = index * cardSpacing - scrollPosition;
    const isSelected = selectedCards.has(index);
    
    if (index === 0) {
      console.log('🎡 Card 0 style:', { index, cardSpacing, scrollPosition, translateX });
    }
    
    return `
      transform: rotate(${rotation}deg) translateX(${translateX}px);
      z-index: ${index + 10};
      opacity: 1;
    `;
  }

  function handleWheel(e) {
    // If autoFit is enabled and all cards fit, don't scroll
    if (autoFit && !needsScrolling()) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    // Use deltaY for vertical wheel movement, but scroll horizontally
    const delta = e.deltaY > 0 ? scrollStep : -scrollStep;
    const maxScroll = getMaxScroll();
    const newPosition = Math.max(0, Math.min(scrollPosition + delta, maxScroll));
    
    if (newPosition !== scrollPosition) {
      scrollPosition = newPosition;
      // Force reactivity update
      scrollPosition = scrollPosition;
    }
  }

  function handleKeydown(e) {
    // Handle SHIFT key for preview activation
    if (e.key === 'Shift' && hoveredCardIndex >= 0) {
      startPreviewTimer(hoveredCardIndex);
      return;
    }

    // If autoFit is enabled and all cards fit, don't scroll
    if (autoFit && !needsScrolling()) {
      return;
    }
    
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const maxScroll = getMaxScroll();
      scrollPosition = Math.max(0, scrollPosition - scrollStep);
      scrollPosition = scrollPosition; // Force reactivity
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const maxScroll = getMaxScroll();
      scrollPosition = Math.min(maxScroll, scrollPosition + scrollStep);
      scrollPosition = scrollPosition; // Force reactivity
    }
  }

  function needsScrolling() {
    if (!scrollContainer || cards.length === 0) {
      return false;
    }
    
    const containerWidth = scrollContainer.offsetWidth;
    const currentSpacing = getOptimalSpacing();
    const totalWidth = cards.length * currentSpacing;
    return totalWidth > containerWidth;
  }

  function getOptimalSpacing() {
    if (!smartSpacing || !scrollContainer || cards.length === 0) {
      return cardSpacing;
    }
    
    const containerWidth = scrollContainer.offsetWidth;
    
    // Use cached result if container width and cards length haven't changed
    if (cachedSpacing !== null && lastContainerWidth === containerWidth && lastCardsLength === cards.length) {
      return cachedSpacing;
    }
    
    const cardWidth = 192; // w-48 = 192px
    
    // First, check if cards fit with full spacing (no overlap)
    const fullSpacing = cardWidth;
    const totalWidthWithFullSpacing = cards.length * fullSpacing;
    
    let result;
    
    // If all cards fit with full spacing, use full spacing (no overlap)
    if (totalWidthWithFullSpacing <= containerWidth) {
      result = fullSpacing;
    } else {
      // If cards don't fit with full spacing, calculate the optimal spacing to fill available space
      const optimalSpacing = (containerWidth - cardWidth) / Math.max(1, cards.length - 1);
      if (optimalSpacing >= cardWidth * 0.5) { // Only use if spacing is at least half the card width
        result = optimalSpacing;
      } else {
        // If cards still don't fit, calculate the minimum spacing needed to fit all cards
        const minSpacing = (containerWidth - cardWidth) / Math.max(1, cards.length - 1);
        result = Math.max(cardWidth * 0.2, minSpacing); // Minimum 20% of card width
      }
    }
    
    // Cache the result
    cachedSpacing = result;
    lastContainerWidth = containerWidth;
    lastCardsLength = cards.length;
    
    return result;
  }

  function getMaxScroll() {
    if (!scrollContainer || cards.length === 0) {
      return 0;
    }
    
    const containerWidth = scrollContainer.offsetWidth;
    const currentSpacing = getOptimalSpacing();
    const totalWidth = cards.length * currentSpacing;
    const maxScroll = Math.max(0, totalWidth - containerWidth);
    
    return maxScroll;
  }


  // Reset scroll position when cards change
  $: if (cards.length > 0) {
    scrollPosition = 0;
  }

  // Force card updates when scroll position changes
  $: scrollPosition, cards.length;
  
  // Reactive card styles - this ensures cards update when scrollPosition changes
  $: cardStyles = cards.map((card, index) => {
    const rotation = (index - (cards.length - 1) / 2) * maxRotation;
    const currentSpacing = getOptimalSpacing();
    
    let translateX = index * currentSpacing - scrollPosition;
    
    // If autoFit is enabled and all cards fit, center them
    if (autoFit && !needsScrolling() && scrollContainer) {
      const containerWidth = scrollContainer.offsetWidth;
      const totalWidth = cards.length * currentSpacing;
      const offset = (containerWidth - totalWidth) / 2;
      translateX = index * currentSpacing + offset;
    }
    
    const isSelected = selectedCards.has(index);
    
    return `
      transform: rotate(${rotation}deg) translateX(${translateX}px);
      z-index: ${index + 10};
      opacity: 1;
    `;
  });
</script>

  <div 
    class="relative {containerHeight} w-full overflow-hidden focus:outline-none"
    bind:this={scrollContainer}
    on:wheel={handleWheel}
    on:keydown={handleKeydown}
    role="region"
    tabindex="-1"
    aria-label="Card deck with horizontal scrolling"
    aria-live="polite"
    style="overflow: hidden !important;"
  >
  <!-- Viewport container that shows only a portion of the cards -->
  <div class="relative w-full h-full flex items-start justify-start pt-4">
    {#each cards as card, index}
      {@const isSelected = allowSelection && selectedCards.has(index)}
      
      <div 
        class="absolute cursor-pointer transition-transform duration-200 ease-out"
        style={cardStyles[index]}
        data-card-index={index}
        draggable={allowDrag}
        on:click={() => handleCardClick(index)}
        on:dragstart={(e) => handleDragStart(e, card)}
        on:dragend={handleDragEnd}
        on:dragover={(e) => handleCardDragOver(e, index)}
        on:dragleave={(e) => handleCardDragLeave(e, index)}
        on:drop={(e) => handleCardDrop(e, index)}
        on:mouseenter={(e) => handleMouseEnter(e, index)}
        on:mouseleave={(e) => handleMouseLeave(e, index)}
        role="button"
        tabindex="0"
        on:keydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick(index);
          }
        }}
      >
        <div class="{cardWidth} {cardHeight} relative">
          <!-- Debug: Log card data for first card -->
          {#if index === 0}
            {console.log('🔍 FannedCardDeck card data:', card)}
          {/if}
          <Card 
            {card} 
            showActions={true} 
            {isSelected}
            on:progress-change={(e) => { console.log('🔍 FannedCardDeck: progress-change event received:', e.detail); dispatch('progress-change', e.detail); }}
            on:rarity-upgrade={(e) => { console.log('🔍 FannedCardDeck: rarity-upgrade event received:', e.detail); dispatch('rarity-upgrade', e.detail); }}
            on:rarity-downgrade={(e) => { console.log('🔍 FannedCardDeck: rarity-downgrade event received:', e.detail); dispatch('rarity-downgrade', e.detail); }}
          />
        </div>
      </div>
    {/each}
  </div>
  
  
</div>

<!-- Preview Modal -->
<CardPreviewModal 
  card={previewCard} 
  isOpen={showPreview} 
  on:close={closePreview} 
/>

<style>
  /* Ensure smooth transitions */
  .absolute {
    transform-origin: center center;
  }
  
</style>
