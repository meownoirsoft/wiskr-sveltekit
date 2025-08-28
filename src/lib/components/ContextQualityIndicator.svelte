<script>
  import { createEventDispatcher } from 'svelte';
  import { Info, TrendingUp, X, Pin, FileText, Users, ChevronDown } from 'lucide-svelte';

  export let score = 0;
  export let loading = false;
  export let projectId = null;
  export let isMobile = false;

  const dispatch = createEventDispatcher();

  let showTooltip = false;
  let analysis = null;
  let loadingAnalysis = false;
  let lastAnalysisScore = null;

  $: scoreColor = getScoreColor(score);
  $: scoreLabel = getScoreLabel(score);
  
  // Auto-load analysis for mobile immediately when score is available
  $: if (isMobile && score && projectId && !analysis && !loadingAnalysis) {
    loadAnalysis();
  }
  
  // Clear analysis when score changes (indicates fresh data)
  $: if (analysis && lastAnalysisScore !== score) {
    const wasTooltipOpen = showTooltip;
    analysis = null;
    lastAnalysisScore = score;
    
    // If tooltip is currently open OR mobile, refresh the analysis immediately
    if (wasTooltipOpen || isMobile) {
      loadAnalysis();
    }
  }

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
      // Always load fresh analysis when opening tooltip, regardless of cache
      // This ensures suggestions are always up-to-date with the current score
      await loadAnalysis();
    }
    showTooltip = !showTooltip;
  }

  async function loadAnalysis() {
    if (!projectId) return;
    
    loadingAnalysis = true;
    try {
      const response = await fetch('/api/context/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId,
          userMessage: "Quick quality check" 
        })
      });
      
      if (response.ok) {
        analysis = await response.json();
        lastAnalysisScore = score; // Track the score this analysis corresponds to
      }
    } catch (error) {
      console.error('Failed to load analysis:', error);
    } finally {
      loadingAnalysis = false;
    }
  }

  function getSuggestions(analysis) {
    if (!analysis) return [];
    
    const suggestions = [];
    
    if (!analysis.summary?.hasProjectDescription) {
      suggestions.push({
        icon: FileText,
        text: 'Add a project description',
        points: '+30 points',
        action: () => dispatch('open-settings')
      });
    }

    const pinnedFactsCount = analysis.summary?.pinnedFactsCount || 0;
    if (pinnedFactsCount < 5) {
      const needed = Math.min(5 - pinnedFactsCount, 10);
      suggestions.push({
        icon: Pin,
        text: `Pin ${needed} more critical facts`,
        points: `+${needed * 4} points`,
        action: () => dispatch('navigate-facts')
      });
    }

    const entityCardsCount = analysis.summary?.entityCardsCount || 0;
    if (entityCardsCount < 5) {
      const needed = Math.min(5 - entityCardsCount, 8);
      suggestions.push({
        icon: Users,
        text: `Generate ${needed} more entity cards`,
        points: `+${Math.round(needed * 2.5)} points`,
        action: () => dispatch('generate-entities')
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
      
      <!-- Mobile inline suggestions -->
      {#if !loading && (loadingAnalysis || analysis)}
        <div class="border rounded-lg overflow-hidden" style="background-color: var(--bg-header-input); border-color: var(--border-header-input);">
          {#if loadingAnalysis}
            <div class="flex items-center gap-2 p-3 text-sm text-gray-500 dark:text-gray-400">
              <div class="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin"></div>
              Loading suggestions...
            </div>
          {:else if analysis}
            {#each getSuggestions(analysis) as suggestion, i}
              <button
                class="w-full flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left {i < getSuggestions(analysis).length - 1 ? 'border-b' : ''}" 
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
            
            {#if getSuggestions(analysis).length === 0}
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
        class="absolute top-full left-0 mt-2 w-80 bg-white border dark:border-gray-600 rounded-lg shadow-xl z-[50]" style="background-color: var(--bg-primary);"
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
        
        <!-- Suggestions -->
        <div class="p-4">
          {#if loadingAnalysis}
            <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <div class="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin"></div>
              Loading suggestions...
            </div>
          {:else if analysis}
            {#each getSuggestions(analysis) as suggestion}
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
            
            {#if getSuggestions(analysis).length === 0}
              <div class="text-center py-3">
                <div class="text-green-500 mb-2">🎉</div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">Great job!</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">Your project quality is excellent</p>
              </div>
            {/if}
            
            <!-- View Details Link -->
            <div class="pt-3 mt-3 border-t dark:border-gray-700">
              <button
                class="w-full text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                on:click={openQualityDashboard}
              >
                View detailed breakdown →
              </button>
            </div>
          {/if}
        </div>
      </section>
    {/if}
  {/if}
</div>
