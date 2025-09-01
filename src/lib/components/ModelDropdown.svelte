<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { ChevronDown } from 'lucide-svelte';
  import { getAIInfo, getAINameWithTeam } from '$lib/config/aiAvatars.js';
  import ProBadge from './ProBadge.svelte';

  export let modelKey = 'speed';
  export let availableModels = [];
  export let disabled = false;

  // Helper function to format pricing
  function formatPrice(price) {
    const num = parseFloat(price);
    if (num === 0) return 'Free';
    
    // Remove trailing zeros and format to meaningful decimals
    return num.toString().replace(/\.?0+$/, '') + '¢/1k';
  }
  
  // Helper function to format the full pricing string
  function formatPricing(model) {
    if (!model.costPer1kTokens) return '';
    
    const inputPrice = formatPrice(model.costPer1kTokens.input);
    const outputPrice = formatPrice(model.costPer1kTokens.output);
    
    // If both are free, just show "Free"
    if (inputPrice === 'Free' && outputPrice === 'Free') {
      return 'Free';
    }
    
    return `In: ${inputPrice} Out: ${outputPrice}`;
  }

  const dispatch = createEventDispatcher();
  let isOpen = false;
  let dropdownElement;
  

  function toggleDropdown(event) {
    if (disabled) return;
    event.stopPropagation();
    
    isOpen = !isOpen;
  }

  function selectModel(model) {
    // Prevent selection of unavailable models
    if (model.isAvailable === false) {
      return;
    }
    
    modelKey = model.key;
    isOpen = false;
    dispatch('change', { value: model.key });
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      isOpen = false;
    }
  }

  // Simple approach: just handle clicks directly

  // Get current selected model info
  $: currentModel = availableModels.find(m => m.key === modelKey) || availableModels[0];
  $: currentAIInfo = currentModel ? getAIInfo(currentModel.key) : null;
  
  // Separate available and unavailable models
  $: availableModelsList = availableModels.filter(m => m.isAvailable !== false);
  $: unavailableModels = availableModels.filter(m => m.isAvailable === false);
  
  // Combined list with available models first, then unavailable
  $: sortedModels = [...availableModelsList, ...unavailableModels];
  
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="relative" bind:this={dropdownElement}>
  <!-- Dropdown Button -->
  <button
    type="button"
    class="border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded p-1 text-xs min-w-[300px] max-w-[300px] flex items-center justify-between gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors {disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}" style="background-color: var(--bg-input);"
    on:click={toggleDropdown}
    {disabled}
  >
    <div class="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
      {#if currentAIInfo}
        <div class="bg-white rounded-lg p-px md:p-px">
          <img src={currentAIInfo.avatarPath} alt="{currentAIInfo.name}" class="w-11 h-11 md:w-12 md:h-12 rounded-md flex-shrink-0" />
        </div>
        <div class="flex flex-col min-w-0 flex-1">
          <span class="truncate text-base md:text-sm font-medium">{getAINameWithTeam(currentModel?.key || modelKey)}</span>
          <span class="truncate text-sm md:text-xs text-gray-500 dark:text-gray-400">{currentAIInfo.bestFor || 'General tasks'}</span>
        </div>
      {:else}
        <span class="truncate">Loading Wiskrs...</span>
      {/if}
    </div>
    <ChevronDown size="14" class="flex-shrink-0 transition-transform {isOpen ? 'rotate-180' : ''}" />
  </button>

  <!-- Dropdown Menu -->
  {#if isOpen && availableModels.length > 0}
    <div class="absolute bottom-full left-0 right-0 mb-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-80 overflow-y-auto" style="background-color: var(--bg-input); z-index: 9999 !important; position: absolute; backdrop-filter: blur(8px); box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);">
      {#each sortedModels as model, index}
        {@const aiInfo = getAIInfo(model.key)}
        {@const isUnavailable = model.isAvailable === false}
        {@const isFirstUnavailable = index === availableModelsList.length && unavailableModels.length > 0}
        
        <!-- Section separator before unavailable models -->
        {#if isFirstUnavailable}
          <div class="border-t border-gray-200 dark:border-gray-600 my-1"></div>
          <div class="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 font-medium">Upgrade to unlock:</div>
        {/if}
        
        <button
          type="button"
          class="w-full px-3 py-2 text-left text-xs flex items-center gap-2 md:gap-3 transition-colors {model.key === modelKey ? 'bg-blue-50 dark:bg-gray-700' : ''} {isUnavailable ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'}"
          on:click={() => {
            if (!isUnavailable) {
              selectModel(model);
            }
          }}
          disabled={isUnavailable}
          tabindex={isUnavailable ? -1 : 0}
        >
          <div class="bg-white rounded-lg p-px sm:p-px {isUnavailable ? 'grayscale' : ''}">
            <img src={aiInfo.avatarPath} alt="{aiInfo.name}" class="w-9 h-9 sm:w-12 sm:h-12 rounded-md flex-shrink-0" />
          </div>
          <div class="flex flex-col min-w-0 flex-1 items-start">
            <div class="flex items-center gap-2 w-full">
              <span class="truncate text-sm md:text-xs {isUnavailable ? 'text-gray-400 dark:text-gray-500' : ''}">{getAINameWithTeam(model.key)}</span>
              {#if isUnavailable && model.requiredTier}
                <ProBadge tier={model.requiredTier} size="xs" variant="minimal" />
              {/if}
            </div>
            <span class="truncate text-xs text-gray-500 dark:text-gray-400">{aiInfo.bestFor || 'General tasks'}</span>
          </div>
          {#if model.key === modelKey}
            <div class="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
          {/if}
        </button>
      {/each}
    </div>
  {/if}

  <!-- Fallback dropdown when no models loaded -->
  {#if isOpen && availableModels.length === 0}
    <div class="absolute bottom-full left-0 right-0 mb-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg px-3 py-2" style="background-color: var(--bg-input); z-index: 9999 !important; position: absolute; backdrop-filter: blur(8px); box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);">
      <div class="text-xs text-gray-500 dark:text-gray-400">Loading Wiskrs...</div>
    </div>
  {/if}
</div>

<style>
  /* Ensure dropdown container has proper z-index */
  .relative {
    z-index: 1000 !important;
  }
  
  /* Force dropdown to appear above everything */
  .relative > div[style*="z-index: 9999"] {
    z-index: 9999 !important;
    position: absolute !important;
    /* Position above the button */
    bottom: 100% !important;
    margin-bottom: 0.25rem !important;
  }
</style>
