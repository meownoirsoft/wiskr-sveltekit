<script>
  import { createEventDispatcher } from 'svelte';
  import { ChevronDown } from 'lucide-svelte';
  import { getAIInfo, getAINameWithTeam } from '$lib/config/aiAvatars.js';
  import ModelTooltip from './ModelTooltip.svelte';

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
  
  // Tooltip state
  let tooltipVisible = false;
  let tooltipAiInfo = null;
  let tooltipModel = null;
  let tooltipTargetElement = null;
  let hoverTimeout = null;

  function toggleDropdown() {
    if (disabled) return;
    isOpen = !isOpen;
    // Hide tooltip when dropdown closes
    if (!isOpen) {
      hideTooltip();
    }
  }

  function selectModel(model) {
    modelKey = model.key;
    isOpen = false;
    hideTooltip(); // Hide tooltip when selecting a model
    dispatch('change', { value: model.key });
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      isOpen = false;
      hideTooltip(); // Hide tooltip when closing with Escape
    }
  }

  function handleClickOutside(event) {
    if (dropdownElement && !dropdownElement.contains(event.target)) {
      isOpen = false;
      hideTooltip(); // Hide tooltip when clicking outside
    }
  }

  // Close dropdown when clicking outside
  $: if (typeof window !== 'undefined') {
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    } else {
      document.removeEventListener('click', handleClickOutside);
    }
  }

  // Get current selected model info
  $: currentModel = availableModels.find(m => m.key === modelKey) || availableModels[0];
  $: currentAIInfo = currentModel ? getAIInfo(currentModel.key) : null;
  
  // Tooltip functions
  function showTooltip(model, aiInfo, event) {
    clearTimeout(hoverTimeout);
    hoverTimeout = setTimeout(() => {
      tooltipTargetElement = event.target;
      tooltipModel = model;
      tooltipAiInfo = aiInfo;
      tooltipVisible = true;
    }, 500); // 500ms delay
  }
  
  function hideTooltip() {
    clearTimeout(hoverTimeout);
    tooltipVisible = false;
    tooltipTargetElement = null;
    tooltipModel = null;
    tooltipAiInfo = null;
  }
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
    <div class="absolute bottom-full left-0 right-0 mb-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto" style="background-color: var(--bg-input);">
      {#each availableModels as model}
        {@const aiInfo = getAIInfo(model.key)}
        <button
          type="button"
          class="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 md:gap-3 transition-colors {model.key === modelKey ? 'bg-blue-50 dark:bg-blue-900' : ''}"
          on:click={() => selectModel(model)}
          on:mouseenter={(e) => showTooltip(model, aiInfo, e)}
          on:mouseleave={hideTooltip}
        >
          <div class="bg-white rounded-lg p-px sm:p-px">
            <img src={aiInfo.avatarPath} alt="{aiInfo.name}" class="w-9 h-9 sm:w-12 sm:h-12 rounded-md flex-shrink-0" />
          </div>
          <div class="flex flex-col min-w-0 flex-1 items-start">
            <span class="truncate text-sm md:text-xs">{getAINameWithTeam(model.key)}</span>
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
    <div class="absolute bottom-full left-0 right-0 mb-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-50 px-3 py-2" style="background-color: var(--bg-input);">
      <div class="text-xs text-gray-500 dark:text-gray-400">Loading Wiskrs...</div>
    </div>
  {/if}
</div>

<!-- Custom Tooltip -->
<ModelTooltip
  visible={tooltipVisible}
  aiInfo={tooltipAiInfo}
  model={tooltipModel}
  targetElement={tooltipTargetElement}
/>

<style>
  /* Ensure dropdown appears above other elements */
  .relative {
    z-index: 10;
  }
</style>
