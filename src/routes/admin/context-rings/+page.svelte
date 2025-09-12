<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import ContextRingsManager from '$lib/components/ContextRingsManager.svelte';
  import { BUDGET_LEVELS, OPERATION_TYPES } from '$lib/client/contextRings.js';
  import { Brain, Settings, Play, RefreshCw, Download, Upload } from 'lucide-svelte';

  // State
  let projectId = '';
  let operation = 'create';
  let budget = 'medium';
  let userMessage = '';
  let selectedCards = [];
  let deckId = '';
  let sectionId = '';
  
  // Card selection
  let availableCards = [];
  let loadingCards = false;
  let showCardSelection = false;
  
  // Test scenarios
  let testScenarios = [
    {
      name: 'Create Character Card',
      operation: 'create',
      budget: 'medium',
      userMessage: 'Create a new character card for a fantasy warrior',
      deckId: '',
      sectionId: ''
    },
    {
      name: 'Edit Existing Card',
      operation: 'edit',
      budget: 'high',
      userMessage: 'Improve this card with more detail and better mechanics',
      deckId: '',
      sectionId: ''
    },
    {
      name: 'Merge Multiple Cards',
      operation: 'merge',
      budget: 'high',
      userMessage: 'Merge these cards into a powerful new concept',
      deckId: '',
      sectionId: ''
    },
    {
      name: 'Split Complex Card',
      operation: 'split',
      budget: 'medium',
      userMessage: 'Split this card into multiple focused components',
      deckId: '',
      sectionId: ''
    },
    {
      name: 'Search for Related Cards',
      operation: 'search',
      budget: 'low',
      userMessage: 'Find cards related to magic and spells',
      deckId: '',
      sectionId: ''
    }
  ];
  
  let selectedScenario = null;
  let contextResults = [];
  let loading = false;

  // Load project ID from URL or use default
  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    projectId = urlParams.get('projectId') || '';
  });

  // Auto-load context when parameters change
  $: if (projectId) {
    loadContext();
  }

  async function loadContext() {
    if (!projectId) return;
    
    // This will trigger the ContextRingsManager to load
    // The component handles its own loading internally
  }

  async function loadCards() {
    if (!projectId) return;
    
    loadingCards = true;
    try {
      const response = await fetch(`/api/projects/${projectId}/cards`);
      if (response.ok) {
        const data = await response.json();
        availableCards = data.cards || [];
      } else {
        console.error('Error loading cards:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading cards:', error);
    } finally {
      loadingCards = false;
    }
  }

  function toggleCardSelection(card) {
    if (selectedCards.find(c => c.id === card.id)) {
      selectedCards = selectedCards.filter(c => c.id !== card.id);
    } else {
      selectedCards = [...selectedCards, card];
    }
  }

  function selectScenario(scenario) {
    selectedScenario = scenario;
    operation = scenario.operation;
    budget = scenario.budget;
    userMessage = scenario.userMessage;
    deckId = scenario.deckId;
    sectionId = scenario.sectionId;
  }

  async function runTest() {
    if (!projectId) {
      alert('Please enter a Project ID');
      return;
    }

    loading = true;
    contextResults = [];
    
    try {
      // Actually call the context rings API
      const response = await fetch('/api/context-rings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operation,
          targetCards: selectedCards,
          deckId: deckId || null,
          sectionId: sectionId || null,
          userMessage,
          budget,
          projectId
        })
      });

      if (response.ok) {
        const context = await response.json();
        contextResults.push({
          timestamp: new Date().toISOString(),
          operation,
          budget,
          userMessage,
          projectId,
          deckId,
          sectionId,
          context
        });
        console.log('Context rings loaded:', context);
      } else {
        const error = await response.json();
        alert('Error: ' + (error.error || 'Failed to load context rings'));
      }
    } catch (error) {
      console.error('Error running test:', error);
      alert('Error: ' + error.message);
    } finally {
      loading = false;
    }
  }

  function clearResults() {
    contextResults = [];
  }

  function exportResults() {
    const data = {
      timestamp: new Date().toISOString(),
      projectId,
      testResults: contextResults
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `context-rings-test-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importResults(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.testResults) {
          contextResults = data.testResults;
        }
      } catch (error) {
        alert('Error importing results: ' + error.message);
      }
    };
    reader.readAsText(file);
  }
</script>

<svelte:head>
  <title>Context Rings Admin - Wiskr</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <Brain class="w-8 h-8 text-blue-600" />
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Context Rings Admin</h1>
            <p class="text-gray-600">Test and manage context allocation across different operations</p>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <button
            on:click={exportResults}
            class="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            disabled={contextResults.length === 0}
          >
            <Download class="w-4 h-4" />
            <span>Export Results</span>
          </button>
          <label class="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
            <Upload class="w-4 h-4" />
            <span>Import Results</span>
            <input type="file" accept=".json" on:change={importResults} class="hidden" />
          </label>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Configuration Panel -->
      <div class="lg:col-span-1">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Settings class="w-5 h-5 mr-2" />
            Configuration
          </h2>

          <!-- Project ID -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Project ID</label>
            <input
              type="text"
              bind:value={projectId}
              placeholder="Enter project ID"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Operation Type -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Operation</label>
            <select
              bind:value={operation}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {#each Object.entries(OPERATION_TYPES) as [key, type]}
                <option value={key}>{type.name}</option>
              {/each}
            </select>
            <p class="text-xs text-gray-500 mt-1">{OPERATION_TYPES[operation].description}</p>
          </div>

          <!-- Budget Level -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Budget Level</label>
            <select
              bind:value={budget}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {#each Object.entries(BUDGET_LEVELS) as [key, level]}
                <option value={key}>{level.name}</option>
              {/each}
            </select>
            <p class="text-xs text-gray-500 mt-1">{BUDGET_LEVELS[budget].description}</p>
          </div>

          <!-- User Message -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">User Message</label>
            <textarea
              bind:value={userMessage}
              placeholder="Enter user message or query"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          <!-- Card Selection -->
          <div class="mb-4">
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-medium text-gray-700">Target Cards</label>
              <button
                on:click={() => { showCardSelection = !showCardSelection; if (!showCardSelection) loadCards(); }}
                class="text-sm text-blue-600 hover:text-blue-700"
              >
                {showCardSelection ? 'Hide' : 'Select Cards'}
              </button>
            </div>
            
            {#if selectedCards.length > 0}
              <div class="mb-2">
                <div class="text-sm text-gray-600 mb-1">Selected ({selectedCards.length}):</div>
                <div class="flex flex-wrap gap-1">
                  {#each selectedCards as card}
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      {card.title || 'Untitled'}
                      <button
                        on:click={() => toggleCardSelection(card)}
                        class="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  {/each}
                </div>
              </div>
            {/if}

            {#if showCardSelection}
              <div class="border rounded-lg p-3 max-h-40 overflow-y-auto">
                {#if loadingCards}
                  <div class="text-center py-2 text-gray-500">Loading cards...</div>
                {:else if availableCards.length === 0}
                  <div class="text-center py-2 text-gray-500">No cards found</div>
                {:else}
                  <div class="space-y-1">
                    {#each availableCards as card}
                      <button
                        on:click={() => toggleCardSelection(card)}
                        class="w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 {selectedCards.find(c => c.id === card.id) ? 'bg-blue-100 text-blue-800' : 'text-gray-700'}"
                      >
                        {card.title || 'Untitled'} ({card.type || 'unknown'})
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}
          </div>

          <!-- Deck/Section IDs -->
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Deck ID</label>
              <input
                type="text"
                bind:value={deckId}
                placeholder="Optional"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Section ID</label>
              <input
                type="text"
                bind:value={sectionId}
                placeholder="Optional"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <!-- Test Scenarios -->
          <div class="mb-6">
            <h3 class="text-sm font-medium text-gray-700 mb-3">Quick Test Scenarios</h3>
            <div class="space-y-2">
              {#each testScenarios as scenario}
                <button
                  on:click={() => selectScenario(scenario)}
                  class="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-md transition-colors {selectedScenario?.name === scenario.name ? 'bg-blue-50 border border-blue-200' : ''}"
                >
                  {scenario.name}
                </button>
              {/each}
            </div>
          </div>

          <!-- Run Test Button -->
          <button
            on:click={runTest}
            disabled={loading || !projectId}
            class="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {#if loading}
              <RefreshCw class="w-4 h-4 animate-spin" />
              <span>Running Test...</span>
            {:else}
              <Play class="w-4 h-4" />
              <span>Run Test</span>
            {/if}
          </button>
        </div>
      </div>

      <!-- Context Rings Manager -->
      <div class="lg:col-span-2">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-6">Context Rings Visualization</h2>
          
          {#if projectId}
            <ContextRingsManager
              {projectId}
              {operation}
              targetCards={selectedCards}
              {deckId}
              {sectionId}
              {userMessage}
              {budget}
              on:context-loaded={(e) => {
                console.log('Context loaded:', e.detail.context);
              }}
            />
          {:else}
            <div class="text-center py-12">
              <Brain class="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 class="text-lg font-medium text-gray-900 mb-2">Enter Project ID</h3>
              <p class="text-gray-500">Please enter a Project ID to start testing context rings</p>
            </div>
          {/if}
        </div>

        <!-- Test Results -->
        {#if contextResults.length > 0}
          <div class="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-900">Test Results</h3>
              <button
                on:click={clearResults}
                class="text-sm text-red-600 hover:text-red-700"
              >
                Clear Results
              </button>
            </div>
            
            <div class="space-y-3">
              {#each contextResults as result, index}
                <div class="p-3 bg-gray-50 rounded-lg">
                  <div class="flex items-center justify-between">
                    <div>
                      <span class="font-medium text-gray-900">{result.operation}</span>
                      <span class="text-sm text-gray-500 ml-2">({result.budget})</span>
                    </div>
                    <div class="text-sm text-gray-500">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <p class="text-sm text-gray-600 mt-1">{result.userMessage}</p>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
