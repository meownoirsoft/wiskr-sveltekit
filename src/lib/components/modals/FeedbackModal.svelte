<!-- src/lib/components/FeedbackModal.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { X } from 'lucide-svelte';
  
  export let visible = false;
  export let rating = null; // 1 for thumbs up, -1 for thumbs down
  export let isSubmitting = false;
  export let messageContent = ''; // The wiskr message content for context
  export let aiName = 'Wiskr'; // The wiskr's name for context
  
  const dispatch = createEventDispatcher();
  
  let comment = '';
  let modalElement;
  
  // Reset comment when modal becomes visible
  $: if (visible) {
    comment = '';
    // Focus on the textarea after a brief delay
    setTimeout(() => {
      const textarea = modalElement?.querySelector('textarea');
      if (textarea) {
        textarea.focus();
      }
    }, 100);
  }
  
  function handleSubmit() {
    if (isSubmitting) return;
    
    dispatch('submit', {
      rating,
      comment: comment.trim() || null
    });
  }
  
  function handleCancel() {
    if (isSubmitting) return;
    
    dispatch('cancel');
  }
  
  function handleKeydown(event) {
    if (event.key === 'Escape' && !isSubmitting) {
      handleCancel();
    } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSubmit();
    }
  }
  
  // Handle click outside to close
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget && !isSubmitting) {
      handleCancel();
    }
  }
  
  // Get feedback type text
  $: feedbackType = rating === 1 ? 'positive' : rating === -1 ? 'negative' : '';
  $: titleText = rating === 1 ? 'What did you like?' : rating === -1 ? 'What could we do better?' : 'Share your thoughts';
  $: placeholderText = rating === 1 
    ? `Tell us what ${aiName} did well...` 
    : rating === -1 
    ? `How can ${aiName} improve?` 
    : 'Your feedback...';
</script>

<!-- Modal backdrop with blur effect -->
{#if visible}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div 
    class="fixed inset-0 z-[99999] flex items-center justify-center p-4 backdrop-blur-sm bg-black/20 dark:bg-black/40"
    on:click={handleBackdropClick}
    on:keydown={handleKeydown}
  >
    <div 
      bind:this={modalElement}
      class="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-auto"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">
          {titleText}
        </h3>
        <button
          class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          on:click={handleCancel}
          disabled={isSubmitting}
          title="Close"
        >
          <X size="20" />
        </button>
      </div>
      
      <!-- Body -->
      <div class="p-4">
        <!-- AI response preview (truncated) -->
        {#if messageContent}
          <div class="mb-4">
            <div class="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Feedback on {aiName}'s response:
            </div>
            <div 
              class="text-sm p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 line-clamp-3 overflow-hidden"
            >
              {messageContent.slice(0, 150)}{messageContent.length > 150 ? '...' : ''}
            </div>
          </div>
        {/if}
        
        <!-- Comment box -->
        <div class="mb-4">
          <div class="mb-4 text-sm">Please include any specific issues, bugs, or anything else you feel needs to be addressed in our system. We want to be sensitive to everyone's needs and believe in fairness and inclusion wherever possible. We do read your messages.</div>
          <label 
            for="feedback-comment" 
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Your thoughts (optional):
          </label>
          <textarea
            id="feedback-comment"
            bind:value={comment}
            placeholder={placeholderText}
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-800"
            disabled={isSubmitting}
            on:keydown={handleKeydown}
          ></textarea>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Press Ctrl+Enter to submit quickly
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-b-lg">
        <button
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          on:click={handleCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2" 
          style="background-color: var(--color-accent); color: var(--color-accent-text);"
          on:click={handleSubmit}
          disabled={isSubmitting}
        >
          {#if isSubmitting}
            <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            Submitting...
          {:else}
            Submit Feedback
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Line clamp utility for truncating AI response preview */
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
