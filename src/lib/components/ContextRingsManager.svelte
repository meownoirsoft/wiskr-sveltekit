<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { Brain, Globe, Home, Target, Users, Settings, Zap, Info } from 'lucide-svelte';
  import { getContextRings, BUDGET_LEVELS, OPERATION_TYPES } from '$lib/client/contextRings.js';


  export let projectId = null;
  export let operation = 'create';
  export let targetCards = [];
  export let deckId = null;
  export let sectionId = null;
  export let userMessage = '';
  export let budget = 'medium';
  export let darkMode = false;

  const dispatch = createEventDispatcher();

  let context = null;
  let loading = false;
  let showDetails = false;
  let error = null;

  $: operationInfo = OPERATION_TYPES[operation] || OPERATION_TYPES.create;
  $: budgetInfo = BUDGET_LEVELS[budget] || BUDGET_LEVELS.medium;

  async function loadContext() {
    if (!projectId) {
      console.log('No projectId, skipping context load');
      return;
    }
    
    console.log('Loading context rings with params:', {
      operation,
      targetCards,
      deckId,
      sectionId,
      userMessage,
      budget,
      projectId
    });
    
    loading = true;
    error = null;
    
    try {
      context = await getContextRings({
        operation,
        targetCards,
        deckId,
        sectionId,
        userMessage,
        budget,
        projectId
      });
      
      console.log('Context loaded successfully:', context);
      dispatch('context-loaded', { context });
    } catch (err) {
      error = err.message;
      console.error('Error loading context rings:', err);
    } finally {
      loading = false;
    }
  }

  function toggleDetails() {
    showDetails = !showDetails;
  }

  function getRingIcon(ringName) {
    switch (ringName) {
      case 'global': return Globe;
      case 'local': return Home;
      case 'target': return Target;
      case 'neighbors': return Users;
      default: return Brain;
    }
  }

  function getRingColor(ringName) {
    switch (ringName) {
      case 'global': return 'text-blue-500';
      case 'local': return 'text-green-500';
      case 'target': return 'text-red-500';
      case 'neighbors': return 'text-purple-500';
      default: return 'text-gray-500';
    }
  }

  function getRingBgColor(ringName) {
    switch (ringName) {
      case 'global': return 'bg-blue-50 border-blue-200';
      case 'local': return 'bg-green-50 border-green-200';
      case 'target': return 'bg-red-50 border-red-200';
      case 'neighbors': return 'bg-purple-50 border-purple-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  }

  function getUsagePercentage(tokens, maxTokens) {
    if (maxTokens === 0) return 0;
    return Math.min((tokens / maxTokens) * 100, 100);
  }

  function getUsageColor(percentage) {
    if (percentage < 50) return 'text-green-600';
    if (percentage < 80) return 'text-yellow-600';
    return 'text-red-600';
  }

  onMount(() => {
    if (projectId) {
      loadContext();
    }
  });

  // Reload when any relevant parameter changes
  $: if (projectId) {
    loadContext();
  }

  // Force reload when parameters change by watching them explicitly
  $: {
    if (projectId) {
      // This will trigger whenever any of these values change
      const params = { operation, budget, userMessage, deckId, sectionId, targetCards };
      loadContext();
    }
  }
</script>

<div class="context-rings-manager">
  <!-- Header -->
  <div class="flex items-center justify-between mb-4">
    <div class="flex items-center space-x-2">
      <Brain class="w-5 h-5 text-blue-500" />
      <h3 class="text-lg font-semibold">Context Rings</h3>
    </div>
    <div class="flex items-center space-x-2">
      <button
        on:click={toggleDetails}
        class="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
      >
        <Settings class="w-4 h-4" />
        <span>{showDetails ? 'Hide' : 'Show'} Details</span>
      </button>
    </div>
  </div>

  <!-- Operation Info -->
  <div class="mb-4 p-3 bg-gray-50 rounded-lg">
    <div class="flex items-center justify-between">
      <div>
        <h4 class="font-medium text-gray-900">{operationInfo.name} Operation</h4>
        <p class="text-sm text-gray-600">{operationInfo.description}</p>
      </div>
      <div class="text-right">
        <div class="text-sm font-medium text-gray-900">{budgetInfo.name}</div>
        <div class="text-xs text-gray-500">{budgetInfo.totalTokens.toLocaleString()} tokens</div>
      </div>
    </div>
  </div>

  <!-- Loading State -->
  {#if loading}
    <div class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span class="ml-2 text-gray-600">Loading context rings...</span>
    </div>
  {/if}

  <!-- Error State -->
  {#if error}
    <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
      <div class="flex items-center">
        <Info class="w-5 h-5 text-red-500 mr-2" />
        <span class="text-red-700">Error loading context: {error}</span>
      </div>
    </div>
  {/if}

  <!-- Context Rings -->
  {#if context && !loading}
    <div class="space-y-4">
      <!-- Ring Overview -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        {#each Object.entries(context.metadata?.tokenUsage || {}) as [ringName, tokens]}
          {#if ringName !== 'total'}
            {@const Icon = getRingIcon(ringName)}
            {@const maxTokens = context.metadata?.tokenUsage?.[ringName] || 0}
            {@const percentage = getUsagePercentage(tokens, maxTokens)}
            {@const colorClass = getRingColor(ringName)}
            {@const bgClass = getRingBgColor(ringName)}
            
            <div class="p-3 rounded-lg border {bgClass}">
              <div class="flex items-center justify-between mb-2">
                <Icon class="w-4 h-4 {colorClass}" />
                <span class="text-xs font-medium uppercase text-gray-600">{ringName}</span>
              </div>
              <div class="text-lg font-bold {colorClass}">{tokens}</div>
              <div class="text-xs text-gray-500">/ {maxTokens} tokens</div>
              <div class="mt-1 w-full bg-gray-200 rounded-full h-1">
                <div 
                  class="h-1 rounded-full {colorClass.replace('text-', 'bg-')}"
                  style="width: {percentage}%"
                ></div>
              </div>
            </div>
          {/if}
        {/each}
      </div>

      <!-- Total Usage -->
      <div class="p-4 bg-gray-50 rounded-lg">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <Zap class="w-5 h-5 text-gray-600" />
            <span class="font-medium text-gray-900">Total Usage</span>
          </div>
          <div class="text-right">
            <div class="text-lg font-bold text-gray-900">
              {context.metadata.tokenUsage.total.toLocaleString()}
            </div>
            <div class="text-sm text-gray-500">
              {((context.metadata.tokenUsage.total / budgetInfo.totalTokens) * 100).toFixed(1)}% of budget
            </div>
          </div>
        </div>
      </div>

      <!-- Detailed Content -->
      {#if showDetails}
        <div class="space-y-4">
          <!-- System Prompt (Global + Local) -->
          <div class="border rounded-lg bg-blue-50 border-blue-200">
            <div class="p-3 border-b border-gray-200">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <Globe class="w-5 h-5 text-blue-500" />
                  <h4 class="font-medium text-gray-900">System Context (Global + Local)</h4>
                </div>
                <div class="text-sm text-gray-500">
                  {context.metadata?.tokenUsage?.global || 0} + {context.metadata?.tokenUsage?.local || 0} tokens
                </div>
              </div>
            </div>
            <div class="p-3">
              <pre class="text-xs text-gray-700 whitespace-pre-wrap font-mono">{context.systemPrompt || 'No system context'}</pre>
            </div>
          </div>

          <!-- User Context (Target + Neighbors) -->
          <div class="border rounded-lg bg-red-50 border-red-200">
            <div class="p-3 border-b border-gray-200">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <Target class="w-5 h-5 text-red-500" />
                  <h4 class="font-medium text-gray-900">User Context (Target + Neighbors)</h4>
                </div>
                <div class="text-sm text-gray-500">
                  {context.metadata?.tokenUsage?.target || 0} + {context.metadata?.tokenUsage?.neighbors || 0} tokens
                </div>
              </div>
            </div>
            <div class="p-3">
              <pre class="text-xs text-gray-700 whitespace-pre-wrap font-mono">{context.userContext || 'No user context'}</pre>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .context-rings-manager {
    @apply w-full;
  }
</style>
