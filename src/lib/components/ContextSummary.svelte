<script>
  import { createEventDispatcher } from 'svelte';
  import { marked } from 'marked';
  import InfoPopup from './InfoPopup.svelte';

  export let current = null;

  const dispatch = createEventDispatcher();


  // Convert markdown to HTML
  $: briefHtml = current?.brief_text ? marked(current.brief_text) : '<p class="text-gray-500">No brief yet.</p>';
</script>

{#if current}
  <div class="flex flex-col h-full">
    <!-- Header with title and explanatory text -->
    <div class="flex-shrink-0 mb-2">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <h3 class="font-semibold text-gray-900 dark:text-gray-100">Summary</h3>
          <span class="text-xs text-gray-500 dark:text-gray-400">Everything Wiskrs know about your project</span>
          <InfoPopup 
            title="Summary" 
            content={`The Summary provides a high-level overview of your project that helps Wiskrs understand the context and purpose. It's automatically generated from your project's facts, docs, and conversations to give Wiskrs a quick understanding of what you're working on.<br /><br />You can regenerate the summary anytime to keep it up-to-date with your latest project changes.`}
            buttonTitle="Learn about Summary"
          />
        </div>
      </div>
    </div>
    <div class="prose prose-sm max-w-none overflow-y-auto flex-1 min-h-0">
      {@html briefHtml}
    </div>
  </div>
{/if}
