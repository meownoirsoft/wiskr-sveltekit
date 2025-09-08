<!-- Card.svelte - MTG-style idea card component -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { Pin, PinOff, Pencil, Trash, MoreHorizontal, Star, Split, Merge, Palette } from 'lucide-svelte';

  export let card = null;
  export let searchTerm = '';
  export let isSelected = false;
  export let showActions = true;

  const dispatch = createEventDispatcher();

  // Progress levels (1-5 stars)
  const progressLevels = [
    { level: 1, name: 'Raw', icon: '⛰️', color: 'text-gray-500' },
    { level: 2, name: 'Rough', icon: '⛏️', color: 'text-orange-500' },
    { level: 3, name: 'Crystal', icon: '💎', color: 'text-red-500' },
    { level: 4, name: 'Cut', icon: '✨', color: 'text-blue-500' },
    { level: 5, name: 'Shimmer', icon: '🌟', color: 'text-purple-500' }
  ];

  // Rarity colors
  const rarityColors = {
    common: 'border-teal-500 bg-teal-50 dark:bg-teal-900/20',
    special: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20', 
    rare: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20',
    legendary: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
  };

  const rarityTextColors = {
    common: 'text-teal-700 dark:text-teal-300',
    special: 'text-blue-700 dark:text-blue-300',
    rare: 'text-purple-700 dark:text-purple-300', 
    legendary: 'text-orange-700 dark:text-orange-300'
  };

  let showMenu = false;
  let menuPosition = { top: 0, left: 0 };

  function getProgressInfo(level) {
    return progressLevels.find(p => p.level === level) || progressLevels[0];
  }

  function highlightText(text, term) {
    if (!term || !text) return text;
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  }

  function toggleMenu(event) {
    event.stopPropagation();
    showMenu = !showMenu;
    if (showMenu) {
      const rect = event.target.getBoundingClientRect();
      menuPosition = {
        top: rect.bottom + 4,
        left: Math.min(rect.left, window.innerWidth - 200)
      };
    }
  }

  function closeMenu() {
    showMenu = false;
  }

  function handleAction(action, event) {
    event.stopPropagation();
    dispatch(action, { card, event });
    closeMenu();
  }

  function handleCardClick() {
    dispatch('select', { card });
  }

  function handleProgressClick(event) {
    event.stopPropagation();
    dispatch('progress-change', { card });
  }

  function handleRarityClick(event) {
    event.stopPropagation();
    dispatch('rarity-change', { card });
  }

  // Investment cost (mana system) - tracks user engagement
  $: investmentCost = card?.investment_cost || 0;
</script>

<div 
  class="card-container relative cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg {isSelected ? 'ring-2 ring-blue-500' : ''}"
  on:click={handleCardClick}
  on:keydown={(e) => e.key === 'Enter' && handleCardClick()}
  role="button"
  tabindex="0"
