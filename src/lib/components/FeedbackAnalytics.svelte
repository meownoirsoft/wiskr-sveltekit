<!-- src/lib/components/FeedbackAnalytics.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { ThumbsUp, ThumbsDown, MessageCircle, TrendingUp, TrendingDown, X } from 'lucide-svelte';
  
  export let visible = false;
  export let projectId = null; // If null, shows all projects
  export let projectName = 'All Projects';
  
  const dispatch = createEventDispatcher();
  
  // Analytics state
  let analytics = null;
  let loading = false;
  let error = null;
  
  // Load analytics when visible changes or project changes
  $: if (visible && (projectId !== undefined)) {
    loadAnalytics();
  }
  
  async function loadAnalytics() {
    loading = true;
    error = null;
    
    try {
      const params = new URLSearchParams({ type: 'analytics' });
      if (projectId) {
        params.append('projectId', projectId);
      }
      
      const response = await fetch(`/api/feedback?${params}`);
      if (response.ok) {
        const data = await response.json();
        analytics = data.analytics;
      } else {
        const errorData = await response.json().catch(() => ({}));
        error = errorData.error || 'Failed to load analytics';
      }
    } catch (err) {
      console.error('Error loading feedback analytics:', err);
      error = 'Error loading analytics. Please try again.';
    } finally {
      loading = false;
    }
  }
  
  function handleClose() {
    dispatch('close');
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }
  
  // Helper functions for displaying data
  function formatPercentage(value) {
    return `${value}%`;
  }
  
  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
  }
  
  function getRecentFeedback(feedbackData, limit = 5) {
    return feedbackData.slice(0, limit);
  }
</script>

