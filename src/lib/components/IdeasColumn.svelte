<!-- src/lib/components/IdeasColumn.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  import GoodQuestions from './GoodQuestions.svelte';
  import RelatedIdeas from './RelatedIdeas.svelte';

  export let goodQuestions = [];
  export let relatedIdeas = [];
  export let isGeneratingIdeas = false;
  export let projectId = null;
  

  const dispatch = createEventDispatcher();
  

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
  <div class="p-4 h-full flex flex-col min-h-0">
    <!-- Good Questions - Upper half (fixed height) -->
    <div class="flex flex-col overflow-hidden" style="height: 40%;">
      <GoodQuestions 
        {goodQuestions}
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
        ideas={relatedIdeas}
        {isGeneratingIdeas}
        {projectId}
        on:insert-text={handleInsertText}
        on:generate-ideas={handleGenerateIdeas}
      />
    </div>
  </div>
</div>
