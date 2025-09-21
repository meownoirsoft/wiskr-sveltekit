<!-- FannedCardDeck.svelte - MTG/Hearthstone-style fanned card display -->
<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import Card from './Card.svelte';
  import CardPreviewModal from './CardPreviewModal.svelte';

  export let cards = [];
  export let selectedCards = new Set();
  export let allowSelection = true;
  export let maxRotation = 0; // degrees - set to 0 for straight line
  export let cardSpacing = 30; // pixels - overlapping cards (cards are 250px wide)
  export let containerHeight = 'h-[350px]'; // match card height
  export let containerWidth = 'w-full'; // full width to show all cards
  export let allowDrag = false; // Enable drag and drop functionality
  export let autoFit = false; // Auto-fit cards without scrolling when possible
  export let smartSpacing = false; // Use compact spacing when possible, fan only when needed
  export let allowReordering = false; // Enable cards as drop zones for reordering

  const dispatch = createEventDispatcher();
  
  let scrollContainer;
  let scrollPosition = 0;
  let scrollStep = 40; // pixels per scroll step - very small steps for precise control
  let hoveredCardIndex = -1; // Track which card is currently hovered
  let hoveredCard = null; // Track which card is hovered for full display
  let cachedSpacing = null;
  let lastContainerWidth = null;
  let lastCardsLength = null;
  let actualContainerWidth = 0; // Track actual container width
  
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
  
  function handleCardHover(index) {
    hoveredCardIndex = index;
    hoveredCard = index >= 0 ? cards[index] : null;
  }
  
  function handleCardLeave() {
    hoveredCardIndex = -1;
    hoveredCard = null;
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
    const translateX = index * optimalSpacing - scrollPosition;
    const isSelected = selectedCards.has(index);
    
    if (index === 0) {
      console.log('🎡 Card 0 style:', { index, optimalSpacing, scrollPosition, translateX });
    }
    
    return `
      transform: rotate(${rotation}deg) translateX(${translateX}px);
      z-index: ${index + 10};
      opacity: 1;
    `;
  }

  function handleWheel(e) {
    // Only handle scroll if mouse is over a card and we need scrolling
    if (hoveredCardIndex >= 0 && needsScrolling()) {
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

  function measureContainerWidth() {
    if (scrollContainer) {
      const newWidth = scrollContainer.offsetWidth;
      if (newWidth !== actualContainerWidth) {
        const oldWidth = actualContainerWidth;
        actualContainerWidth = newWidth;
        console.log('📏 Container width changed:', { oldWidth, newWidth });
      }
      return newWidth;
    }
    return 0;
  }

  function getOptimalSpacing() {
    if (!scrollContainer || cards.length === 0) {
      console.log('🔧 getOptimalSpacing: No container or cards', { 
        hasContainer: !!scrollContainer, 
        cardsLength: cards.length 
      });
      return cardSpacing;
    }
    
    const currentWidth = measureContainerWidth();
    console.log('🔧 getOptimalSpacing: Starting calculation', { 
      currentWidth, 
      actualContainerWidth,
      cardsLength: cards.length,
      cardSpacing 
    });
    
    if (currentWidth === 0) {
      console.log('🔧 getOptimalSpacing: Container width is 0, using fallback');
      return cardSpacing; // Fallback if container not ready
    }
    
    const cardWidth = 250; // Card component width
    const gaps = Math.max(1, cards.length - 1);
    
    // Check if cards fit with 50px spacing (no overlap needed)
    const standardGap = 50;
    const totalWidthWithStandardGap = cardWidth + (gaps * standardGap);
    
    console.log('🔧 Standard gap check:', {
      currentWidth,
      cardWidth,
      gaps,
      standardGap,
      totalWidthWithStandardGap,
      fitsWithStandardGap: totalWidthWithStandardGap <= currentWidth,
      cardsCount: cards.length
    });
    
    if (totalWidthWithStandardGap <= currentWidth) {
      // Container is bigger than cards width with 50px spacing - calculate optimal spacing to fill width
      console.log('🔧 Container has extra space - calculating optimal spacing to fill width');
      
      // Calculate spacing to fill the container width
      const availableSpace = currentWidth - cardWidth;
      const optimalSpacing = availableSpace / gaps;
      
      // Cap at a reasonable maximum spacing (e.g., 200px) to avoid cards being too far apart
      const maxReasonableSpacing = 200;
      const result = Math.min(optimalSpacing, maxReasonableSpacing);
      
      console.log('🔧 Optimal spacing calculation:', {
        currentWidth,
        cardWidth,
        availableSpace,
        optimalSpacing,
        result,
        cardsCount: cards.length
      });
      
      return result;
    }
    
    // Container is smaller than cards width with 50px spacing - need to add overlap
    console.log('🔧 Container too small for 50px gaps - calculating overlap needed');
    
    // Calculate maximum overlap (50% of card width)
    const maxOverlap = cardWidth * 0.5; // 125px for 250px cards
    const minSpacing = cardWidth - maxOverlap; // 125px minimum spacing (50% visible)
    
    // Calculate minimum spacing needed to fit all cards
    const availableSpace = currentWidth - cardWidth;
    const minSpacingNeeded = availableSpace / gaps;
    
    console.log('🔧 Overlap calculation:', {
      currentWidth,
      cardWidth,
      gaps,
      availableSpace,
      minSpacingNeeded,
      maxOverlap,
      minSpacing
    });
    
    // Use the larger of: minimum spacing needed, or minimum spacing (50% overlap)
    const result = Math.max(minSpacingNeeded, minSpacing);
    
    // Verify the result fits
    const totalWidthWithResult = cardWidth + (gaps * result);
    const fits = totalWidthWithResult <= currentWidth;
    
    console.log('🔧 Final calculation:', {
      result,
      totalWidthWithResult,
      fits,
      overlapPercentage: ((cardWidth - result) / cardWidth * 100).toFixed(1) + '%',
      cardsCount: cards.length
    });
    
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

  // Ensure spacing is recalculated after mount and track container changes
  onMount(() => {
    if (scrollContainer && cards.length > 0) {
      // Small delay to ensure container is fully rendered
      setTimeout(() => {
        optimalSpacing = getOptimalSpacing();
      }, 100);
    }

    // Set up ResizeObserver to track container width changes
    if (scrollContainer) {
      const resizeObserver = new ResizeObserver(() => {
        measureContainerWidth();
        // Recalculate spacing when container size changes
        if (cards.length > 0) {
          optimalSpacing = getOptimalSpacing();
        }
      });
      
      resizeObserver.observe(scrollContainer);
      
      // Cleanup on destroy
      return () => {
        resizeObserver.disconnect();
      };
    }
  });

  // Force card updates when scroll position changes
  $: scrollPosition, cards.length;
  
  // Debug: Log props when they change
  $: console.log('🔧 FannedCardDeck props:', { cardSpacing, cardsLength: cards.length });
  
  // Calculate optimal spacing for current cards and container
  $: optimalSpacing = scrollContainer ? getOptimalSpacing() : cardSpacing;
  $: console.log('🎯 optimalSpacing updated:', { 
    optimalSpacing, 
    cardSpacing, 
    cardsLength: cards.length,
    actualContainerWidth,
    calculationResult: scrollContainer ? getOptimalSpacing() : 'no container'
  });
  
  // Recalculate spacing when container width or cards change
  $: if (scrollContainer && cards.length > 0) {
    console.log('🔄 Recalculating spacing due to change:', { 
      actualContainerWidth, 
      cardsLength: cards.length,
      scrollContainerExists: !!scrollContainer 
    });
    optimalSpacing = getOptimalSpacing();
  }
  
  // Specifically react to container width changes
  $: actualContainerWidth, optimalSpacing = scrollContainer ? getOptimalSpacing() : cardSpacing;
  
  // Simple reactive variables for inline styles
  $: maxRotation = maxRotation;
  $: cardSpacing = cardSpacing;
</script>

  <div 
    class="fanned-deck-container"
    bind:this={scrollContainer}
    on:wheel={handleWheel}
    on:keydown={handleKeydown}
    role="region"
    tabindex="-1"
    aria-label="Card deck with horizontal scrolling"
    aria-live="polite"
  >
  
  <!-- Simple card display -->
  <div class="fanned-deck-viewport">
    {#each cards as card, index}
        <span 
          class="fanned-deck-card-wrapper"
          style="left: {index * optimalSpacing}px; top: 0px; z-index: {hoveredCardIndex === index ? 9999 : index + 10};"
        >
          <div 
            class="fanned-deck-card"
            on:click={() => handleCardClick(index)}
            on:mouseenter={() => handleCardHover(index)}
            on:mouseleave={handleCardLeave}
          >
            <Card 
              {card} 
              showActions={false}
              inFannedDeck={true}
              draggable={allowDrag}
              on:dragstart={(e) => handleDragStart(e, card)}
              on:dragend={handleDragEnd}
            />
          </div>
        </span>
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
  .fanned-deck-container {
    position: relative;
    width: 100%;
    height: 350px;
    overflow: hidden;
  }
  
  .fanned-deck-viewport {
    position: relative;
    width: 100%;
    height: 100%;
  }
  
  .fanned-deck-card-wrapper {
    position: absolute;
    width: 250px;
    height: 350px;
  }
  
  .fanned-deck-card {
    position: absolute;
    width: 250px;
    height: 350px;
  }
  
  /* Ensure hovered card appears on top */
  .fanned-deck-card-wrapper:hover {
    z-index: 9999 !important;
  }
  
  /* Simple text shadow for all text in fanned deck cards */
  .fanned-deck-card * {
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
  }
  
  /* Force rarity colors to show on fanned deck cards */
  .fanned-deck-card :global(.card-title) {
    color: inherit !important;
  }
  
  .fanned-deck-card :global(.card-rarity) {
    color: inherit !important;
  }
  
  /* Override any white text styling */
  .fanned-deck-card :global(h3) {
    color: inherit !important;
  }
  
  .fanned-deck-card :global(span) {
    color: inherit !important;
  }
  
  /* Simple card styling - let cards use their own styles */
  .fanned-deck-container :global(.card-container) {
    border-radius: 8px !important;
  }
  
  .fanned-deck-container :global(.card-frame) {
    border-radius: 8px !important;
  }
  
  /* Simple text shadow for all text in fanned deck cards */
  .fanned-deck-card * {
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
  }
  
  /* Override button background on fanned deck cards - preserve rarity colors */
  .fanned-deck-card :global(.card-container) {
    /* Let the Card component's inline style handle the background color */
  }
  
  .fanned-deck-card :global(.card-frame) {
    background-color: transparent !important;
  }
  
  /* Fix corners by targeting specific elements that get the white background */
  .fanned-deck-card :global(.title-container) {
    background-color: transparent !important;
  }
  
  .fanned-deck-card :global(.content-area) {
    background-color: transparent !important;
  }
  
  .fanned-deck-card :global(.art-area) {
    background-color: transparent !important;
  }
  
  /* Override any button-like elements that might be getting white background */
  .fanned-deck-card :global(div:not(.card-container)) {
    background-color: transparent !important;
  }
  
  /* Simple approach - only override what's causing the corner issue */
  .fanned-deck-card-wrapper :global(div:not(.card-container):not(.title-container):not(.content-area):not(.art-area):not(.card-frame)) {
    background-color: transparent !important;
  }
  
  /* Restore title background with higher specificity */
  .fanned-deck-card-wrapper :global(.title-container) {
    background: #E1D5C4 !important;
    background-color: #E1D5C4 !important;
    border: 1px solid rgba(0, 0, 0, 0.1) !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
  }
  
  /* Force title container background */
  .fanned-deck-card-wrapper :global(div.title-container) {
    background-color: #E1D5C4 !important;
  }
  
  /* Restore rarity tag background and apply same text color as title */
  .fanned-deck-card-wrapper :global(.card-rarity) {
    background-color: white !important;
    color: unset !important;
    text-shadow: rgba(0, 0, 0, 0.2) 0px 2px 4px !important;
  }
  
  /* Force rarity tag to use inline style color */
  .fanned-deck-card-wrapper :global(.card-rarity[style*="color"]) {
    color: unset !important;
  }
  
  .fanned-deck-card-wrapper :global(.bg-white) {
    background-color: white !important;
  }
  
  /* Make card tags text white */
  .fanned-deck-card-wrapper :global(.card-tags) {
    color: white !important;
  }
  
  /* Make "No tags yet" message darker gray */
  .fanned-deck-card-wrapper :global(.text-gray-400),
  .fanned-deck-card-wrapper :global(.text-gray-500) {
    color: rgb(107, 114, 128) !important;
  }
</style>
