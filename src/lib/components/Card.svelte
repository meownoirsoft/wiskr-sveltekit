<!-- Card.svelte - Clean MTG-style idea card component -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { Pin, PinOff, Pencil, Trash, MoreHorizontal, Star, Split, Merge, Palette, X } from 'lucide-svelte';

  export let card = null;
  export let searchTerm = '';
  export let isSelected = false;
  export let showActions = true;
  export let showRemoveButton = false;
  export let xPaddingClass = 'px-2';
  
  // Debug card structure
  $: if (card) {
    // console.log('🎴 Card component received card:', {
    //   id: card.id,
    //   title: card.title,
    //   content: card.content,
    //   value: card.value,
    //   rarity: card.rarity,
    //   art_url: card.art_url,
    //   hasContent: 'content' in card,
    //   hasValue: 'value' in card
    // });
  }

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

  // Investment cost (mana system) - tracks user engagement
  $: investmentCost = card?.investment_cost || 0;
  $: rarity = getRarityConfig(card?.rarity || 'common');
  $: progress = getProgressInfo(card?.progress || 1);
  let darkMode = false;
  
  // Check dark mode once on mount and when needed
  if (typeof window !== 'undefined') {
    darkMode = isDarkMode();
  }

  // Title scrolling functionality
  let titleElement;

  function handleTitleHover() {
    if (!titleElement || !titleElement.parentElement) return;
    
    try {
      const container = titleElement.parentElement;
      const titleWidth = titleElement.scrollWidth;
      const containerWidth = container.clientWidth;
      
      // Only scroll if the title is actually wider than the container
      if (titleWidth > containerWidth && titleWidth > 0 && containerWidth > 0) {
        const scrollDistance = titleWidth - containerWidth;
        
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

</script>

<div 
  class="card-container relative cursor-pointer transition-all duration-200 hover:shadow-lg {isSelected ? 'ring-2 ring-blue-500' : ''}"
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
    class="card-frame border-2 rounded-lg {xPaddingClass} pt-4 pb-2 h-full flex flex-col {isSelected ? 'ring-2 ring-blue-500' : ''}"
    style="
      width: 100%; 
      height: 100%;
      border-color: {rarity.borderColor};
      background-color: {darkMode ? rarity.bgColorDark : rarity.bgColor};
      color: {darkMode ? rarity.textColorDark : rarity.textColor};
    "
  >
    
    <!-- Header: Title -->
    <div class="mb-2 -mt-2">
      <div 
        class="title-container relative overflow-hidden"
        style="max-width: 100%;"
        on:mouseenter={handleTitleHover}
        on:mouseleave={handleTitleLeave}
      >
        <h3 
          class="font-bold text-sm leading-tight whitespace-nowrap transition-transform duration-1000 ease-in-out" 
          style:color={darkMode ? '#f9fafb' : '#111827'}
          bind:this={titleElement}
        >
          {@html highlightText(card?.title || card?.key || 'Untitled Card', searchTerm)}
        </h3>
      </div>
    </div>

    <!-- Art Area -->
    <div 
      class="art-area relative mb-3 rounded-md flex items-center justify-center" 
      style="height: 120px;"
    >
      <!-- Mana Cost - Top Corner -->
      <div
        id="mana-cost" 
        class="absolute -top-1 right-0 z-10 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold"
        style:background-color={darkMode ? '#ffffff' : '#ffffff'} 
        style:color={rarity.textColor}
      >
        <span>{investmentCost}</span>
      </div>

      {#if card?.art_url}
        <img 
          src={card.art_url} 
          alt="Card art" 
          class="object-cover rounded-md" 
          style="width: 100%; height: 100%; max-width: 220px; max-height: 120px;"
          draggable="false" 
        />
      {:else}
        <img 
          src="/wiskr-art-default.webp" 
          alt="Default card art" 
          class="object-cover rounded-md" 
          style="width: 100%; height: 100%; max-width: 220px; max-height: 120px;"
          draggable="false" 
        />
      {/if}
    </div>

    <!-- Tags -->
    {#if card?.tags && card.tags.length > 0}
      <div class="flex flex-wrap gap-1 mb-3">
        {#each card.tags.slice(0, 3) as tag}
          <span 
            class="text-xs px-1.5 py-0.5 rounded-md"
            style:background-color={darkMode ? '#4b5563' : '#e5e7eb'} 
            style:color={darkMode ? '#d1d5db' : '#374151'}
          >
            {tag}
          </span>
        {/each}
        {#if card.tags.length > 3}
          <span 
            class="text-xs px-1.5 py-0.5 rounded-md"
            style:background-color={darkMode ? '#4b5563' : '#e5e7eb'} 
            style:color={darkMode ? '#d1d5db' : '#374151'}
          >
            +{card.tags.length - 3}
          </span>
        {/if}
      </div>
    {/if}

    <!-- Content -->
    <div 
      class="content-area flex-1 mb-3 text-sm leading-tight overflow-hidden"
      style:color={darkMode ? '#d1d5db' : '#374151'}
    >
      <div class="line-clamp-4">
        {@html highlightText(card?.content || 'No content', searchTerm)}
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
    <div class="bottom-bar flex items-center flex-wrap gap-y-1">
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
          class="text-xs font-bold uppercase bg-white dark:bg-white rounded px-1.5 py-0.5"
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
      <div class="flex items-center gap-1">
        {#each progressLevels as level}
          <button
            class="transition-colors hover:scale-110 cursor-pointer !p-0 !min-w-0 !min-h-0"
            on:click={(e) => handleProgressClick(e, level.level)}
            title="Set to {level.name} ({level.level > 1 ? 's' : ''})"
            style:color={card?.progress >= level.level ? '#ffffff' : (darkMode ? '#6b7280' : '#9ca3af')}
          >
            <Star size="14" class="fill-current" />
          </button>
        {/each}
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
</div>

<style>
  .line-clamp-4 {
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-clamp: 4;
  }
</style>