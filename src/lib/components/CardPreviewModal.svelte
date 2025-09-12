<!-- CardPreviewModal.svelte - Card preview that looks exactly like CardZoomView -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { X, Star } from 'lucide-svelte';

  export let card = null;
  export let isOpen = false;

  const dispatch = createEventDispatcher();

  // Progress levels (same as CardZoomView)
  const progressLevels = [
    { level: 1, name: 'Raw', color: '#6b7280' },
    { level: 2, name: 'Rough', color: '#f97316' },
    { level: 3, name: 'Crystal', color: '#ef4444' },
    { level: 4, name: 'Cut', color: '#1d4ed8' },
    { level: 5, name: 'Shimmer', color: '#7c3aed' }
  ];

  // Rarity configurations (same as CardZoomView)
  const rarityConfig = {
    common: {
      borderColor: '#14b8a6',
      bgColor: '#f0fdfa',
      bgColorDark: '#064e3b',
      textColor: '#0f766e',
      textColorDark: '#6ee7b7'
    },
    special: {
      borderColor: '#3b82f6',
      bgColor: '#eff6ff',
      bgColorDark: '#1e3a8a',
      textColor: '#1d4ed8',
      textColorDark: '#93c5fd'
    },
    rare: {
      borderColor: '#8b5cf6',
      bgColor: '#faf5ff',
      bgColorDark: '#581c87',
      textColor: '#7c3aed',
      textColorDark: '#c4b5fd'
    },
    legendary: {
      borderColor: '#f59e0b',
      bgColor: '#fffbeb',
      bgColorDark: '#92400e',
      textColor: '#d97706',
      textColorDark: '#fbbf24'
    }
  };

  function closeModal() {
    dispatch('close');
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  function isDarkMode() {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark') || 
           window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function getRarityConfig(rarity) {
    return rarityConfig[rarity] || rarityConfig.common;
  }

  function getProgressInfo(level) {
    return progressLevels.find(p => p.level === level) || progressLevels[0];
  }

  function getGenerationLabel() {
    if (!card?.generation_model || card.generation_model === 'GPT-4o') {
      return 'idea: User';
    }
    return `gen: ${card.generation_model}`;
  }

  // Reactive variables
  $: rarity = getRarityConfig(card?.rarity || 'common');
  $: progress = getProgressInfo(card?.progress || 1);
  $: darkMode = isDarkMode();
  $: manaCost = card?.mana_cost || 0;
</script>

{#if isOpen && card}
  <!-- Background -->
  <div 
    class="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" 
    on:click={handleBackdropClick}
    on:keydown={(e) => e.key === 'Escape' && closeModal()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    
    <!-- Just the Card -->
    <div 
      class="card-container relative transition-all duration-200"
      style="width: 500px; height: 750px;"
      on:click|stopPropagation
      role="none"
    >
      <!-- Close Button -->
      <button
        on:click={closeModal}
        class="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10 shadow-lg"
        aria-label="Close preview"
      >
        <X class="w-4 h-4" />
      </button>

      <!-- Card Frame -->
      <div 
        class="card-frame border-2 rounded-lg h-full flex flex-col"
        style="
          border-color: {rarity.borderColor};
          background-color: {darkMode ? rarity.bgColorDark : rarity.bgColor};
          color: {darkMode ? rarity.textColorDark : rarity.textColor};
        "
      >

        <!-- Header: Title -->
        <div class="mb-4 px-4 pt-4">
          <h3 class="text-lg font-bold leading-tight" style:color={darkMode ? '#f9fafb' : '#111827'}>
            {card.title}
          </h3>
        </div>

        <!-- Art Area -->
        <div 
          class="art-area mb-4 mx-4 rounded-md flex items-center justify-center relative group" 
          style="height: 200px;"
        >
          <!-- Mana Cost - Top Right -->
          {#if card?.rarity === 'common'}
            <!-- Common cards with green gem socket -->
            <div class="absolute -top-3 -right-2 z-10 w-12 h-12">
              <img 
                src="/sockets/gem-socket-green.webp" 
                alt="Mana socket" 
                class="w-full h-full object-cover rounded-full"
              />
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-white font-bold text-xs">{manaCost}</span>
              </div>
            </div>
          {:else if card?.rarity === 'special'}
            <!-- Special cards with blue gem socket -->
            <div class="absolute -top-3 -right-2 z-10 w-10 h-13">
              <img 
                src="/sockets/gem-socket-blue.webp" 
                alt="Mana socket" 
                class="w-full h-full object-cover rounded-full"
              />
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-white font-bold text-xs">{manaCost}</span>
              </div>
            </div>
          {:else if card?.rarity === 'rare'}
            <!-- Rare cards with purple gem socket -->
            <div class="absolute -top-4 -right-3 z-10 w-14 h-14">
              <img 
                src="/sockets/gem-socket-purple.webp" 
                alt="Mana socket" 
                class="w-full h-full object-cover rounded-full"
              />
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-white font-bold text-xs">{manaCost}</span>
              </div>
            </div>
          {:else if card?.rarity === 'legendary'}
            <!-- Legendary cards with orange gem socket -->
            <div class="absolute -top-3 -right-2 z-10 w-12 h-12">
              <img 
                src="/sockets/gem-socket-orange.webp" 
                alt="Mana socket" 
                class="w-full h-full object-cover rounded-full"
              />
              <div class="absolute inset-0 flex items-center justify-center -mt-0.5">
                <span class="text-white font-bold text-xs">{manaCost}</span>
              </div>
            </div>
          {:else}
            <!-- Other rarities with white background -->
            <div 
              class="absolute -top-2 -right-2 z-10 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold"
              style:background-color={darkMode ? '#ffffff' : '#ffffff'} 
              style:color={rarity.textColor}
            >
              <span>{manaCost}</span>
            </div>
          {/if}

          <!-- Art Image -->
          <img 
            src={card.art_url || '/wiskr-art-default.webp'} 
            alt="Card art" 
            class="w-full h-full object-cover rounded-md" 
          />
        </div>

        <!-- Tags -->
        <div class="px-4 mb-2">
          <div class="flex flex-wrap gap-1">
            {#each card.tags || [] as tag}
              <span class="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 rounded-md">
                {tag}
              </span>
            {/each}
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 px-4 mb-2">
          <div class="text-sm leading-tight overflow-y-auto max-h-64" style:color={darkMode ? '#d1d5db' : '#374151'}>
            {card.content}
          </div>
        </div>

        <!-- Rarity and Progress Section -->
        <div class="px-4 mb-2 flex items-center justify-between">
          <!-- Rarity -->
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold uppercase" style:color={darkMode ? '#d1d5db' : '#374151'}>
              {card.rarity || 'common'}
            </span>
          </div>

          <!-- Progress Stars -->
          <div class="flex flex-col items-center gap-1">
            <!-- Stars -->
            <div class="flex items-center gap-1">
              {#each progressLevels as level}
                <div
                  class="transition-colors"
                  style:color={card.progress >= level.level ? '#ffffff' : (darkMode ? '#4b5563' : '#d1d5db')}
                >
                  <Star size="18" class="fill-current" />
                </div>
              {/each}
            </div>
            
            <!-- Progress Level Label -->
            <div class="text-xs font-medium uppercase" style:color={darkMode ? '#d1d5db' : '#374151'}>
              {progressLevels.find(level => level.level === card.progress)?.name || 'Raw'}
            </div>
          </div>
        </div>

        <!-- Action Buttons with Metadata -->
        <div class="action-buttons flex items-center justify-between pl-4 pr-2 py-1 border-t" style:border-color={darkMode ? '#4b5563' : '#e5e7eb'}>
          <!-- Metadata Section -->
          <div class="flex items-center gap-6 text-xs" style:color={darkMode ? '#9ca3af' : '#6b7280'}>
            <!-- Generation info -->
            <div class="flex flex-col">
              <div>{getGenerationLabel()}</div>
              <div class="italic">{formatDate(card.created_at)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
