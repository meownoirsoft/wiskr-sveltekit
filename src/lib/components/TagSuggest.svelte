<script>
  import { createEventDispatcher } from 'svelte';
  import { Sparkles, X } from 'lucide-svelte';
  
  export let content = '';
  export let title = '';
  export let type = '';
  export let projectId = null;
  export let existingTags = [];
  export let disabled = false;
  
  const dispatch = createEventDispatcher();
  
  let suggestedTags = [];
  let isLoading = false;
  let hasError = false;
  let hasSuggested = false; // Track if we've already suggested for this content
  
  // Check if we have enough content for suggestions
  $: hasEnoughContent = [title, content].filter(Boolean).join(' ').trim().length > 10;
  
  function handleSuggestTags() {
    if (!hasEnoughContent || isLoading || disabled) return;
    getSuggestedTags();
  }
  
  async function getSuggestedTags() {
    if (isLoading) return;
    
    isLoading = true;
    hasError = false;
    hasSuggested = true;
    
    try {
      const response = await fetch('/api/suggest-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          title,
          type,
          projectId,
          existingTags
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        suggestedTags = data.suggestedTags || [];
        if (suggestedTags.length === 0) {
          hasError = true; // Show message when no suggestions found
        }
      } else {
        console.error('Tag suggestion error:', data.message);
        hasError = true;
        suggestedTags = [];
      }
    } catch (error) {
      console.error('Error fetching tag suggestions:', error);
      hasError = true;
      suggestedTags = [];
    } finally {
      isLoading = false;
    }
  }
  
  function addTag(tag) {
    dispatch('add-tag', tag);
    // Remove the added tag from suggestions
    suggestedTags = suggestedTags.filter(t => t !== tag);
  }
  
  function dismissAllSuggestions() {
    suggestedTags = [];
    hasError = false;
    hasSuggested = false;
  }
  
  // Reset suggestions when content changes significantly
  $: {
    if (hasEnoughContent) {
      // Reset suggestion state when content changes
      hasSuggested = false;
      suggestedTags = [];
      hasError = false;
    }
  }
</script>

<!-- Suggest Tags Button -->
{#if hasEnoughContent && !hasSuggested && !isLoading && suggestedTags.length === 0}
  <div class="mt-2">
    <button
      on:click={handleSuggestTags}
      class="flex items-center gap-1 px-2 py-1 text-xs rounded transition-all duration-200 hover:scale-105 focus:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500 border border-gray-300 dark:border-gray-500"
      title="Use Wiskr to suggest relevant tags"
    >
      <Sparkles size="12" />
      Suggest Tags
    </button>
  </div>
{/if}

{#if isLoading}
  <div class="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
    <Sparkles size="14" class="animate-pulse" />
    <span>Suggesting tags...</span>
  </div>
{:else if suggestedTags.length > 0}
  <div class="mt-2 space-y-2">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
        <Sparkles size="14" />
        <span>Suggested tags:</span>
      </div>
      <button
        on:click={dismissAllSuggestions}
        class="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1"
        title="Dismiss all suggestions"
      >
        <X size="12" />
      </button>
    </div>
    <div class="flex flex-wrap gap-1">
      {#each suggestedTags as tag}
        <button
          on:click={() => addTag(tag)}
          class="inline-flex items-center px-2 py-1 text-xs rounded-full transition-all duration-200 hover:scale-105 focus:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500 border border-gray-300 dark:border-gray-500"
          title="Click to add tag"
        >
          + {tag}
        </button>
      {/each}
    </div>
  </div>
{:else if hasError && hasSuggested}
  <div class="mt-2 text-xs text-gray-400 dark:text-gray-500">
    {suggestedTags.length === 0 ? 'No relevant tags found for this content.' : 'Unable to suggest tags at the moment.'}
  </div>
{/if}
