<script>
  import { createEventDispatcher } from 'svelte';
  import { RefreshCw } from 'lucide-svelte';
  import { marked } from 'marked';

  export let current = null;

  const dispatch = createEventDispatcher();

  function regenerateBrief() {
    dispatch('regenerate');
  }

  // Convert markdown to HTML
  $: briefHtml = current?.brief_text ? marked(current.brief_text) : '<p class="text-gray-500">No brief yet.</p>';
</script>

{#if current}
  <div class="flex flex-col h-full">
    <div class="flex justify-end mb-2 flex-shrink-0">
      <button 
        id="regenerate-summary"
        class="flex items-center gap-2 px-3 py-1 text-sm rounded border transition-colors" 
        style="color: var(--color-accent);"
        on:mouseenter={(e) => { e.target.style.backgroundColor = 'var(--color-accent-light)'; e.target.style.color = 'var(--color-accent-hover)'; }}
        on:mouseleave={(e) => { e.target.style.backgroundColor = ''; e.target.style.color = 'var(--color-accent)'; }}
        on:click={regenerateBrief} 
        title="Regenerate Summary"
      >
        <RefreshCw size="16" />
        <span>Regenerate</span>
      </button>
    </div>
    <div class="prose prose-sm max-w-none overflow-y-auto flex-1 min-h-0">
      {@html briefHtml}
    </div>
  </div>
{/if}
