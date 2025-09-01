<script>
  import { onMount, onDestroy } from 'svelte';

  export let visible = false;
  export let aiInfo = null;
  export let model = null;
  export let targetElement = null;

  let tooltipElement;
  let position = { x: 0, y: 0 };

  function updatePosition() {
    if (!tooltipElement || !targetElement) return;

    const targetRect = targetElement.getBoundingClientRect();
    const tooltipRect = tooltipElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Position to the right of the target element
    let x = targetRect.right + 8;
    let y = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);

    // Adjust if tooltip goes off right edge
    if (x + tooltipRect.width > viewportWidth - 8) {
      x = targetRect.left - tooltipRect.width - 8;
    }

    // Adjust if tooltip goes off top edge
    if (y < 8) {
      y = 8;
    }
    
    // Adjust if tooltip goes off bottom edge
    if (y + tooltipRect.height > viewportHeight - 8) {
      y = viewportHeight - tooltipRect.height - 8;
    }

    position = { x, y };
  }

  $: if (visible && targetElement) {
    setTimeout(updatePosition, 0);
  }

  onMount(() => {
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    }
  });
</script>

{#if visible && aiInfo && model}
  <div
    bind:this={tooltipElement}
    class="fixed z-[45] bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm rounded-lg shadow-xl border border-gray-300 dark:border-gray-700 p-3 pointer-events-none max-w-xs"
    style="left: {position.x}px; top: {position.y}px;"
  >
    <!-- AI Name -->
    <div class="font-semibold text-gray-900 dark:text-white mb-1">
      {aiInfo.name}
    </div>
    
    <!-- Technical Model Name -->
    <div class="text-gray-600 dark:text-gray-300 text-xs mb-2 font-mono">
      {model.name}
    </div>
    
    <!-- Pricing (only show if available) -->
    {#if model.costPer1kTokens && model.costPer1kTokens.input !== undefined && model.costPer1kTokens.output !== undefined}
      <div class="text-gray-500 dark:text-gray-400 text-xs space-y-1">
        <div class="flex justify-between">
          <span>Input:</span>
          <span class="font-mono">${model.costPer1kTokens.input}/1k</span>
        </div>
        <div class="flex justify-between">
          <span>Output:</span>
          <span class="font-mono">${model.costPer1kTokens.output}/1k</span>
        </div>
      </div>
    {/if}
    
    <!-- Description (show if available) -->
    {#if model.description}
      <div class="text-gray-600 dark:text-gray-400 text-xs mt-2">
        {model.description}
      </div>
    {/if}
    
    <!-- Category/Tier -->
    {#if model.category}
      <div class="text-gray-500 dark:text-gray-400 text-xs mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        {model.category}
      </div>
    {/if}

    <!-- Tooltip arrow pointing to the target -->
    <div class="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white dark:bg-gray-900 border-l border-b border-gray-300 dark:border-gray-700 rotate-45 -left-1"></div>
  </div>
{/if}

<style>
  /* Ensure tooltip appears above dropdowns but below modals */
  .z-\[45\] {
    z-index: 45;
  }
</style>
