<script>
  import { createEventDispatcher } from 'svelte';
  import ContextSummary from './ContextSummary.svelte';
  import FactsManager from './FactsManager.svelte';
  import DocsManager from './DocsManager.svelte';

  export let current = null;
  export let facts = [];
  export let docs = [];
  export let loadingFacts = false;
  export let showAddFactForm = false;
  export let factType = 'character';
  export let factKey = '';
  export let factValue = '';
  export let showAddDocForm = false;
  export let docTitle = '';
  export let docContent = '';

  const dispatch = createEventDispatcher();
  
  // Tab state - exported so parent can control it
  export let activeTab = 'facts'; // 'summary', 'facts', or 'docs'

  // Context summary events
  function handleBriefRegenerate() {
    dispatch('brief-regenerate');
  }

  // Facts manager events
  function handleFactAdd(event) {
    dispatch('fact-add', event.detail);
  }

  function handleFactCancelAdd() {
    dispatch('fact-cancel-add');
  }

  function handleFactStartEdit(event) {
    dispatch('fact-start-edit', event.detail);
  }

  function handleFactCancelEdit(event) {
    dispatch('fact-cancel-edit', event.detail);
  }

  function handleFactSaveEdit(event) {
    dispatch('fact-save-edit', event.detail);
  }

  function handleFactDelete(event) {
    dispatch('fact-delete', event.detail);
  }

  function handleFactTogglePin(event) {
    dispatch('fact-toggle-pin', event.detail);
  }

  // Docs manager events
  function handleDocAdd(event) {
    dispatch('doc-add', event.detail);
  }

  function handleDocCancelAdd() {
    dispatch('doc-cancel-add');
  }

  function handleDocStartEdit(event) {
    dispatch('doc-start-edit', event.detail);
  }

  function handleDocCancelEdit(event) {
    dispatch('doc-cancel-edit', event.detail);
  }

  function handleDocSaveEdit(event) {
    dispatch('doc-save-edit', event.detail);
  }

  function handleDocDelete(event) {
    dispatch('doc-delete', event.detail);
  }

  function handleDocTogglePin(event) {
    dispatch('doc-toggle-pin', event.detail);
  }
</script>

<section class="border-r p-3 overflow-auto bg-gray-50 flex flex-col">
  <h2 class="text-lg font-semibold mb-4">Project Overview</h2>

  {#if current}
    <!-- Three-Tab Interface: Summary, Facts, Docs -->
    <div class="flex flex-col min-h-0 flex-1">
      <!-- Tab Headers -->
      <div class="flex border-b mb-3">
        <button
          class="px-3 py-2 font-medium text-sm border-b-2 transition-colors {
            activeTab === 'facts' 
              ? 'border-blue-500 text-blue-600 bg-blue-50' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }"
          on:click={() => activeTab = 'facts'}
        >
          Facts ({facts.length})
        </button>
        <button
          class="px-3 py-2 font-medium text-sm border-b-2 transition-colors {
            activeTab === 'docs' 
              ? 'border-blue-500 text-blue-600 bg-blue-50' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }"
          on:click={() => activeTab = 'docs'}
        >
          Docs ({docs.length})
        </button>
        <button
          class="px-3 py-2 font-medium text-sm border-b-2 transition-colors {
            activeTab === 'summary' 
              ? 'border-blue-500 text-blue-600 bg-blue-50' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }"
          on:click={() => activeTab = 'summary'}
        >
          Summary
        </button>
      </div>
      
      <!-- Tab Content -->
      <div class="flex-1 min-h-0 {activeTab === 'summary' ? '' : 'overflow-hidden'}">
        {#if activeTab === 'summary'}
          <ContextSummary 
            {current}
            on:regenerate={handleBriefRegenerate}
          />
        {:else if activeTab === 'facts'}
          <FactsManager
            {facts}
            {loadingFacts}
            projectId={current?.id}
            bind:showAddFactForm
            bind:factType
            bind:factKey
            bind:factValue
            on:add={handleFactAdd}
            on:cancel-add={handleFactCancelAdd}
            on:start-edit={handleFactStartEdit}
            on:cancel-edit={handleFactCancelEdit}
            on:save-edit={handleFactSaveEdit}
            on:delete={handleFactDelete}
            on:toggle-pin={handleFactTogglePin}
          />
        {:else if activeTab === 'docs'}
          <DocsManager
            {docs}
            bind:showAddDocForm
            bind:docTitle
            bind:docContent
            on:add={handleDocAdd}
            on:cancel-add={handleDocCancelAdd}
            on:start-edit={handleDocStartEdit}
            on:cancel-edit={handleDocCancelEdit}
            on:save-edit={handleDocSaveEdit}
            on:delete={handleDocDelete}
            on:toggle-pin={handleDocTogglePin}
          />
        {/if}
      </div>
    </div>
  {:else}
    <p>Select a project</p>
  {/if}
</section>