>
  <!-- Card Frame -->
  <div class="card-frame border-2 rounded-lg p-4 h-full flex flex-col {rarityColors[card?.rarity || 'common']} {isSelected ? 'ring-2 ring-blue-500' : ''}">
    
    <!-- Header: Title and Investment Cost -->
    <div class="flex items-start justify-between mb-3">
      <div class="flex-1 min-w-0">
        <h3 class="font-bold text-sm leading-tight text-gray-900 dark:text-gray-100 truncate">
          {@html highlightText(card?.title || card?.key || 'Untitled Card', searchTerm)}
        </h3>
      </div>
      <div class="flex items-center gap-1 ml-2">
        <!-- Investment Cost (Mana) -->
        <div class="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-full px-2 py-1 text-xs font-bold {rarityTextColors[card?.rarity || 'common']}">
          <Star size="12" class="fill-current" />
          <span>{investmentCost}</span>
        </div>
      </div>
    </div>

    <!-- Art Area -->
    <div class="art-area mb-3 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center" style="height: 120px;">
      {#if card?.art_url}
        <img src={card.art_url} alt="Card art" class="w-full h-full object-cover" />
      {:else}
        <div class="text-gray-400 dark:text-gray-500 text-center">
          <div class="text-2xl mb-1">🎨</div>
          <div class="text-xs">Art</div>
        </div>
      {/if}
    </div>

    <!-- Tags -->
    {#if card?.tags && card.tags.length > 0}
      <div class="flex flex-wrap gap-1 mb-3">
        {#each card.tags.slice(0, 3) as tag}
          <span class="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full">
            {tag}
          </span>
        {/each}
        {#if card.tags.length > 3}
          <span class="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full">
            +{card.tags.length - 3}
          </span>
        {/if}
      </div>
    {/if}

    <!-- Content -->
    <div class="content-area flex-1 mb-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed overflow-hidden">
      <div class="line-clamp-4">
        {@html highlightText(card?.content || card?.value || 'No content', searchTerm)}
      </div>
    </div>

    <!-- Flavor Text (if exists) -->
    {#if card?.flavor_text}
      <div class="flavor-text mb-3 text-xs italic text-gray-600 dark:text-gray-400 border-l-2 border-gray-300 dark:border-gray-600 pl-2">
        {@html highlightText(card.flavor_text, searchTerm)}
      </div>
    {/if}

    <!-- Bottom Bar: Rarity and Progress -->
    <div class="bottom-bar flex items-center justify-between">
      <!-- Rarity -->
      <div class="flex items-center gap-2">
        <span class="text-xs font-bold {rarityTextColors[card?.rarity || 'common']} uppercase">
          {card?.rarity || 'common'}
        </span>
        <button 
          class="text-xs opacity-60 hover:opacity-100 transition-opacity"
          on:click={handleRarityClick}
          title="Change rarity"
        >
          ⇅
        </button>
      </div>

      <!-- Progress Stars -->
      <div class="flex items-center gap-1">
        {#each progressLevels as level}
          <button
            class="transition-colors {card?.progress >= level.level ? level.color : 'text-gray-300 dark:text-gray-600'}"
            on:click={handleProgressClick}
            title="{level.name} ({level.level}/5)"
          >
            {#if card?.progress >= level.level}
              <Star size="12" class="fill-current" />
            {:else}
              <Star size="12" />
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <!-- Action Buttons -->
    {#if showActions}
      <div class="action-buttons flex items-center justify-between mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
        <div class="flex items-center gap-1">
          <button 
            class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            on:click={(e) => handleAction('toggle-pin', e)}
            title={card?.pinned ? 'Unpin' : 'Pin'}
          >
            {#if card?.pinned}
              <Pin size="14" class="text-blue-600 dark:text-blue-400" />
            {:else}
              <PinOff size="14" class="text-gray-400" />
            {/if}
          </button>
        </div>

        <div class="flex items-center gap-1">
          <button 
            class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            on:click={(e) => handleAction('split', e)}
            title="Split card"
          >
            <Split size="14" class="text-gray-600 dark:text-gray-400" />
          </button>
          <button 
            class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            on:click={(e) => handleAction('merge', e)}
            title="Merge cards"
          >
            <Merge size="14" class="text-gray-600 dark:text-gray-400" />
          </button>
          <button 
            class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            on:click={(e) => handleAction('generate-art', e)}
            title="Generate art"
          >
            <Palette size="14" class="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <!-- More Menu -->
        <div class="relative">
          <button 
            class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            on:click={toggleMenu}
            title="More options"
          >
            <MoreHorizontal size="14" class="text-gray-600 dark:text-gray-400" />
          </button>

          {#if showMenu}
            <div 
              class="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg z-10"
              style="top: {menuPosition.top}px; left: {menuPosition.left}px;"
            >
              <button 
                class="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                on:click={(e) => handleAction('edit', e)}
              >
                <Pencil size="14" />
                Edit
              </button>
              <button 
                class="w-full px-4 py-2 text-sm text-left hover:bg-red-50 dark:hover:bg-red-900 text-red-600 dark:text-red-400 flex items-center gap-2"
                on:click={(e) => handleAction('delete', e)}
              >
                <Trash size="14" />
                Delete
              </button>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .line-clamp-4 {
    display: -webkit-box;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-container:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--color-accent);
  }
</style>
