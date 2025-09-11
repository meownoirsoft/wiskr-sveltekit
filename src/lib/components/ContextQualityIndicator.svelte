<script>
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { Info, TrendingUp, X, FileText, Users, ChevronDown, Brain, Sparkles } from 'lucide-svelte';

  export let score = 0;
  export let loading = false;
  export let projectId = null;
  export let isMobile = false;
  export let darkMode = false;

  const dispatch = createEventDispatcher();

  let showTooltip = false;
  // Removed old analysis system
  let buttonElement;
  let portalContainer;
  let worldContext = null;
  let loadingWorldContext = false;

  $: scoreColor = getScoreColor(score);
  $: scoreLabel = getScoreLabel(score);

  // Portal action to render tooltip at document body
  function createPortal(node) {
    // Create portal container if it doesn't exist
    if (!portalContainer) {
      portalContainer = document.createElement('div');
      portalContainer.id = 'quality-tooltip-portal';
      portalContainer.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 999999;';
      document.body.appendChild(portalContainer);
    }

    // Move the node to the portal container
    portalContainer.appendChild(node);
    
    // Enable pointer events on the tooltip itself
    node.style.pointerEvents = 'auto';
    
    return {
      destroy() {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      }
    };
  }

  async function loadWorldContext() {
    if (!projectId) return;
    
    loadingWorldContext = true;
    try {
      const response = await fetch(`/api/projects/${projectId}/world-context?action=readiness`);
      if (response.ok) {
        worldContext = await response.json();
      }
    } catch (error) {
      console.error('Failed to load world context:', error);
    } finally {
      loadingWorldContext = false;
    }
  }

  async function generateWorldContext() {
    if (!projectId) return;
    
    loadingWorldContext = true;
    try {
      const response = await fetch(`/api/projects/${projectId}/world-context`, {
        method: 'POST'
      });
      if (response.ok) {
        await loadWorldContext(); // Refresh status
      }
    } catch (error) {
      console.error('Failed to generate world context:', error);
    } finally {
      loadingWorldContext = false;
    }
  }
  
  // Load world context when component mounts or projectId changes
  onMount(() => {
    if (projectId) {
      loadWorldContext();
    }
  });

  $: if (projectId && !worldContext && !loadingWorldContext) {
    loadWorldContext();
  }

  // No longer using old analysis system - focusing on world context

  function getScoreColor(score) {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#f59e0b'; // amber  
    if (score >= 40) return '#f97316'; // orange
    if (score === 0) return '#6b7280'; // neutral gray for "Brand new"
    return '#ef4444'; // red for "Needs work"
  }

  function getScoreLabel(score) {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    if (score === 0) return 'Brand new';
    return 'Needs work';
  }

  async function toggleTooltip() {
    if (!showTooltip) {
      // Load fresh world context when opening tooltip
      if (projectId && !worldContext && !loadingWorldContext) {
        await loadWorldContext();
      }
      
      // Position tooltip below button
      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        document.documentElement.style.setProperty('--tooltip-top', `${rect.bottom + 8}px`);
        document.documentElement.style.setProperty('--tooltip-left', `${rect.left}px`);
      }
    }
    showTooltip = !showTooltip;
  }

  // Removed old analysis system - now using world context

  function getSuggestions() {
    const suggestions = [];
    
    // World context suggestions
    if (worldContext && !worldContext.isReady) {
      if (worldContext.missingRequirements?.needsMoreCards) {
        suggestions.push({
          icon: Users,
          text: `Add ${worldContext.missingRequirements.cardsNeeded} more cards`,
          points: 'Unlock AI context',
          action: () => dispatch('navigate-cards')
        });
      }
      if (worldContext.missingRequirements?.needsDescription) {
        suggestions.push({
          icon: FileText,
          text: 'Add project description',
          points: 'Unlock AI context',
          action: () => dispatch('open-settings')
        });
      }
    }

    // General quality suggestions based on score
    if (score < 40) {
      suggestions.push({
        icon: FileText,
        text: 'Add more content to improve quality',
        points: 'Higher quality score',
        action: () => dispatch('navigate-cards')
      });
    }

    return suggestions.slice(0, 3); // Show max 3 suggestions
  }

  function openQualityDashboard() {
    showTooltip = false;
    if (projectId) {
      dispatch('open-dashboard', { projectId });
    }
  }

  // Close tooltip when clicking outside
  function handleClickOutside(event) {
    if (!event.target.closest('.quality-tooltip-container')) {
      showTooltip = false;
    }
  }

  $: if (typeof window !== 'undefined') {
    if (showTooltip) {
      document.addEventListener('click', handleClickOutside);
    } else {
      document.removeEventListener('click', handleClickOutside);
    }
  }
  
  // Cleanup portal container on component destroy
  onDestroy(() => {
    if (portalContainer && portalContainer.parentNode) {
      portalContainer.parentNode.removeChild(portalContainer);
    }
  });
