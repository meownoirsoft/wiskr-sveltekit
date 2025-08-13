<!-- src/lib/components/IdeasColumn.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  import GoodQuestions from './GoodQuestions.svelte';
  import RelatedIdeas from './RelatedIdeas.svelte';

  export let goodQuestions = [];
  export let relatedIdeas = [];
  export let isGeneratingIdeas = false;
  export let projectId = null;
  export let search = ''; // Search term from global search
  

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

<div class="flex flex-col h-full bg-zinc-50 border-r overflow-hidden mobile-ideas-column">
  <!-- Header -->
  <div class="p-4 border-b border-gray-200">
    <h2 class="text-lg font-semibold text-gray-900">Prompt Add-Ins</h2>
  </div>
  
  <div class="p-4 h-full flex flex-col min-h-0">
    <!-- Good Questions - Upper half (fixed height) -->
    <div class="flex flex-col overflow-hidden" style="height: 40%;">
      <GoodQuestions 
        goodQuestions={filteredQuestions}
        {projectId}
        on:update={handleQuestionsUpdate}
        on:insert-text={handleInsertText}
      />
    </div>

    <!-- Divider -->
    <div class="border-t border-gray-200 my-2 flex-shrink-0" style="height: 1px;"></div>

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
