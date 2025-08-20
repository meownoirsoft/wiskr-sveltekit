<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { X, CheckCircle, AlertCircle, Info, Plus, Pin, FileText, Users, TrendingUp } from 'lucide-svelte';
  import { browser } from '$app/environment';

  export let projectId;
  export let visible = false;

  const dispatch = createEventDispatcher();

  let analysis = null;
  let loading = true;
  let error = null;
  let refreshListener = null;

  $: if (visible && projectId) {
    loadAnalysis();
    setupEventListeners();
  } else if (!visible) {
    cleanupEventListeners();
  }
  
  // Set up event listeners for automatic refresh when context changes
  function setupEventListeners() {
    if (!browser || refreshListener) return;
    
    refreshListener = () => {
      if (visible && projectId) {
        loadAnalysis();
      }
    };
    
    window.addEventListener('fact:created', refreshListener);
    window.addEventListener('fact:pinned', refreshListener);
    window.addEventListener('fact:unpinned', refreshListener);
    window.addEventListener('project:updated', refreshListener);
  }
  
  // Clean up event listeners
  function cleanupEventListeners() {
    if (!browser || !refreshListener) return;
    
    window.removeEventListener('fact:created', refreshListener);
    window.removeEventListener('fact:pinned', refreshListener);
    window.removeEventListener('fact:unpinned', refreshListener);
    window.removeEventListener('project:updated', refreshListener);
    refreshListener = null;
  }
  
  onDestroy(() => {
    cleanupEventListeners();
  });

  async function loadAnalysis() {
    loading = true;
    error = null;
    
    try {
      const response = await fetch('/api/context/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId,
          userMessage: "Analyze my project context" 
        })
      });

      if (!response.ok) throw new Error('Failed to load analysis');
      
      analysis = await response.json();
    } catch (err) {
      console.error('Context analysis error:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }

  function close() {
    visible = false;
    dispatch('close');
  }

  function getSuggestions(analysis) {
    const suggestions = [];
    
    if (!analysis?.summary?.hasProjectDescription) {
      suggestions.push({
        type: 'critical',
        icon: FileText,
        title: 'Add Project Description',
        description: 'Write a comprehensive description of your project goals, themes, and context.',
        points: '+30 points',
        action: 'Add Description',
        actionType: 'open-settings'
      });
    }

    const pinnedFactsCount = analysis?.summary?.pinnedFactsCount || 0;
    if (pinnedFactsCount < 5) {
      suggestions.push({
        type: 'important',
        icon: Pin,
        title: 'Pin More Critical Facts',
        description: `You have ${pinnedFactsCount} pinned facts. Pin key information that should always be included in AI conversations.`,
        points: `+${Math.min(4 * (10 - pinnedFactsCount), 40)} points`,
        action: 'Browse Facts',
        actionType: 'navigate-facts'
      });
    }

    const entityCardsCount = analysis?.summary?.entityCardsCount || 0;
    if (entityCardsCount < 5) {
      suggestions.push({
        type: 'helpful',
        icon: Users,
        title: 'Generate Entity Cards',
        description: `You have ${entityCardsCount} entity cards. These AI-generated summaries help organize information about characters, places, and concepts.`,
        points: `+${Math.min(2.5 * (8 - entityCardsCount), 20)} points`,
        action: 'Generate Cards',
        actionType: 'generate-entities'
      });
    }

    return suggestions;
  }

  function handleSuggestionAction(suggestion) {
    if (suggestion.actionType === 'open-settings') {
      dispatch('open-settings');
    } else if (suggestion.actionType === 'navigate-facts') {
      dispatch('navigate-facts');
    } else if (suggestion.actionType === 'generate-entities') {
      dispatch('generate-entities');
    }
    close();
  }

  function getScoreColor(score) {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  }
</script>

{#if visible}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" on:click={close}>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" on:click|stopPropagation>
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b dark:border-gray-700">
        <div class="flex items-center gap-3">
          <TrendingUp size="24" class="text-blue-500" />
          <div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Project Quality</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Analyze and improve your project for better AI conversations</p>
          </div>
        </div>
        <button on:click={close} class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <X size="24" />
        </button>
      </div>

      {#if loading}
        <div class="p-8 text-center">
          <div class="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p class="text-gray-500 dark:text-gray-400">Analyzing context quality...</p>
        </div>
      {:else if error}
        <div class="p-8 text-center">
          <AlertCircle size="48" class="mx-auto text-red-500 mb-4" />
          <p class="text-red-600 dark:text-red-400 mb-2">Failed to analyze context</p>
          <p class="text-gray-500 dark:text-gray-400 text-sm">{error}</p>
        </div>
      {:else if analysis}
        <div class="p-6">
          <!-- Score Overview -->
          <div class="mb-8 text-center">
            <div class="inline-flex items-center gap-4 p-6 rounded-lg bg-gray-50 dark:bg-gray-700">
              <div class="relative w-16 h-16">
                <svg class="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    stroke-width="4"
                    fill="none"
                    class="text-gray-300 dark:text-gray-600"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke={getScoreColor(analysis.summary.contextQualityScore)}
                    stroke-width="4"
                    fill="none"
                    stroke-dasharray={2 * Math.PI * 28}
                    stroke-dashoffset={2 * Math.PI * 28 * (1 - analysis.summary.contextQualityScore / 100)}
                    stroke-linecap="round"
                    class="transition-all duration-500"
                  />
                </svg>
                <span class="absolute inset-0 flex items-center justify-center text-2xl font-bold" style="color: {getScoreColor(analysis.summary.contextQualityScore)};">
                  {analysis.summary.contextQualityScore}
                </span>
              </div>
              <div class="text-left">
                <h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {analysis.summary.contextQualityScore}/100
                </h3>
                <p class="text-gray-600 dark:text-gray-300 mb-2">
                  {analysis.summary.contextQualityScore >= 80 ? 'Excellent context!' : 
                   analysis.summary.contextQualityScore >= 60 ? 'Good context quality' :
                   analysis.summary.contextQualityScore >= 40 ? 'Fair context quality' : 'Context needs improvement'}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {analysis.metrics.estimatedTokens} tokens • {analysis.sections.length} sections
                </p>
              </div>
            </div>
          </div>

          <!-- Context Sections -->
          <div class="mb-8">
            <h4 class="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Info size="20" />
              Context Breakdown
            </h4>
            <div class="space-y-3">
              {#each analysis.sections as section}
                <div class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <div class="flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full bg-green-500"></div>
                    <div>
                      <span class="font-medium text-gray-900 dark:text-white">{section.name}</span>
                      {#if section.itemCount}
                        <span class="text-sm text-gray-500 dark:text-gray-400">({section.itemCount} items)</span>
                      {/if}
                    </div>
                  </div>
                  <div class="text-right">
                    <span class="text-sm font-medium text-gray-900 dark:text-white">
                      {section.charCount.toLocaleString()} chars
                    </span>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Priority {section.priority}</p>
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <!-- Improvement Suggestions -->
          {#if getSuggestions(analysis).length > 0}
            <div class="mb-6">
              <h4 class="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp size="20" />
                Improvement Suggestions
              </h4>
              <div class="space-y-3">
                {#each getSuggestions(analysis) as suggestion}
                  <div class="flex items-start gap-3 p-4 rounded-lg border {suggestion.type === 'critical' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : 
                                                                            suggestion.type === 'important' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20' : 
                                                                            'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'}">
                    <svelte:component this={suggestion.icon} size="20" class="{suggestion.type === 'critical' ? 'text-red-500' : 
                                                                                  suggestion.type === 'important' ? 'text-yellow-500' : 
                                                                                  'text-blue-500'} mt-0.5 flex-shrink-0" />
                    <div class="flex-1">
                      <div class="flex items-center justify-between mb-1">
                        <h5 class="font-medium text-gray-900 dark:text-white">{suggestion.title}</h5>
                        <span class="text-sm font-medium {suggestion.type === 'critical' ? 'text-red-600' : 
                                                           suggestion.type === 'important' ? 'text-yellow-600' : 
                                                           'text-blue-600'}">{suggestion.points}</span>
                      </div>
                      <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">{suggestion.description}</p>
                      <button
                        class="inline-flex items-center gap-1 text-sm font-medium px-3 py-1 rounded {suggestion.type === 'critical' ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-800 dark:text-red-200' : 
                                                                                                       suggestion.type === 'important' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-800 dark:text-yellow-200' : 
                                                                                                       'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-200'} transition-colors"
                        on:click={() => handleSuggestionAction(suggestion)}
                      >
                        {suggestion.action}
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Footer -->
          <div class="pt-4 border-t dark:border-gray-700">
            <p class="text-xs text-gray-500 dark:text-gray-400 text-center">
              Project quality affects how well AI understands your project. Higher scores mean more relevant and accurate responses.
            </p>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