</script>

<div class="quality-tooltip-container relative" data-tutorial="context-quality">
  {#if isMobile}
    <!-- Mobile: Score display + Inline suggestions -->
    <div class="space-y-3">
      <!-- Score display -->
      <div class="flex items-center gap-2">
        {#if loading}
          <div class="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin"></div>
          <span class="text-xs" style="color: var(--text-header-secondary);">Loading...</span>
        {:else}
          <!-- Score circle -->
          <div class="relative w-8 h-8">
            <svg class="w-8 h-8 transform -rotate-90" viewBox="0 0 24 24">
              <!-- Background circle -->
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                stroke-width="2"
                fill="none"
                class="opacity-20"
                style="color: var(--text-header-secondary);"
              />
              <!-- Progress circle -->
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke={scoreColor}
                stroke-width="2"
                fill="none"
                stroke-dasharray={2 * Math.PI * 9}
                stroke-dashoffset={2 * Math.PI * 9 * (1 - score / 100)}
                stroke-linecap="round"
                class="transition-all duration-300"
              />
            </svg>
            <!-- Score number -->
            <span class="absolute inset-0 flex items-center justify-center text-xs font-semibold" style="color: {scoreColor};">
              {score}
            </span>
          </div>

          <div class="flex flex-col items-start transition-colors">
            <span class="text-xs font-medium" style="color: var(--text-header);">Quality</span>
            <span class="text-xs" style="color: {scoreColor};">{scoreLabel}</span>
          </div>
          
          <div class="ml-auto">
            <button
              class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
              on:click={openQualityDashboard}
            >
              View Details →
            </button>
          </div>
        {/if}
      </div>
      
      <!-- World Context Status -->
      {#if worldContext && !loadingWorldContext}
        <div class="border rounded-lg overflow-hidden" style="background-color: var(--bg-header-input); border-color: var(--border-header-input);">
          <div class="p-3">
            <div class="flex items-center gap-2 mb-2">
              <Brain size="16" class={worldContext.isReady ? 'text-green-500' : 'text-yellow-500'} />
              <span class="text-sm font-medium" style="color: var(--text-header);">
                AI Context
              </span>
              <div class="px-2 py-1 rounded-full text-xs font-medium" 
                   class:bg-green-100={worldContext.isReady} 
                   class:text-green-800={worldContext.isReady}
                   class:bg-yellow-100={!worldContext.isReady} 
                   class:text-yellow-800={!worldContext.isReady}>
                {worldContext.isReady ? 'Active' : 'Building'}
              </div>
            </div>
            
            <div class="space-y-1 text-xs" style="color: var(--text-header-secondary);">
              <div class="flex items-center gap-2">
                <Users size="12" class={worldContext.hasEnoughCards ? 'text-green-500' : 'text-gray-400'} />
                <span>{worldContext.cardCount} cards</span>
                {#if worldContext.missingRequirements?.needsMoreCards}
                  <span class="text-yellow-600">(need {worldContext.missingRequirements.cardsNeeded} more)</span>
                {/if}
              </div>
              
              <div class="flex items-center gap-2">
                <FileText size="12" class={worldContext.hasDescription ? 'text-green-500' : 'text-gray-400'} />
                <span>Project description</span>
                {#if worldContext.missingRequirements?.needsDescription}
                  <span class="text-yellow-600">(needed)</span>
                {/if}
              </div>
            </div>

            {#if !worldContext.isReady}
              <button 
                on:click={generateWorldContext}
                disabled={loadingWorldContext}
                class="w-full mt-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                class:bg-yellow-100={!loadingWorldContext}
                class:text-yellow-800={!loadingWorldContext}
                class:bg-gray-100={loadingWorldContext}
                class:text-gray-500={loadingWorldContext}
                class:hover:bg-yellow-200={!loadingWorldContext}
                class:disabled:cursor-not-allowed={loadingWorldContext}
              >
                {loadingWorldContext ? 'Generating...' : 'Generate Context'}
              </button>
            {:else}
              <div class="flex items-center gap-1 mt-2 text-xs text-green-600">
                <Sparkles size="12" />
                <span>AI context is enhancing your experience!</span>
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Mobile inline suggestions -->
      {#if !loading && (loadingWorldContext || worldContext)}
        <div class="border rounded-lg overflow-hidden" style="background-color: var(--bg-header-input); border-color: var(--border-header-input);">
          {#if loadingWorldContext}
            <div class="flex items-center gap-2 p-3 text-sm text-gray-500 dark:text-gray-400">
              <div class="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin"></div>
              Loading world context...
            </div>
          {:else}
            {#each getSuggestions() as suggestion, i}
              <button
                class="w-full flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left {i < getSuggestions().length - 1 ? 'border-b' : ''}" 
                style="border-color: var(--border-header-input);"
                on:click={suggestion.action}
              >
                <svelte:component this={suggestion.icon} size="16" class="text-blue-500 mt-0.5 flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 dark:text-white">{suggestion.text}</p>
                  <p class="text-xs text-blue-600 dark:text-blue-400 font-medium">{suggestion.points}</p>
                </div>
              </button>
            {/each}
            
            {#if getSuggestions().length === 0}
              <div class="text-center py-4">
                <div class="text-green-500 mb-2">🎉</div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">Great job!</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">Your project quality is excellent</p>
              </div>
            {/if}
          {/if}
        </div>
      {/if}
    </div>
  {:else}
    <!-- Desktop: Original dropdown behavior -->
    <button
      bind:this={buttonElement}
      class="flex items-center gap-2 px-2 py-1 rounded-lg transition-all hover:bg-opacity-10 dark:hover:bg-gray-600 hover:bg-gray-200"
      title="Project Quality: {scoreLabel} ({score}/100) - Click for suggestions"
      on:click={toggleTooltip}
      disabled={loading || !projectId}
    >
    {#if loading}
      <div class="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin"></div>
      <span class="text-xs" style="color: var(--text-header-secondary);">Loading...</span>
    {:else}
      <!-- Score circle -->
      <div class="relative w-8 h-8">
        <svg class="w-8 h-8 transform -rotate-90" viewBox="0 0 24 24">
          <!-- Background circle -->
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            stroke-width="2"
            fill="none"
            class="opacity-20"
            style="color: var(--text-header-secondary);"
          />
          <!-- Progress circle -->
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke={scoreColor}
            stroke-width="2"
            fill="none"
            stroke-dasharray={2 * Math.PI * 9}
            stroke-dashoffset={2 * Math.PI * 9 * (1 - score / 100)}
            stroke-linecap="round"
            class="transition-all duration-300"
          />
        </svg>
        <!-- Score number -->
        <span class="absolute inset-0 flex items-center justify-center text-xs font-semibold" style="color: {scoreColor};">
          {score}
        </span>
      </div>

      <div class="flex flex-col items-start transition-colors">
        <span class="text-xs font-medium" style="color: var(--text-header);">Quality</span>
        <span class="text-xs" style="color: {scoreColor};">{scoreLabel}</span>
      </div>
      <div class="flex items-center ml-1">
        <ChevronDown 
          size="16" 
          class="text-gray-400 dark:text-gray-400 transition-transform {showTooltip ? 'rotate-180' : ''}"
        />
      </div>
    {/if}
    </button>

    <!-- Desktop Tooltip -->
    {#if showTooltip}
      <section
        use:createPortal
        class="fixed w-80 bg-white border dark:border-gray-600 rounded-lg shadow-xl z-[999999]" style="background-color: var(--bg-primary); top: var(--tooltip-top, 0px); left: var(--tooltip-left, 0px);"
        role="dialog"
        aria-modal="true"
        tabindex="0"
        on:click|stopPropagation
        on:keydown={(e) => {
          if (e.key === 'Escape') showTooltip = false;
        }}
      >
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white text-sm">Improve Your Quality</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">Current score: {score}/100</p>
          </div>
          <button on:click={() => showTooltip = false} class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size="16" />
          </button>
        </div>
        
        <!-- World Context Status -->
        {#if worldContext && !loadingWorldContext}
          <div class="px-4 py-3 border-b dark:border-gray-700">
            <div class="flex items-center gap-2 mb-2">
              <Brain size="16" class={worldContext.isReady ? 'text-green-500' : 'text-yellow-500'} />
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                AI Context
              </span>
              <div class="px-2 py-1 rounded-full text-xs font-medium" 
                   class:bg-green-100={worldContext.isReady} 
                   class:text-green-800={worldContext.isReady}
                   class:bg-yellow-100={!worldContext.isReady} 
                   class:text-yellow-800={!worldContext.isReady}>
                {worldContext.isReady ? 'Active' : 'Building'}
              </div>
            </div>
            
            <div class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <div class="flex items-center gap-2">
                <Users size="12" class={worldContext.hasEnoughCards ? 'text-green-500' : 'text-gray-400'} />
                <span>{worldContext.cardCount} cards</span>
                {#if worldContext.missingRequirements?.needsMoreCards}
                  <span class="text-yellow-600">(need {worldContext.missingRequirements.cardsNeeded} more)</span>
                {/if}
              </div>
              
              <div class="flex items-center gap-2">
                <FileText size="12" class={worldContext.hasDescription ? 'text-green-500' : 'text-gray-400'} />
                <span>Project description</span>
                {#if worldContext.missingRequirements?.needsDescription}
                  <span class="text-yellow-600">(needed)</span>
                {/if}
              </div>
            </div>

            {#if !worldContext.isReady}
              <button 
                on:click={generateWorldContext}
                disabled={loadingWorldContext}
                class="w-full mt-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                class:bg-yellow-100={!loadingWorldContext}
                class:text-yellow-800={!loadingWorldContext}
                class:bg-gray-100={loadingWorldContext}
                class:text-gray-500={loadingWorldContext}
                class:hover:bg-yellow-200={!loadingWorldContext}
                class:disabled:cursor-not-allowed={loadingWorldContext}
              >
                {loadingWorldContext ? 'Generating...' : 'Generate Context'}
              </button>
            {:else}
              <div class="flex items-center gap-1 mt-2 text-xs text-green-600">
                <Sparkles size="12" />
                <span>AI context is enhancing your experience!</span>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Suggestions -->
        <div class="p-4">
          {#if loadingWorldContext}
            <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <div class="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin"></div>
              Loading world context...
            </div>
          {:else}
            {#each getSuggestions() as suggestion}
              <button
                class="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                on:click={suggestion.action}
              >
                <svelte:component this={suggestion.icon} size="16" class="text-blue-500 mt-0.5 flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 dark:text-white">{suggestion.text}</p>
                  <p class="text-xs text-blue-600 dark:text-blue-400 font-medium">{suggestion.points}</p>
                </div>
              </button>
            {/each}
            
            {#if getSuggestions().length === 0}
              <div class="text-center py-3">
                <div class="text-green-500 mb-2">🎉</div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">Great job!</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">Your project quality is excellent</p>
              </div>
            {/if}
            
          {/if}
        </div>
      </section>
    {/if}
  {/if}
</div>
