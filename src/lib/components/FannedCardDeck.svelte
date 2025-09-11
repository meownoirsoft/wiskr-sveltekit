<!-- FannedCardDeck.svelte - MTG/Hearthstone-style fanned card display -->
<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import Card from './Card.svelte';

  export let cards = [];
  export let selectedCards = new Set();
  export let allowSelection = true;
  export let cardWidth = 'w-48';
  export let cardHeight = 'h-64';
  export let maxRotation = 0; // degrees - set to 0 for straight line
  export let cardSpacing = 80; // pixels - more spread out
  export let containerHeight = 'h-96'; // configurable container height
  export let hoverLift = -8; // pixels - subtle lift to show full card

  const dispatch = createEventDispatcher();
  
  let scrollContainer;
  let scrollPosition = 0;
  let scrollStep = 40; // pixels per scroll step - very small steps for precise control
  let hoveredCardIndex = -1; // Track which card is currently hovered

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

  function handleMouseEnter(e, index) {
    if (!allowSelection) return;
    
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
    e.currentTarget.style.transform = baseTransform + ' translateY(-8px)';
  }

  function handleMouseLeave(e, index) {
    if (!allowSelection) return;
    
    // Only remove hover if this is the currently hovered card
    if (hoveredCardIndex === index) {
      hoveredCardIndex = -1;
      e.currentTarget.classList.remove('hovered');
      e.currentTarget.style.zIndex = `${index + 10}`;
      
      // Reset to the base transform
      e.currentTarget.style.transform = cardStyles[index].split(';')[0] + ';';
    }
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
    e.preventDefault();
    e.stopPropagation();
    
    // Use deltaY for vertical wheel movement, but scroll horizontally
    const delta = e.deltaY > 0 ? scrollStep : -scrollStep;
    const maxScroll = getMaxScroll();
    const newPosition = Math.max(0, Math.min(scrollPosition + delta, maxScroll));
    
    console.log('🎡 Wheel scroll:', { 
      deltaY: e.deltaY,
      delta, 
      oldPosition: scrollPosition, 
      newPosition, 
      maxScroll 
    });
    
    if (newPosition !== scrollPosition) {
      scrollPosition = newPosition;
      // Force reactivity update
      scrollPosition = scrollPosition;
      console.log('🎡 Position updated to:', scrollPosition);
    }
  }

  function handleKeydown(e) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const maxScroll = getMaxScroll();
      scrollPosition = Math.max(0, scrollPosition - scrollStep);
      scrollPosition = scrollPosition; // Force reactivity
      console.log('🎡 Arrow left:', { scrollPosition, maxScroll });
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const maxScroll = getMaxScroll();
      scrollPosition = Math.min(maxScroll, scrollPosition + scrollStep);
      scrollPosition = scrollPosition; // Force reactivity
      console.log('🎡 Arrow right:', { scrollPosition, maxScroll });
    }
  }

  function getMaxScroll() {
    if (!scrollContainer || cards.length === 0) {
      console.log('🎡 getMaxScroll: No container or cards');
      return 0;
    }
    
    // Wait for next tick to ensure container is rendered
    setTimeout(() => {
      const containerWidth = scrollContainer.offsetWidth;
      const cardWidth = 192; // w-48 = 192px
      const totalWidth = cards.length * cardSpacing; // Simplified calculation
      const maxScroll = Math.max(0, totalWidth - containerWidth);
      
      console.log('🎡 getMaxScroll calculation:', {
        containerWidth,
        cardWidth,
        cardSpacing,
        cardsLength: cards.length,
        totalWidth,
        maxScroll
      });
    }, 0);
    
    const containerWidth = scrollContainer.offsetWidth;
    const cardWidth = 192; // w-48 = 192px
    const totalWidth = cards.length * cardSpacing; // Simplified calculation
    const maxScroll = Math.max(0, totalWidth - containerWidth);
    
    return maxScroll;
  }


  // Reset scroll position when cards change
  $: if (cards.length > 0) {
    scrollPosition = 0;
  }

  // Debug scroll position changes
  $: console.log('🎡 Scroll position changed:', scrollPosition);
  
  // Force card updates when scroll position changes
  $: scrollPosition, cards.length;
  
  // Reactive card styles - this ensures cards update when scrollPosition changes
  $: cardStyles = cards.map((card, index) => {
    const rotation = (index - (cards.length - 1) / 2) * maxRotation;
    const translateX = index * cardSpacing - scrollPosition;
    const isSelected = selectedCards.has(index);
    
    if (index === 0) {
      console.log('🎡 Reactive card 0 style:', { index, cardSpacing, scrollPosition, translateX });
    }
    
    return `
      transform: rotate(${rotation}deg) translateX(${translateX}px);
      z-index: ${index + 10};
      opacity: 1;
    `;
  });
</script>

  <div 
    class="relative {containerHeight} w-full overflow-hidden"
  bind:this={scrollContainer}
  on:wheel={handleWheel}
  on:keydown={handleKeydown}
  tabindex="0"
  role="application"
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
              on:click={() => handleCardClick(index)}
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
              <Card {card} showActions={false} {isSelected} />
            </div>
      </div>
    {/each}
  </div>
  
  
</div>

<style>
  /* Ensure smooth transitions */
  .absolute {
    transform-origin: center center;
  }
  
</style>
