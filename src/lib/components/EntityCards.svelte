<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { User, MapPin, Calendar, Building, Lightbulb, Package, HelpCircle, RefreshCw, Zap } from 'lucide-svelte';
  
  const dispatch = createEventDispatcher();
  
  export let projectId;
  export let facts = [];
  
  let entityCards = [];
  let loading = false;
  let generating = false;
  let error = null;
  
  // Entity type configurations
  const entityTypeConfig = {
    character: { icon: User, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', label: 'Character' },
    place: { icon: MapPin, color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', label: 'Place' },
    event: { icon: Calendar, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300', label: 'Event' },
    organization: { icon: Building, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300', label: 'Organization' },
    concept: { icon: Lightbulb, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300', label: 'Concept' },
    object: { icon: Package, color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', label: 'Object' },
    other: { icon: HelpCircle, color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', label: 'Other' }
  };
  
  onMount(() => {
    if (projectId) {
      loadEntityCards();
    }
  });
  
  // Reload cards when project changes
  $: if (projectId) {
    loadEntityCards();
  }
  
  async function loadEntityCards() {
    if (!projectId || loading) return;
    
    loading = true;
    error = null;
    
    try {
      const res = await fetch(`/api/entity-cards/generate?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        entityCards = data.cards || [];
      } else {
        const errorData = await res.json();
        error = errorData.error || 'Failed to load entity cards';
        console.error('Failed to load entity cards:', error);
      }
    } catch (err) {
      error = 'Failed to load entity cards: ' + err.message;
      console.error('Error loading entity cards:', err);
    } finally {
      loading = false;
    }
  }
  
  async function generateCards() {
    if (!projectId || generating) return;
    
    generating = true;
    error = null;
    
    try {
      const res = await fetch('/api/entity-cards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, mode: 'full' })
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('✅ Generated entity cards:', data.message);
        
        // Reload cards to show the new ones
        await loadEntityCards();
        
        // Notify parent component
        dispatch('cards-generated', {
          cardsGenerated: data.cardsGenerated,
          entitiesDetected: data.entitiesDetected
        });
      } else {
        const errorData = await res.json();
        error = errorData.error || 'Failed to generate entity cards';
      }
    } catch (err) {
      error = 'Failed to generate entity cards: ' + err.message;
      console.error('Error generating entity cards:', err);
    } finally {
      generating = false;
    }
  }
  
  function getEntityTypeConfig(entityType) {
    return entityTypeConfig[entityType] || entityTypeConfig.other;
  }
  
  function formatConfidenceScore(score) {
    return Math.round(score * 100) + '%';
  }
  
  function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<div class="entity-cards-container">
  <!-- Header -->
  <div class="flex items-center justify-between mb-4">
    <div class="flex items-center gap-2">
      <Zap size="18" class="text-blue-600 dark:text-blue-400" />
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Entity Cards</h3>
      {#if entityCards.length > 0}
        <span class="text-sm bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded-full">
          {entityCards.length}
        </span>
      {/if}
    </div>
    
    <div class="flex items-center gap-2">
      <button
        on:click={loadEntityCards}
        disabled={loading}
        class="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 
               transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Refresh cards"
      >
        <RefreshCw size="16" class={loading ? 'animate-spin' : ''} />
      </button>
      
      <button
        on:click={generateCards}
        disabled={generating || facts.length === 0}
        class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg
               transition-colors disabled:opacity-50 disabled:cursor-not-allowed
               flex items-center gap-1.5"
        title={facts.length === 0 ? 'Add some facts first' : 'Generate entity cards from facts'}
      >
        {#if generating}
          <RefreshCw size="14" class="animate-spin" />
          Generating...
        {:else}
          <Zap size="14" />
          Generate Cards
        {/if}
      </button>
    </div>
  </div>
  
  <!-- Error Display -->
  {#if error}
    <div class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <p class="text-sm text-red-700 dark:text-red-300">{error}</p>
    </div>
  {/if}
  
  <!-- Loading State -->
  {#if loading}
    <div class="flex items-center justify-center py-8">
      <RefreshCw size="24" class="animate-spin text-blue-600 dark:text-blue-400" />
      <span class="ml-2 text-gray-600 dark:text-gray-300">Loading entity cards...</span>
    </div>
  {:else if entityCards.length === 0}
    <!-- Empty State -->
    <div class="text-center py-8 px-4">
      <div class="max-w-sm mx-auto">
        <Zap size="48" class="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <h4 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Entity Cards Yet</h4>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Entity cards automatically group your facts into organized summaries for characters, places, events, and more.
        </p>
        {#if facts.length > 0}
          <button
            on:click={generateCards}
            disabled={generating}
            class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white 
                   text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            {#if generating}
              <RefreshCw size="16" class="animate-spin" />
              Generating...
            {:else}
              <Zap size="16" />
              Generate Your First Cards
            {/if}
          </button>
        {:else}
          <p class="text-xs text-gray-500 dark:text-gray-500">Add some facts first to generate entity cards.</p>
        {/if}
      </div>
    </div>
  {:else}
    <!-- Entity Cards Grid -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      {#each entityCards as card (card.id)}
        {@const typeConfig = getEntityTypeConfig(card.entity_type)}
        <div class="entity-card bg-white border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow" style="background-color: var(--bg-card);">
          <!-- Card Header -->
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <div class="flex-shrink-0">
                <svelte:component 
                  this={typeConfig.icon} 
                  size="20" 
                  class="text-current" 
                />
              </div>
              <div class="min-w-0 flex-1">
                <h4 class="font-medium text-gray-900 dark:text-gray-100 truncate" title={card.entity_name}>
                  {card.entity_name}
                </h4>
              </div>
            </div>
            <span class="flex-shrink-0 text-xs px-2 py-1 rounded-full {typeConfig.color}">
              {typeConfig.label}
            </span>
          </div>
          
          <!-- Card Summary -->
          <div class="mb-3">
            <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {card.summary}
            </p>
          </div>
          
          <!-- Card Footer -->
          <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div class="flex items-center gap-3">
              <span title="Number of facts that contributed to this card">
                {card.fact_count} fact{card.fact_count === 1 ? '' : 's'}
              </span>
              {#if card.confidence_score}
                <span title="AI confidence in entity detection">
                  {formatConfidenceScore(card.confidence_score)} confidence
                </span>
              {/if}
            </div>
            <span title="Last updated: {new Date(card.updated_at).toLocaleString()}">
              {formatTimestamp(card.updated_at)}
            </span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .entity-card {
    background-color: #35353d;
  }
  
  :global(.dark) .entity-card {
    background-color: #35353d;
  }
</style>
