<script>
  import { onMount } from 'svelte';
  import { Brain, Users, FileText, Sparkles } from 'lucide-svelte';

  export let projectId;
  export let darkMode = false;

  let readiness = null;
  let loading = true;
  let error = null;

  onMount(async () => {
    await checkReadiness();
  });

  async function checkReadiness() {
    try {
      loading = true;
      const response = await fetch(`/api/projects/${projectId}/world-context?action=readiness`);
      if (response.ok) {
        readiness = await response.json();
      } else {
        error = 'Failed to check world context readiness';
      }
    } catch (err) {
      error = 'Error checking world context readiness';
      console.error(err);
    } finally {
      loading = false;
    }
  }

  async function generateContext() {
    try {
      loading = true;
      const response = await fetch(`/api/projects/${projectId}/world-context`, {
        method: 'POST'
      });
      if (response.ok) {
        await checkReadiness(); // Refresh status
      } else {
        error = 'Failed to generate world context';
      }
    } catch (err) {
      error = 'Error generating world context';
      console.error(err);
    } finally {
      loading = false;
    }
  }

  $: contextScore = readiness ? Math.round((readiness.cardCount / 5) * 50 + (readiness.hasDescription ? 50 : 0)) : 0;
  $: isReady = readiness?.isReady || false;
  $: needsMoreCards = readiness?.missingRequirements?.needsMoreCards || false;
  $: needsDescription = readiness?.missingRequirements?.needsDescription || false;
  $: cardsNeeded = readiness?.missingRequirements?.cardsNeeded || 0;
</script>

{#if loading}
  <div class="flex items-center gap-2 text-sm" style:color={darkMode ? '#9ca3af' : '#6b7280'}>
    <div class="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
    <span>Analyzing world context...</span>
  </div>
{:else if error}
  <div class="text-sm text-red-500">
    {error}
  </div>
{:else if readiness}
  <div class="space-y-3">
    <!-- Context Status Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Brain size="16" class={isReady ? 'text-green-500' : 'text-yellow-500'} />
        <span class="text-sm font-medium" style:color={darkMode ? '#ffffff' : '#111827'}>
          World Context
        </span>
        <div class="px-2 py-1 rounded-full text-xs font-medium" 
             class:bg-green-100={isReady} 
             class:text-green-800={isReady}
             class:bg-yellow-100={!isReady} 
             class:text-yellow-800={!isReady}>
          {isReady ? 'Ready' : 'Building'}
        </div>
      </div>
      <div class="text-xs" style:color={darkMode ? '#9ca3af' : '#6b7280'}>
        {contextScore}%
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="w-full bg-gray-200 rounded-full h-2" style:background-color={darkMode ? '#374151' : '#e5e7eb'}>
      <div class="h-2 rounded-full transition-all duration-300" 
           class:bg-green-500={isReady}
           class:bg-yellow-500={!isReady}
           style:width="{contextScore}%"></div>
    </div>

    <!-- Requirements Status -->
    <div class="space-y-2">
      <div class="flex items-center gap-2 text-sm">
        <Users size="14" class={readiness.hasEnoughCards ? 'text-green-500' : 'text-gray-400'} />
        <span style:color={darkMode ? '#d1d5db' : '#374151'}>
          {readiness.cardCount} cards
          {needsMoreCards && <span class="text-yellow-600"> (need {cardsNeeded} more)</span>}
        </span>
      </div>
      
      <div class="flex items-center gap-2 text-sm">
        <FileText size="14" class={readiness.hasDescription ? 'text-green-500' : 'text-gray-400'} />
        <span style:color={darkMode ? '#d1d5db' : '#374151'}>
          Project description
          {needsDescription && <span class="text-yellow-600"> (needed)</span>}
        </span>
      </div>
    </div>

    <!-- Action Button -->
    {#if !isReady}
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
        {loading ? 'Generating...' : 'Generate Context Now'}
      </button>
    {:else}
      <div class="flex items-center gap-2 text-sm text-green-600">
        <Sparkles size="14" />
        <span>AI context is active and enhancing your experience!</span>
      </div>
    {/if}
  </div>
{/if}
