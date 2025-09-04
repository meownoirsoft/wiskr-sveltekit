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
    ? goodQuestions.filter(q => {
        const questionText = typeof q === 'string' ? q : q?.question || '';
        return questionText.toLowerCase().includes(search.toLowerCase());
      })
    : goodQuestions;
  
  // Filter ideas based on search term
  $: filteredIdeas = search.trim()
    ? relatedIdeas.filter(idea => {
        const ideaText = typeof idea === 'string' ? idea : idea?.text || idea?.content || idea?.question || '';
        return ideaText.toLowerCase().includes(search.toLowerCase());
      })
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

  // Highlight functions are now exported above for parent component access

  // Component references for highlighting
  let goodQuestionsComponent;
  let relatedIdeasComponent;
  
  // Expose highlighting methods for parent component access
  // This ensures the methods are available when bind:this is used
  export function highlightQuestion(questionId, searchTerm) {
    console.log('🔍 IdeasColumn: highlightQuestion called with:', { questionId, searchTerm });
    console.log('🔍 IdeasColumn: goodQuestions array:', goodQuestions);
    
    // Set the search term to filter and highlight
    search = searchTerm || '';
    
    // Find the question to highlight
    const question = goodQuestions.find(q => {
      const qId = typeof q === 'string' ? null : q?.id;
      console.log('🔍 IdeasColumn: Checking question:', { q, qId, questionId, matches: qId === questionId });
      return qId === questionId;
    });
    
    console.log('🔍 IdeasColumn: Found question:', question);
    
    if (question) {
      // Scroll to the question in the GoodQuestions component
      if (goodQuestionsComponent) {
        console.log('🔍 IdeasColumn: Calling goodQuestionsComponent.highlightQuestion');
        goodQuestionsComponent.highlightQuestion(questionId, searchTerm);
      } else {
        console.log('🔍 IdeasColumn: goodQuestionsComponent not available');
      }
    } else {
      console.log('🔍 IdeasColumn: Question not found in goodQuestions array');
    }
  }

  export function highlightIdea(ideaId, searchTerm) {
    console.log('🔍 IdeasColumn: highlightIdea called with:', { ideaId, searchTerm });
    
    // Set the search term to filter and highlight
    search = searchTerm || '';
    
    // Directly call the RelatedIdeas component to highlight the idea
    // The RelatedIdeas component has the actual idea objects with IDs
    if (relatedIdeasComponent) {
      console.log('🔍 IdeasColumn: Calling relatedIdeasComponent.highlightIdea');
      relatedIdeasComponent.highlightIdea(ideaId, searchTerm);
    } else {
      console.log('🔍 IdeasColumn: relatedIdeasComponent not available');
    }
  }
</script>

<div class="flex flex-col h-full border-r border-gray-200 dark:border-gray-700 overflow-hidden mobile-ideas-column">
  <!-- Header -->
  <div class="p-2 sm:p-4">
    <div class="flex items-center">
      {#if isDesktop && showCollapseButton && onToggleCollapse}
        <button
          class="p-1 text-xs bg-white dark:bg-slate-800 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
      {/if}
    </div>
  </div>
  
  <div class="px-2 sm:px-4 pb-1 sm:pb-2 h-full flex flex-col min-h-0">
    <!-- Good Questions - Upper half (fixed height) -->
    <div class="flex flex-col overflow-hidden pt-1" style="height: 45%;">
             <GoodQuestions 
         bind:this={goodQuestionsComponent}
         goodQuestions={filteredQuestions}
         {loadingQuestions}
         {projectId}
         on:update={handleQuestionsUpdate}
         on:insert-text={handleInsertText}
       />
    </div>

    <!-- Divider -->
    <div class="border-t border-gray-200 dark:border-gray-600 my-4 flex-shrink-0" style="height: 1px;"></div>

    <!-- Related Ideas - Lower half (takes remaining space) -->
    <div class="flex-1 flex flex-col overflow-hidden min-h-0">
             <RelatedIdeas 
         bind:this={relatedIdeasComponent}
         ideas={filteredIdeas}
         {isGeneratingIdeas}
         {projectId}
         searchTerm={search}
         on:insert-text={handleInsertText}
         on:generate-ideas={handleGenerateIdeas}
       />
    </div>
  </div>
</div>

<style>
  /* Highlight effect for search results */
  :global([data-question-id]) {
    transition: all 0.3s ease;
  }
  
  :global([data-idea-id]) {
    transition: all 0.3s ease;
  }
</style>