<!-- Analytics Modal -->
{#if visible}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/20 dark:bg-black/40"
    on:click={handleBackdropClick}
  >
    <div class="bg-white rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-4xl mx-auto max-h-[80vh] overflow-hidden" style="background-color: var(--bg-primary);">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100" style="color: var(--text-primary);">
          Feedback Analytics - {projectName}
        </h2>
        <button
          class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          on:click={handleClose}
          title="Close"
        >
          <X size="24" />
        </button>
      </div>
      
      <!-- Content -->
      <div class="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
        {#if loading}
          <div class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style="border-color: var(--color-accent); border-top-color: transparent;"></div>
            <span class="ml-3 text-gray-600 dark:text-gray-400">Loading analytics...</span>
          </div>
        {:else if error}
          <div class="text-center py-8">
            <div class="text-red-600 dark:text-red-400 mb-2">⚠️ Error</div>
            <p class="text-gray-600 dark:text-gray-400">{error}</p>
            <button
              class="mt-4 px-4 py-2 text-sm font-medium text-white rounded-md transition-colors"
              style="background-color: var(--color-accent);"
              on:click={loadAnalytics}
            >
              Try Again
            </button>
          </div>
        {:else if analytics}
          <div class="space-y-6">
            
            <!-- Message Feedback Stats -->
            <div>
              <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4" style="color: var(--text-primary);">
                AI Response Feedback
              </h3>
              
              {#if analytics.messageFeedback.stats.total > 0}
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <!-- Total Feedback -->
                  <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border" style="background-color: #35353d;">
                    <div class="flex items-center gap-2 mb-2">
                      <MessageCircle size="20" class="text-blue-600" />
                      <span class="text-sm font-medium text-gray-600 dark:text-gray-300">Total Feedback</span>
                    </div>
                    <div class="text-2xl font-bold text-gray-900 dark:text-gray-100" style="color: var(--text-primary);">
                      {analytics.messageFeedback.stats.total}
                    </div>
                  </div>
                  
                  <!-- Positive Feedback -->
                  <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div class="flex items-center gap-2 mb-2">
                      <ThumbsUp size="20" class="text-green-600" />
                      <span class="text-sm font-medium text-green-700 dark:text-green-300">Positive</span>
                    </div>
                    <div class="text-2xl font-bold text-green-800 dark:text-green-200">
                      {analytics.messageFeedback.stats.positive}
                      <span class="text-sm font-normal">({formatPercentage(analytics.messageFeedback.stats.positiveRate)})</span>
                    </div>
                  </div>
                  
                  <!-- Negative Feedback -->
                  <div class="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                    <div class="flex items-center gap-2 mb-2">
                      <ThumbsDown size="20" class="text-red-600" />
                      <span class="text-sm font-medium text-red-700 dark:text-red-300">Negative</span>
                    </div>
                    <div class="text-2xl font-bold text-red-800 dark:text-red-200">
                      {analytics.messageFeedback.stats.negative}
                      <span class="text-sm font-normal">({formatPercentage(analytics.messageFeedback.stats.negativeRate)})</span>
                    </div>
                  </div>
                  
                  <!-- Comments -->
                  <div class="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div class="flex items-center gap-2 mb-2">
                      <MessageCircle size="20" class="text-purple-600" />
                      <span class="text-sm font-medium text-purple-700 dark:text-purple-300">With Comments</span>
                    </div>
                    <div class="text-2xl font-bold text-purple-800 dark:text-purple-200">
                      {analytics.messageFeedback.stats.hasComments}
                    </div>
                  </div>
                </div>
                
                <!-- Recent Message Feedback -->
                {#if analytics.messageFeedback.data.length > 0}
                  <div class="mb-6">
                    <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Recent Feedback</h4>
                    <div class="space-y-2 max-h-48 overflow-y-auto">
                      {#each getRecentFeedback(analytics.messageFeedback.data) as feedback}
                        <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg" style="background-color: #35353d;">
                          <div class="mt-0.5">
                            {#if feedback.rating === 1}
                              <ThumbsUp size="16" class="text-green-600" />
                            {:else}
                              <ThumbsDown size="16" class="text-red-600" />
                            {/if}
                          </div>
                          <div class="flex-1 min-w-0">
                            <div class="text-sm text-gray-600 dark:text-gray-300 mb-1">
                              {formatDate(feedback.created_at)}
                              {#if feedback.messages?.model_key}
                                • <span class="font-medium">{feedback.messages.model_key}</span>
                              {/if}
                            </div>
                            {#if feedback.comment}
                              <div class="text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-600 p-2 rounded italic">
                                "{feedback.comment}"
                              </div>
                            {/if}
                          </div>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
              {:else}
                <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                  No AI response feedback yet. Start rating some responses to see analytics here!
                </div>
              {/if}
            </div>
            
            <!-- Mr Wiskr Feedback Stats -->
            <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4" style="color: var(--text-primary);">
                Mr Wiskr Feedback
              </h3>
              
              {#if analytics.mrWiskrFeedback.stats.total > 0}
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <!-- Total Mr Wiskr Feedback -->
                  <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border" style="background-color: #35353d;">
                    <div class="flex items-center gap-2 mb-2">
                      <img src="/mr-wiskr-emoji.png" alt="Mr Wiskr" class="w-5 h-5" />
                      <span class="text-sm font-medium text-gray-600 dark:text-gray-300">Total Feedback</span>
                    </div>
                    <div class="text-2xl font-bold text-gray-900 dark:text-gray-100" style="color: var(--text-primary);">
                      {analytics.mrWiskrFeedback.stats.total}
                    </div>
                  </div>
                  
                  <!-- Mr Wiskr Positive -->
                  <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div class="flex items-center gap-2 mb-2">
                      <ThumbsUp size="20" class="text-green-600" />
                      <span class="text-sm font-medium text-green-700 dark:text-green-300">Helpful</span>
                    </div>
                    <div class="text-2xl font-bold text-green-800 dark:text-green-200">
                      {analytics.mrWiskrFeedback.stats.positive}
                      <span class="text-sm font-normal">({formatPercentage(analytics.mrWiskrFeedback.stats.positiveRate)})</span>
                    </div>
                  </div>
                  
                  <!-- Mr Wiskr Negative -->
                  <div class="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                    <div class="flex items-center gap-2 mb-2">
                      <ThumbsDown size="20" class="text-red-600" />
                      <span class="text-sm font-medium text-red-700 dark:text-red-300">Not Helpful</span>
                    </div>
                    <div class="text-2xl font-bold text-red-800 dark:text-red-200">
                      {analytics.mrWiskrFeedback.stats.negative}
                      <span class="text-sm font-normal">({formatPercentage(analytics.mrWiskrFeedback.stats.negativeRate)})</span>
                    </div>
                  </div>
                  
                  <!-- Mr Wiskr Comments -->
                  <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div class="flex items-center gap-2 mb-2">
                      <MessageCircle size="20" class="text-blue-600" />
                      <span class="text-sm font-medium text-blue-700 dark:text-blue-300">With Comments</span>
                    </div>
                    <div class="text-2xl font-bold text-blue-800 dark:text-blue-200">
                      {analytics.mrWiskrFeedback.stats.hasComments}
                    </div>
                  </div>
                </div>
                
                <!-- Recent Mr Wiskr Feedback -->
                {#if analytics.mrWiskrFeedback.data.length > 0}
                  <div>
                    <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Recent Mr Wiskr Feedback</h4>
                    <div class="space-y-2 max-h-48 overflow-y-auto">
                      {#each getRecentFeedback(analytics.mrWiskrFeedback.data) as feedback}
                        <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg" style="background-color: #35353d;">
                          <div class="mt-0.5">
                            {#if feedback.rating === 1}
                              <ThumbsUp size="16" class="text-green-600" />
                            {:else}
                              <ThumbsDown size="16" class="text-red-600" />
                            {/if}
                          </div>
                          <div class="flex-1 min-w-0">
                            <div class="text-sm text-gray-600 dark:text-gray-300 mb-1">
                              {formatDate(feedback.created_at)}
                              {#if feedback.context}
                                • <span class="text-xs opacity-75">{feedback.context.slice(0, 50)}...</span>
                              {/if}
                            </div>
                            {#if feedback.comment}
                              <div class="text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-600 p-2 rounded italic">
                                "{feedback.comment}"
                              </div>
                            {/if}
                          </div>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
              {:else}
                <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                  No Mr Wiskr feedback yet. Start using Mr Wiskr to see analytics here!
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
