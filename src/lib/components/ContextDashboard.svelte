<script>
  import { onMount } from 'svelte';
  import { BarChart3, Clock, FileText, Pin, Users, Zap, AlertCircle } from 'lucide-svelte';
  import LoadingSpinner from './LoadingSpinner.svelte';

  export let projectId = null;
  export let userMessage = 'Tell me about this project';

  let analysis = null;
  let loading = false;
  let error = null;
  let expandedSections = new Set();

  onMount(() => {
    if (projectId) {
      analyzeContext();
    }
  });

  async function analyzeContext() {
    if (!projectId) return;

    //console.log('🔍 ContextDashboard: Starting analysis for project:', projectId);
    //console.log('📝 User message:', userMessage);
    
    loading = true;
    error = null;
    
    try {
      const response = await fetch('/api/context/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, userMessage })
      });

      //console.log('📡 Response status:', response.status);
      //console.log('📡 Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      analysis = await response.json();
      // console.log('✅ Analysis received:', analysis);
      // console.log('📊 Metrics:', analysis?.metrics);
      // console.log('📈 Summary:', analysis?.summary);
      // console.log('🎯 Context Quality Score:', analysis?.summary?.contextQualityScore);
      // console.log('🔎 Estimated Tokens:', analysis?.metrics?.estimatedTokens);
    } catch (err) {
      console.error('Context analysis error:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }

  function toggleSection(index) {
    if (expandedSections.has(index)) {
      expandedSections.delete(index);
    } else {
      expandedSections.add(index);
    }
    expandedSections = new Set(expandedSections);
  }

  function getSectionIcon(type) {
    switch (type) {
      case 'project_description': return FileText;
      case 'pinned_facts': return Pin;
      case 'pinned_docs': return Pin;
      case 'entity_cards': return Users;
      case 'project_brief': return BarChart3;
      default: return FileText;
    }
  }

  function getPriorityColor(priority) {
    switch (priority) {
      case 1: return 'bg-red-50 border-red-200 text-red-800';
      case 2: return 'bg-orange-50 border-orange-200 text-orange-800';
      case 3: return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 4: return 'bg-green-50 border-green-200 text-green-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  }

  function getQualityScoreColor(score) {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  }

  // Export function for parent to trigger refresh
  export function refresh() {
    analyzeContext();
  }
</script>

<div class="p-6 max-w-6xl mx-auto">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Context Dashboard</h1>
      <p class="text-gray-600 dark:text-gray-400">Real-time analysis of what gets sent to the LLM</p>
    </div>
    <button 
      on:click={analyzeContext}
      disabled={loading}
      class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
    >
      <BarChart3 size="16" />
      {loading ? 'Analyzing...' : 'Refresh Analysis'}
    </button>
  </div>

  {#if loading}
    <LoadingSpinner text="Analyzing context..." />
  {:else if error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
      <div class="flex items-center gap-2">
        <AlertCircle size="20" />
        <span class="font-medium">Analysis Error</span>
      </div>
      <p class="mt-2">{error}</p>
    </div>
  {:else if analysis}
    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="rounded-lg border border-gray-200 dark:border-gray-600 p-4" style="background-color: var(--bg-primary);">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Context Quality</p>
            <p class="text-2xl font-bold {getQualityScoreColor(analysis.summary?.contextQualityScore || 0)}">{analysis.summary?.contextQualityScore || 0}/100</p>
          </div>
          <BarChart3 size="24" class="text-blue-600" />
        </div>
      </div>

      <div class="rounded-lg border border-gray-200 dark:border-gray-600 p-4" style="background-color: var(--bg-primary);">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Estimated Tokens</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{analysis.metrics?.estimatedTokens?.toLocaleString() || '0'}</p>
          </div>
          <Zap size="24" class="text-orange-600" />
        </div>
      </div>

      <div class="rounded-lg border border-gray-200 dark:border-gray-600 p-4" style="background-color: var(--bg-primary);">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Pinned Facts</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{analysis.metrics?.pinnedFactsCoverage || 0}</p>
            <p class="text-xs text-gray-500">of {analysis.metrics?.totalFactsInProject || 0} total</p>
          </div>
          <Pin size="24" class="text-red-600" />
        </div>
      </div>

      <div class="rounded-lg border border-gray-200 dark:border-gray-600 p-4" style="background-color: var(--bg-primary);">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Processing Time</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{analysis.metrics?.processingTimeMs || 0}ms</p>
          </div>
          <Clock size="24" class="text-green-600" />
        </div>
      </div>
    </div>

    <!-- Project Info -->
    <div class="rounded-lg border border-gray-200 dark:border-gray-600 p-4 mb-6" style="background-color: var(--bg-primary);">
      <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">Analysis Context</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <span class="font-medium">Project:</span> {analysis.projectName}
        </div>
        <div>
          <span class="font-medium">Test Message:</span> {analysis.userMessage}
        </div>
        <div>
          <span class="font-medium">Branch:</span> {analysis.branchId}
        </div>
      </div>
    </div>

    <!-- Context Sections -->
    <div class="space-y-4">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">LLM Context Breakdown</h3>
      
      {#each analysis.sections as section, index}
        <div class="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden" style="background-color: var(--bg-primary);">
          <button 
            class="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            on:click={() => toggleSection(index)}
          >
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2">
                <svelte:component this={getSectionIcon(section.type)} size="20" class="text-gray-600" />
                <span class="font-medium text-gray-900 dark:text-gray-100">{section.name}</span>
              </div>
              <span class="px-2 py-1 text-xs rounded-full border {getPriorityColor(section.priority)}">
                Priority {section.priority}
              </span>
            </div>
            
            <div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              {#if section.itemCount}
                <span>{section.itemCount} items</span>
              {/if}
              <span>{section.charCount.toLocaleString()} chars</span>
              <span>~{Math.round(section.charCount / 4)} tokens</span>
              <span class="transform transition-transform {expandedSections.has(index) ? 'rotate-180' : ''}">▼</span>
            </div>
          </button>

          {#if expandedSections.has(index)}
            <div class="border-t border-gray-200 dark:border-gray-600 p-4 bg-gray-50 dark:bg-gray-700">
              <div class="mb-3">
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <strong>Why included:</strong> {section.reason}
                </p>
              </div>

              {#if section.items}
                <div class="mb-4">
                  <h4 class="font-medium text-gray-900 dark:text-gray-100 mb-2">Items in this section:</h4>
                  <div class="grid gap-2">
                    {#each section.items as item}
                      <div class="rounded border border-gray-200 dark:border-gray-600 p-3" style="background-color: var(--bg-primary);">
                        {#if item.name}
                          <div class="flex items-center justify-between mb-1">
                            <span class="font-medium text-gray-900 dark:text-gray-100">{item.name}</span>
                            {#if item.type}
                              <span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">{item.type}</span>
                            {/if}
                          </div>
                          {#if item.confidence}
                            <p class="text-xs text-gray-500 mb-1">Confidence: {(item.confidence * 100).toFixed(1)}%</p>
                          {/if}
                        {:else if item.key}
                          <div class="flex items-center justify-between mb-1">
                            <span class="font-medium text-gray-900 dark:text-gray-100">{item.key}</span>
                            <span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">{item.type}</span>
                          </div>
                        {:else if item.title}
                          <div class="font-medium text-gray-900 dark:text-gray-100 mb-1">{item.title}</div>
                        {/if}
                        <p class="text-sm text-gray-600 dark:text-gray-400">{item.preview}</p>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              <div class="bg-gray-100 dark:bg-gray-600 rounded p-3">
                <h4 class="font-medium text-gray-900 dark:text-gray-100 mb-2">Raw Context (as sent to LLM):</h4>
                <pre class="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap overflow-x-auto">{section.content}</pre>
              </div>
            </div>
          {/if}
        </div>
      {/each}

      {#if analysis.sections.length === 0}
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <FileText size="48" class="mx-auto mb-4 opacity-50" />
          <p>No context sections found. Consider adding a project description and pinning some facts.</p>
        </div>
      {/if}
    </div>

    <!-- Quality Insights -->
    <div class="mt-6 bg-blue-50 dark:bg-blue-800/30 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
      <h3 class="font-semibold text-blue-900 dark:text-blue-100 mb-2">📊 Strategic Insights</h3>
      <ul class="text-sm text-blue-800 dark:text-blue-200 space-y-1">
        {#if !analysis.summary.hasProjectDescription}
          <li>• ⚠️ Missing project description - Add one to improve AI alignment</li>
        {/if}
        {#if analysis.summary.pinnedFactsPercentage < 10}
          <li>• 📌 Only {analysis.summary.pinnedFactsPercentage}% of facts are pinned - Pin your most important facts</li>
        {/if}
        {#if !analysis.summary.hasEntityCards}
          <li>• 🎭 No entity cards - Generate cards to provide coherent summaries</li>
        {/if}
        {#if analysis.metrics.estimatedTokens > 8000}
          <li>• 🔥 High token usage ({analysis.metrics.estimatedTokens} tokens) - Consider optimizing context</li>
        {/if}
        {#if analysis.summary.contextQualityScore >= 80}
          <li>• ✅ Excellent context quality score ({analysis.summary.contextQualityScore}/100)</li>
        {/if}
      </ul>
    </div>
  {:else}
    <div class="text-center py-8">
      <BarChart3 size="48" class="mx-auto mb-4 text-gray-400" />
      <p class="text-gray-500 dark:text-gray-400">Select a project to analyze its context</p>
    </div>
  {/if}
</div>
