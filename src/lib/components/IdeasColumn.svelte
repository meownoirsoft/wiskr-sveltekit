<!-- src/lib/components/IdeasColumn.svelte -->
<script>
	import { createEventDispatcher } from 'svelte';
	import GoodQuestions from './GoodQuestions.svelte';
	import RelatedIdeas from './RelatedIdeas.svelte';
	import { ChevronsLeft, ChevronsRight } from 'lucide-svelte';

	export let goodQuestions = [];
	export let relatedIdeas = [];
	export let isGeneratingIdeas = false;
	export let loadingQuestions = false;
	export let projectId = null;
	export let search = ''; // Search term from global search
	
	// Desktop collapse button props
	export let isDesktop = false;
	export let showCollapseButton = false;
	export let isCollapsed = false;
	export let onToggleCollapse = null;
  

  const dispatch = createEventDispatcher();
  
  // Filter questions based on search term
  $: filteredQuestions = search.trim() 
    ? goodQuestions.filter(q => q.toLowerCase().includes(search.toLowerCase()))
    : goodQuestions;
  
  // Filter ideas based on search term
  $: filteredIdeas = search.trim()
    ? relatedIdeas.filter(idea => idea.toLowerCase().includes(search.toLowerCase()))
    : relatedIdeas;
  

  function handleQuestionsUpdate(event) {
    dispatch('questions-update', event.detail);
  }

  function handleInsertText(event) {
    dispatch('insert-text', event.detail);
  }

  function handleGenerateIdeas() {
    dispatch('generate-ideas');
  }
</script>

<div class="flex flex-col h-full border-r border-gray-200 dark:border-gray-700 overflow-hidden mobile-ideas-column">
  <!-- Header -->
  <div class="p-4">
    <div class="flex items-center justify-between">
      {#if isDesktop && showCollapseButton && onToggleCollapse}
        <button
          class="p-1 text-xs bg-white dark:bg-gray-800 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
		  style="margin-left: -3rem; position: absolute;"
		  aria-label={isCollapsed ? 'Expand Questions & Ideas' : 'Collapse Questions & Ideas'}
		  on:click={onToggleCollapse}
          title={isCollapsed ? 'Expand Questions & Ideas' : 'Collapse Questions & Ideas'}
        >
          {#if isCollapsed} 
            <!-- Expand - double chevrons pointing left -->
            <ChevronsLeft size="24" />
          {:else}
            <!-- Collapse - double chevrons pointing right -->
            <ChevronsRight size="24" />
          {/if}
        </button>
      {:else}
        <div></div> <!-- Empty div to maintain spacing when button not shown -->
      {/if}
      
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Prompt Add-Ins</h2>
    </div>
  </div>
  
  <div class="p-4 h-full flex flex-col min-h-0">
    <!-- Good Questions - Upper half (fixed height) -->
    <div class="flex flex-col overflow-hidden" style="height: 40%;">
      <GoodQuestions 
        goodQuestions={filteredQuestions}
        {loadingQuestions}
        {projectId}
        on:update={handleQuestionsUpdate}
        on:insert-text={handleInsertText}
      />
    </div>

    <!-- Divider -->
    <div class="border-t border-gray-200 dark:border-gray-600 my-2 flex-shrink-0" style="height: 1px;"></div>

    <!-- Related Ideas - Lower half (takes remaining space) -->
    <div class="flex-1 flex flex-col overflow-hidden min-h-0">
      <RelatedIdeas 
        ideas={filteredIdeas}
        {isGeneratingIdeas}
        {projectId}
        on:insert-text={handleInsertText}
        on:generate-ideas={handleGenerateIdeas}
      />
    </div>
  </div>
</div>
