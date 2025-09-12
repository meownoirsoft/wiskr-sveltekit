<!-- Card.svelte - Clean MTG-style idea card component -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { Pin, PinOff, Pencil, Trash, MoreHorizontal, Star, Split, Merge, Palette, X } from 'lucide-svelte';
  import { newCardIds, markCardAsSeen } from '$lib/stores/newCards.js';

  export let card = null;
  export let searchTerm = '';
  export let isSelected = false;
  export let showActions = true;
  export let showRemoveButton = false;
  export let xPaddingClass = 'px-2';
  export let isNew = false;
  
  // Check if this card is new
  $: isNewCard = isNew || (card?.id && $newCardIds.has(card.id));


  const dispatch = createEventDispatcher();

  // Progress levels (1-5 stars)
  const progressLevels = [
    { level: 1, name: 'Raw', color: '#6b7280' },
    { level: 2, name: 'Rough', color: '#f97316' },
    { level: 3, name: 'Crystal', color: '#ef4444' },
    { level: 4, name: 'Cut', color: '#1d4ed8' },
    { level: 5, name: 'Shimmer', color: '#7c3aed' }
  ];

  // Rarity configurations with explicit colors
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

  let showMenu = false;
  let menuPosition = { top: 0, left: 0 };

  function getProgressInfo(level) {
    return progressLevels.find(p => p.level === level) || progressLevels[0];
  }

  function getRarityConfig(rarity) {
    return rarityConfig[rarity] || rarityConfig.common;
  }

  function isDarkMode() {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark') || 
           window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function highlightText(text, term) {
    if (!term || !text) return text;
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  }

  // Helper function to generate a title from content
  function generateTitle(card) {
    if (card?.title) return card.title;
    if (card?.key) return card.key;
    if (card?.content) {
      // Take first 3-5 words from content as title
      const words = card.content.split(' ').slice(0, 5);
      let title = words.join(' ');
      // Remove trailing punctuation and add ellipsis if truncated
      title = title.replace(/[.,;:!?]+$/, '');
      if (card.content.split(' ').length > 5) {
        title += '...';
      }
      return title;
    }
    return 'Untitled Card';
  }

  function toggleMenu(event) {
    event.stopPropagation();
    if (showMenu) {
      showMenu = false;
      return;
    }

    // Use currentTarget to get the button element, not the SVG icon
    const rect = event.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate menu position
    let top = rect.bottom + window.scrollY + 5;
    let left = rect.left + window.scrollX;
    
    // Adjust if menu would go off-screen
    const menuWidth = 128; // min-w-32 = 128px
    const menuHeight = 120; // estimated height
    
    // Check right edge
    if (left + menuWidth > viewportWidth) {
      left = rect.right + window.scrollX - menuWidth;
    }
    
    // Check bottom edge
    if (top + menuHeight > viewportHeight + window.scrollY) {
      top = rect.top + window.scrollY - menuHeight - 5;
    }
    
    // Ensure menu doesn't go off left edge
    if (left < 0) {
      left = 5;
    }
    
    // Ensure menu doesn't go off top edge
    if (top < window.scrollY) {
      top = window.scrollY + 5;
    }
    
    menuPosition = { top, left };
    showMenu = true;
  }

  function handleCardClick() {
    // Remove new badge when card is clicked
    if (isNewCard && card?.id) {
      markCardAsSeen(card.id);
      dispatch('new-badge-removed', { card });
    }
    dispatch('card-click', { card });
  }

  function handleProgressClick(event, targetLevel) {
    event.stopPropagation();
    console.log('Card: Progress click for card:', card.id, 'target level:', targetLevel, 'current level:', card.progress);
    dispatch('progress-change', { card, targetLevel });
  }

  function handleRarityUpgrade(event) {
    event.stopPropagation();
    console.log('Card: Rarity upgrade clicked for card:', card.id, 'current rarity:', card.rarity, 'timestamp:', Date.now());
    dispatch('rarity-upgrade', { card });
  }

  function handleRarityDowngrade(event) {
    event.stopPropagation();
    console.log('Card: Rarity downgrade clicked for card:', card.id, 'current rarity:', card.rarity);
    dispatch('rarity-downgrade', { card });
  }

  function handlePinClick(event) {
    event.stopPropagation();
    dispatch('pin-toggle', { card });
  }

  function handleEditClick(event) {
    event.stopPropagation();
    dispatch('edit', { card });
  }

  function handleDeleteClick(event) {
    event.stopPropagation();
    event.preventDefault();
    // Close menu immediately
    showMenu = false;
    // Dispatch delete event immediately
    dispatch('delete', { card });
  }

  function handleSplitClick(event) {
    event.stopPropagation();
    dispatch('split', { card });
  }

  function handleMergeClick(event) {
    event.stopPropagation();
    dispatch('merge', { card });
  }

  function handleGenerateArtClick(event) {
    event.stopPropagation();
    dispatch('generate-art', { card });
  }

  function handleRemoveClick(event) {
    event.stopPropagation();
    dispatch('remove', { card });
  }

  // Mana cost - tracks user engagement
  $: manaCost = card?.mana_cost || 0;
  $: rarity = getRarityConfig(card?.rarity || 'common');
  $: progress = getProgressInfo(card?.progress || 1);
  let darkMode = false;
  
  // Check dark mode once on mount and when needed
  if (typeof window !== 'undefined') {
    darkMode = isDarkMode();
  }

  // Title scrolling functionality
  let titleElement;
  let titleScrollDuration = 1000; // Default duration in ms
  
  // Tooltip state
  let showProgressTooltip = false;
  let tooltipElement;

  function handleTitleHover() {
    if (!titleElement || !titleElement.parentElement) return;
    
    try {
      const container = titleElement.parentElement;
      const titleWidth = titleElement.scrollWidth;
      const containerWidth = container.clientWidth;
      
      // Only scroll if the title is actually wider than the container
      if (titleWidth > containerWidth && titleWidth > 0 && containerWidth > 0) {
        const scrollDistance = titleWidth - containerWidth;
        
        // Calculate duration based on title length - longer titles scroll slower
        // Base duration of 800ms, add 200ms per 50 characters
        const titleLength = (card?.title || card?.key || 'Untitled Card').length;
        titleScrollDuration = Math.max(800, 800 + (titleLength / 50) * 200);
        
        // Apply the dynamic duration
        titleElement.style.transitionDuration = `${titleScrollDuration}ms`;
        
        // Scroll to the left once and stop
        titleElement.style.transform = `translateX(-${scrollDistance}px)`;
      }
    } catch (error) {
      console.warn('Error in handleTitleHover:', error);
    }
  }

  function handleTitleLeave() {
    // Reset position to initial state
    if (titleElement) {
      try {
        titleElement.style.transform = 'translateX(0px)';
      } catch (error) {
        console.warn('Error in handleTitleLeave:', error);
      }
    }
  }

  function handleProgressHover() {
    showProgressTooltip = true;
  }

  function handleProgressLeave() {
    showProgressTooltip = false;
  }

</script>

<div 
  class="card-container relative cursor-pointer transition-all duration-200 hover:shadow-lg"
  style="width: 250px; height: 350px;"
  on:click={handleCardClick}
  on:keydown={(e) => e.key === 'Enter' && handleCardClick()}
  role="button"
  tabindex="0"
>
  {#if showRemoveButton}
    <button
      class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full transition-opacity flex items-center justify-center hover:bg-red-600 z-30"
      on:click={handleRemoveClick}
      title="Remove from section"
    >
      <X size="12" />
    </button>
  {/if}


  <!-- Card Frame with explicit styling -->
  <div 
    class="card-frame border-2 rounded-lg {xPaddingClass} pt-4 pb-2 h-full flex flex-col"
    style="
      width: 100%; 
      height: 100%;
      border-color: {rarity.borderColor};
      background-color: {darkMode ? rarity.bgColorDark : rarity.bgColor};
      color: {darkMode ? rarity.textColorDark : rarity.textColor};
    "
  >
    
    <!-- Header: Title -->
    <div class="mb-2 -mt-2 -mx-2">
      <div 
        class="title-container relative overflow-hidden"
        style="max-width: 100%; background: #E1D5C4; border: 1px solid rgba(0, 0, 0, 0.1); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8); padding: 4px 16px 4px 8px;"
        on:mouseenter={handleTitleHover}
        on:mouseleave={handleTitleLeave}
      >
        <h3 
          class="card-title font-bold text-sm leading-tight whitespace-nowrap transition-transform duration-1000 ease-in-out" 
          style="color: {rarity.textColor}; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);"
          bind:this={titleElement}
        >
          {@html highlightText(card?.title || card?.key || 'Untitled Card', searchTerm)}
        </h3>
      </div>
    </div>

    <!-- Art Area -->
    <div 
      class="art-area relative mb-1 rounded-md flex items-center justify-center -mt-2 z-20" 
      style="height: 120px;"
    >
      <!-- Pin Indicator - Top Left -->
      {#if card?.pinned}
        <div
          class="pin-indicator absolute -top-1 left-0 z-10 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold"
          style:background-color={darkMode ? '#ffffff' : '#ffffff'} 
          style:color={rarity.textColor}
        >
          <Pin size="12" class="fill-current" />
        </div>
      {/if}

      <!-- Mana Cost - Top Corner -->
      {#if card?.rarity === 'common'}
        <!-- Common cards with green gem socket -->
        <div class="absolute -top-2 -right-3 z-10 w-12 h-12">
          <img 
            src="/sockets/gem-socket-green.webp" 
            alt="Mana socket" 
            class="w-full h-full object-cover rounded-full"
          />
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-white font-bold text-sm">{manaCost}</span>
          </div>
        </div>
      {:else if card?.rarity === 'special'}
        <!-- Special cards with blue gem socket -->
        <div class="absolute -top-2 -right-2 z-10 w-10 h-13">
          <img 
            src="/sockets/gem-socket-blue.webp" 
            alt="Mana socket" 
            class="w-full h-full object-cover rounded-full"
          />
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-white font-bold text-sm">{manaCost}</span>
          </div>
        </div>
      {:else if card?.rarity === 'rare'}
        <!-- Rare cards with purple gem socket -->
        <div class="absolute -top-2 -right-3 z-10 w-14 h-14">
          <img 
            src="/sockets/gem-socket-purple.webp" 
            alt="Mana socket" 
            class="w-full h-full object-cover rounded-full"
          />
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-white font-bold text-sm">{manaCost}</span>
          </div>
        </div>
      {:else if card?.rarity === 'legendary'}
        <!-- Legendary cards with orange gem socket -->
        <div class="absolute -top-2 -right-2 z-10 w-12 h-12">
          <img 
            src="/sockets/gem-socket-orange.webp" 
            alt="Mana socket" 
            class="w-full h-full object-cover rounded-full"
          />
          <div class="absolute inset-0 flex items-center justify-center -mt-0.5">
            <span class="text-white font-bold text-sm">{manaCost}</span>
          </div>
        </div>
      {:else}
        <!-- Other rarities with white background -->
        <div
          class="mana-cost absolute -top-1 right-0 z-10 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold"
          style:background-color={darkMode ? '#ffffff' : '#ffffff'} 
          style:color={rarity.textColor}
        >
          <span>{manaCost}</span>
        </div>
      {/if}

      {#if card?.art_url}
        <img 
          src={card.art_url} 
          alt="Card art" 
          class="object-cover rounded-md" 
          style="width: 100%; height: 100%; max-width: 230px; max-height: 120px;"
          draggable="false" 
        />
      {:else}
        <img 
          src="/wiskr-art-default.webp" 
          alt="Default card art" 
          class="object-cover rounded-md" 
          style="width: 100%; height: 100%; max-width: 230px; max-height: 120px;"
          draggable="false" 
        />
      {/if}
    </div>


    <!-- Content Area with Tags -->
    <div class="mx-0 mb-4 -mt-2">
        <!-- Main content area -->
        <div 
          class="card-content content-area text-sm leading-tight overflow-hidden absolute z-10"
          style="padding: 8px 4px; margin-left: 5px; height: 200px; bottom: 40px; right: 7px; border-top: 1px solid rgba(0,0,0,0.1); box-shadow: 0 -2px 8px rgba(0,0,0,0.1);"
        >
        <!-- Tags -->
        <div class="h-6 mb-2 mt-11 ml-2 mr-2 flex items-center">
          {#if card?.tags && card.tags.length > 0}
            <div class="flex gap-1 overflow-hidden whitespace-nowrap">
              {#each card.tags.slice(0, 2) as tag}
                <span 
                  class="card-tags text-xs px-1.5 py-0 rounded-md flex-shrink-0 whitespace-nowrap"
                  style="background-color: {rarity.textColor}; color: {rarity.bgColor}; opacity: 0.8;"
                >
                  {tag}
                </span>
              {/each}
              {#if card.tags.length > 2}
                <span 
                  class="card-tags text-xs px-1.5 py-0 rounded-md flex-shrink-0 whitespace-nowrap"
                  style="background-color: {rarity.textColor}; color: {rarity.bgColor}; opacity: 0.8;"
                >
                  +{card.tags.length - 1}
                </span>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Content Text -->
        <div 
          class="line-clamp-6 px-3 -mt-2"
          style="color: {rarity.textColor};"
        >
          {@html highlightText(card?.content || 'No content', searchTerm)}
        </div>
      </div>
      
    </div>

    <!-- Flavor Text (if exists) -->
    {#if card?.flavor_text}
      <div 
        class="flavor-text mb-3 text-xs italic border-l-2 pl-2"
        style:color={darkMode ? '#9ca3af' : '#6b7280'} 
        style:border-color={darkMode ? '#4b5563' : '#d1d5db'}
      >
        {@html highlightText(card.flavor_text, searchTerm)}
      </div>
    {/if}

    <!-- Bottom Bar: Rarity and Progress -->
    <div class="absolute bottom-2 left-2 right-2 bottom-bar flex items-center flex-wrap gap-y-1">
      <!-- Rarity -->
      <div class="flex items-center gap-0">
        <!-- Left Arrow (Upgrade) -->
        <div class="flex justify-start" class:w-6={(card?.rarity || 'common') !== 'legendary'}>
          {#if (card?.rarity || 'common') !== 'legendary'}
            <button 
              class="text-lg font-bold opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
              on:click={handleRarityUpgrade}
              title="Upgrade rarity"
              style:color={darkMode ? '#ffffff' : '#000000'}
            >
              ↑
            </button>
          {/if}
        </div>
        
        <!-- Rarity Label -->
        <span 
          class="card-rarity text-xs font-bold uppercase bg-white dark:bg-white rounded px-1.5 py-0.5"
          style:color={rarity.textColor}
        >
          {card?.rarity || 'common'}
        </span>
        
        <!-- Right Arrow (Downgrade) -->
        <div class="w-6 flex justify-center">
          {#if (card?.rarity || 'common') !== 'common'}
            <button 
              class="text-lg font-bold opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
              on:click={handleRarityDowngrade}
              title="Downgrade rarity"
              style:color={darkMode ? '#ffffff' : '#000000'}
            >
              ↓
            </button>
          {/if}
        </div>
      </div>

      <div class="flex-grow"></div>

      <!-- Progress Stars -->
      <div class="flex flex-col items-center gap-1">
        <!-- Stars with tooltip -->
        <div 
          class="flex items-center gap-1 relative group"
          on:mouseenter={handleProgressHover}
          on:mouseleave={handleProgressLeave}
          bind:this={tooltipElement}
        >
          {#each progressLevels as level}
            <button
              class="transition-colors hover:scale-110 cursor-pointer !p-0 !min-w-0 !min-h-0"
              on:click={(e) => handleProgressClick(e, level.level)}
              title="Set to {level.name} ({level.level > 1 ? 's' : ''})"
              style:color={card?.progress >= level.level ? '#ffffff' : (darkMode ? '#6b7280' : '#9ca3af')}
            >
              <Star size="16" class="fill-current" />
            </button>
          {/each}
          
          <!-- Custom Tooltip -->
          {#if showProgressTooltip}
            <div 
              class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50"
            >
              {progressLevels.find(level => level.level === card?.progress)?.name || 'Raw'} ({card?.progress || 1} star{(card?.progress || 1) > 1 ? 's' : ''})
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    {#if showActions}
      <div class="action-buttons flex items-center justify-between mt-1 pt-1 border-t" style:border-color={darkMode ? '#4b5563' : '#e5e7eb'}>
        <div class="flex items-center gap-2">
          <button
            class="p-1 rounded hover:bg-opacity-20 transition-colors cursor-pointer"
            on:click={handleGenerateArtClick}
            title="Generate art"
            style:color={darkMode ? '#ffffff' : rarity.textColor}
          >
            <Palette size="14" />
          </button>
          <button
            class="p-1 rounded hover:bg-opacity-20 transition-colors cursor-pointer"
            on:click={handleSplitClick}
            title="Split card"
            style:color={darkMode ? '#ffffff' : rarity.textColor}
          >
            <Split size="14" />
          </button>
          <button
            class="p-1 rounded hover:bg-opacity-20 transition-colors cursor-pointer"
            on:click={handleMergeClick}
            title="Merge cards"
            style:color={darkMode ? '#ffffff' : rarity.textColor}
          >
            <Merge size="14" />
          </button>
        </div>
        
        <div class="flex items-center gap-2">
          <button
            class="p-1 rounded hover:bg-opacity-20 transition-colors cursor-pointer"
            on:click={handlePinClick}
            title="{card?.pinned ? 'Unpin' : 'Pin'} card"
            style:color={darkMode ? '#ffffff' : rarity.textColor}
          >
            {#if card?.pinned}
              <Pin size="14" class="fill-current" />
            {:else}
              <PinOff size="14" />
            {/if}
          </button>
          <button
            class="p-1 rounded hover:bg-opacity-20 transition-colors cursor-pointer"
            on:click={handleEditClick}
            title="Edit card"
            style:color={darkMode ? '#ffffff' : rarity.textColor}
          >
            <Pencil size="14" />
          </button>
          <button
            class="p-1 rounded hover:bg-opacity-20 transition-colors cursor-pointer"
            on:click={toggleMenu}
            title="More options"
            style:color={darkMode ? '#ffffff' : rarity.textColor}
          >
            <MoreHorizontal size="14" />
          </button>
        </div>
      </div>
    {/if}

  </div>

  <!-- NEW! Badge - positioned outside card frame to avoid stacking context issues -->
  {#if isNewCard}
    <div class="absolute" style="left: 12px; top: 30px; z-index: 999999 !important; border: none !important;">
      <div class="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg animate-pulse">
        NEW!
      </div>
    </div>
  {/if}

  <!-- Context Menu - rendered outside card to avoid stacking context issues -->
  {#if showMenu}
    <div 
      class="context-menu fixed z-[99999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-32"
      style:top="{menuPosition.top}px" style:left="{menuPosition.left}px"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="menu"
      tabindex="-1"
    >
      <button
        class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
        on:click={handleEditClick}
      >
        <Pencil size="14" />
        Edit
      </button>
      <button
        class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
        on:click={handlePinClick}
      >
        {#if card?.pinned}
          <PinOff size="14" />
          Unpin
        {:else}
          <Pin size="14" />
          Pin
        {/if}
      </button>
      <button
        class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600 dark:text-red-400"
        on:click={handleDeleteClick}
      >
        <Trash size="14" />
        Delete
      </button>
    </div>
  {/if}

  <!-- Click outside to close menu -->
  {#if showMenu}
    <div 
      class="fixed inset-0 z-[99998]" 
      on:click={() => showMenu = false}
      on:keydown={(e) => e.key === 'Escape' && (showMenu = false)}
      role="button"
      tabindex="-1"
      aria-label="Close menu"
    ></div>
  {/if}

  <!-- Selection overlay for FannedCardDeck -->
  {#if isSelected}
    <!-- Blue overlay over entire card -->
    <div class="absolute bg-blue-500 rounded-lg" style="z-index: 999999 !important; pointer-events: none; height: 350px; width: 250px; top: 0px; left: 0px; background-color: rgba(59, 130, 246, 0.5) !important; border-radius: 8px !important;"></div>
    <!-- Checkmark centered on art -->
    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" style="z-index: 1000000 !important; pointer-events: none;">
      <div class="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-xl">
        <svg class="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
        </svg>
      </div>
    </div>
  {/if}
</div>

<style>
  .line-clamp-4 {
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-clamp: 4;
  }
  
  .line-clamp-6 {
    display: -webkit-box;
    -webkit-line-clamp: 6;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-clamp: 6;
  }



</style>