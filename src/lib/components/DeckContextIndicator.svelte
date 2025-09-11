<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { Brain, FileText, Users, ChevronDown, X, Sparkles, Tag, Zap, User } from 'lucide-svelte';

  export let deckId = null;
  export let sectionId = null;
  export let darkMode = false;
  export let isMobile = false;

  const dispatch = createEventDispatcher();

  let context = null;
  let loading = false;
  let showDetails = false;
  let buttonElement;

  $: isDeck = !!deckId;
  $: isSection = !!sectionId;
  $: contextType = isDeck ? 'deck' : 'section';

  async function loadContext() {
    if (!deckId && !sectionId) return;
    
    loading = true;
    try {
      const url = isDeck 
        ? `/api/decks/${deckId}/context?action=readiness`
        : `/api/deck-sections/${sectionId}/context?action=readiness`;
      
      const response = await fetch(url);
      if (response.ok) {
        context = await response.json();
      }
    } catch (error) {
      console.error('Failed to load context:', error);
    } finally {
      loading = false;
    }
  }

  async function generateContext() {
    if (!deckId && !sectionId) return;
    
    loading = true;
    try {
      const url = isDeck 
        ? `/api/decks/${deckId}/context`
        : `/api/deck-sections/${sectionId}/context`;
      
      const response = await fetch(url, { method: 'POST' });
      if (response.ok) {
        await loadContext(); // Refresh status
      }
    } catch (error) {
      console.error('Failed to generate context:', error);
    } finally {
      loading = false;
    }
  }

  function toggleDetails() {
    showDetails = !showDetails;
  }

  function getContextScore() {
    if (!context) return 0;
    
    let score = 0;
    if (context.hasEnoughCards) score += 50;
    if (isDeck && context.hasDescription) score += 50;
    if (isSection) score += 50; // Sections don't need description
    
    return score;
  }

  function getScoreColor(score) {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#f59e0b'; // amber  
    if (score >= 40) return '#f97316'; // orange
    return '#ef4444'; // red
  }

  function getScoreLabel(score) {
    if (score >= 80) return 'Ready';
    if (score >= 60) return 'Building';
    if (score >= 40) return 'Needs Work';
    return 'Not Ready';
  }

  onMount(() => {
    loadContext();
  });

  $: if (deckId || sectionId) {
    loadContext();
  }
</script>

<div class="deck-context-indicator">
  {#if isMobile}
    <!-- Mobile: Compact display -->
    <div class="flex items-center gap-2 p-2 rounded-lg border" 
         style="background-color: var(--bg-header-input); border-color: var(--border-header-input);">
      <Brain size="16" class={context?.isReady ? 'text-green-500' : 'text-yellow-500'} />
      <span class="text-sm font-medium" style="color: var(--text-header);">
        {contextType === 'deck' ? 'Deck' : 'Section'} Context
      </span>
      <div class="px-2 py-1 rounded-full text-xs font-medium" 
           class:bg-green-100={context?.isReady} 
           class:text-green-800={context?.isReady}
           class:bg-yellow-100={!context?.isReady} 
           class:text-yellow-800={!context?.isReady}>
        {context?.isReady ? 'Active' : 'Building'}
      </div>
      <div class="ml-auto text-xs" style="color: var(--text-header-secondary);">
        {getContextScore()}%
      </div>
    </div>
  {:else}
    <!-- Desktop: Button with dropdown -->
    <div class="relative">
      <button
        bind:this={buttonElement}
        class="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:bg-opacity-10 dark:hover:bg-gray-600 hover:bg-gray-200"
        style="color: var(--text-header);"
        on:click={toggleDetails}
        disabled={loading}
      >
        <Brain size="16" class={context?.isReady ? 'text-green-500' : 'text-yellow-500'} />
        <span class="text-sm font-medium">
          {contextType === 'deck' ? 'Deck' : 'Section'} Context
        </span>
        <div class="px-2 py-1 rounded-full text-xs font-medium" 
             class:bg-green-100={context?.isReady} 
             class:text-green-800={context?.isReady}
             class:bg-yellow-100={!context?.isReady} 
             class:text-yellow-800={!context?.isReady}>
          {context?.isReady ? 'Active' : 'Building'}
        </div>
        <ChevronDown size="14" class="transition-transform {showDetails ? 'rotate-180' : ''}" />
      </button>

      <!-- Dropdown Details -->
      {#if showDetails}
        <div class="absolute top-full left-0 mt-2 w-80 bg-white border dark:border-gray-600 rounded-lg shadow-xl z-50" 
             style="background-color: var(--bg-primary);">
          <!-- Header -->
          <div class="flex items-center justify-between p-4 border-b dark:border-gray-700">
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white text-sm">
                {contextType === 'deck' ? 'Deck' : 'Section'} Context
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Score: {getContextScore()}% - {getScoreLabel(getContextScore())}
              </p>
            </div>
            <button on:click={() => showDetails = false} class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X size="16" />
            </button>
          </div>

          <!-- Content -->
          <div class="p-4">
            {#if loading}
              <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <div class="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                Loading context...
              </div>
            {:else if context}
              <!-- Requirements Status -->
              <div class="space-y-2 mb-4">
                <div class="flex items-center gap-2 text-sm">
                  <Users size="14" class={context.hasEnoughCards ? 'text-green-500' : 'text-gray-400'} />
                  <span class="text-gray-600 dark:text-gray-400">
                    {context.cardCount} cards
                    {#if context.missingRequirements?.needsMoreCards}
                      <span class="text-yellow-600"> (need {context.missingRequirements.cardsNeeded} more)</span>
                    {/if}
                  </span>
                </div>
                
                {#if isDeck}
                  <div class="flex items-center gap-2 text-sm">
                    <FileText size="14" class={context.hasDescription ? 'text-green-500' : 'text-gray-400'} />
                    <span class="text-gray-600 dark:text-gray-400">
                      Deck description
                      {#if context.missingRequirements?.needsDescription}
                        <span class="text-yellow-600"> (needed)</span>
                      {/if}
                    </span>
                  </div>
                {/if}
              </div>

              <!-- Action Button -->
              {#if !context.isReady}
                <button 
                  on:click={generateContext}
                  disabled={loading}
                  class="w-full px-3 py-2 text-sm font-medium rounded-md transition-colors"
                  class:bg-yellow-100={!loading}
                  class:text-yellow-800={!loading}
                  class:bg-gray-100={loading}
                  class:text-gray-500={loading}
                  class:hover:bg-yellow-200={!loading}
                  class:disabled:cursor-not-allowed={loading}
                >
                  {loading ? 'Generating...' : 'Generate Context'}
                </button>
              {:else}
                <div class="flex items-center gap-1 text-sm text-green-600">
                  <Sparkles size="14" />
                  <span>AI context is active!</span>
                </div>
              {/if}
            {:else}
              <div class="text-sm text-gray-500 dark:text-gray-400">
                Failed to load context
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .deck-context-indicator {
    position: relative;
  }
</style>


