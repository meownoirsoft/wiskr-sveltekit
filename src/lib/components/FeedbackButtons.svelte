<!-- src/lib/components/FeedbackButtons.svelte -->
<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { ThumbsUp, ThumbsDown, Check, X } from 'lucide-svelte';
  import FeedbackModal from './modals/FeedbackModal.svelte';
  
  export let messageId = null;
  export let projectId = null;
  export let messageContent = '';
  export let aiName = 'Assistant';
  export let size = 'sm'; // 'sm' or 'md'
  
  const dispatch = createEventDispatcher();
  
  // Feedback state
  let currentFeedback = null; // { rating, comment, id }
  let isLoading = false;
  let isSubmitting = false;
  let showModal = false;
  let pendingRating = null; // The rating for the modal
  let statusMessage = '';
  let showStatus = false;
  
  // Check if messageId is a temporary message (not persisted to database)
  $: isTemporaryMessage = messageId && (typeof messageId === 'string' && messageId.startsWith('temp_'));
  
  // Global feedback cache and batch loading
  let globalFeedbackCache = new Map();
  let batchLoadTimeout;
  
  // Cleanup timeout on destroy
  onDestroy(() => {
    if (batchLoadTimeout) {
      clearTimeout(batchLoadTimeout);
    }
  });
  
  // Load existing feedback on mount and when messageId changes (but not for temporary messages)
  $: if (messageId && projectId && !isTemporaryMessage) {
    // Check cache first
    if (globalFeedbackCache.has(messageId)) {
      currentFeedback = globalFeedbackCache.get(messageId);
    } else {
      // Clear any existing timeout
      if (batchLoadTimeout) {
        clearTimeout(batchLoadTimeout);
      }
      
      // Debounce the batch API call by 500ms
      batchLoadTimeout = setTimeout(() => {
        loadBatchFeedback();
      }, 500);
    }
  }
  
  // Batch load feedback for all visible messages
  async function loadBatchFeedback() {
    if (!projectId) return;
    
    // Collect all message IDs from the current page
    const messageElements = document.querySelectorAll('[data-message-id]');
    const messageIds = Array.from(messageElements)
      .map(el => el.getAttribute('data-message-id'))
      .filter(id => id && !id.startsWith('temp_'));
    
    if (messageIds.length === 0) return;
    
    try {
      const response = await fetch(`/api/feedback/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          messageIds
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Cache all feedback
        data.feedback.forEach(feedback => {
          if (feedback.messageId) {
            globalFeedbackCache.set(feedback.messageId, feedback);
          }
        });
        
        // Update current feedback if it's in the batch
        if (messageId && globalFeedbackCache.has(messageId)) {
          currentFeedback = globalFeedbackCache.get(messageId);
        }
      }
    } catch (error) {
      console.error('Error loading batch feedback:', error);
    }
  }

  async function loadExistingFeedback() {
    if (!messageId || isLoading || isTemporaryMessage) return;
    
    isLoading = true;
    try {
      const response = await fetch(`/api/feedback?messageId=${messageId}`);
      if (response.ok) {
        const data = await response.json();
        currentFeedback = data.feedback;
        // Cache the result
        globalFeedbackCache.set(messageId, data.feedback);
      } else {
        console.error('Failed to load existing feedback');
        currentFeedback = null;
      }
    } catch (error) {
      console.error('Error loading feedback:', error);
      currentFeedback = null;
    } finally {
      isLoading = false;
    }
  }
  
  function handleThumbsUp() {
    if (isSubmitting || !messageId || !projectId || isTemporaryMessage) return;
    
    // If already thumbs up, allow quick resubmit without modal
    if (currentFeedback?.rating === 1) {
      submitFeedback(1, currentFeedback.comment);
      return;
    }
    
    pendingRating = 1;
    showModal = true;
  }
  
  function handleThumbsDown() {
    if (isSubmitting || !messageId || !projectId || isTemporaryMessage) return;
    
    // If already thumbs down, allow quick resubmit without modal
    if (currentFeedback?.rating === -1) {
      submitFeedback(-1, currentFeedback.comment);
      return;
    }
    
    pendingRating = -1;
    showModal = true;
  }
  
  async function submitFeedback(rating, comment = null) {
    if (isSubmitting || !messageId || !projectId || isTemporaryMessage) return;
    
    isSubmitting = true;
    
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit-message-feedback',
          messageId,
          projectId,
          rating,
          comment
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        currentFeedback = data.feedback;
        // Update cache
        globalFeedbackCache.set(messageId, data.feedback);
        statusMessage = data.message;
        showStatusMessage();
        
        // Dispatch event to parent for any needed updates
        dispatch('feedback-submitted', { 
          messageId, 
          feedback: currentFeedback,
          isUpdate: !!currentFeedback 
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        statusMessage = errorData.error || 'Failed to submit feedback';
        showStatusMessage();
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      statusMessage = 'Error submitting feedback. Please try again.';
      showStatusMessage();
    } finally {
      isSubmitting = false;
    }
  }
  
  function showStatusMessage() {
    showStatus = true;
    setTimeout(() => {
      showStatus = false;
      statusMessage = '';
    }, 3000);
  }
  
  // Modal event handlers
  function handleModalSubmit(event) {
    const { rating, comment } = event.detail;
    showModal = false;
    submitFeedback(rating, comment);
  }
  
  function handleModalCancel() {
    showModal = false;
    pendingRating = null;
  }
  
  // Button sizing - made icons bigger and adjusted height for touch targets (h-11 = 44px on mobile)
  $: buttonSize = size === 'md' ? '20' : '18';
  $: buttonClass = size === 'md' 
    ? 'px-2 py-1.5 h-11 sm:h-8' 
    : 'px-2 py-1 h-11 sm:h-8';
</script>

<!-- Feedback Buttons -->
<div class="flex items-center gap-1 relative">
  <!-- Thumbs Up Button -->
  <button
    class="{buttonClass} text-xs rounded transition-colors flex items-center gap-1 relative disabled:opacity-50 min-w-0"
    class:bg-green-50={currentFeedback?.rating === 1}
    class:dark:bg-green-900={currentFeedback?.rating === 1}
    class:text-green-600={currentFeedback?.rating === 1}
    class:dark:text-green-400={currentFeedback?.rating === 1}
    class:text-blue-500={currentFeedback?.rating !== 1}
    class:dark:text-blue-400={currentFeedback?.rating !== 1}
    on:mouseenter={(e) => {
      if (currentFeedback?.rating !== 1) {
        e.target.style.backgroundColor = 'var(--bg-button-secondary-hover)';
      }
    }}
    on:mouseleave={(e) => {
      if (currentFeedback?.rating !== 1) {
        e.target.style.backgroundColor = 'transparent';
      }
    }}
    on:click={handleThumbsUp}
    disabled={isSubmitting || isLoading}
    title={currentFeedback?.rating === 1 ? 'You liked this response' : 'Mark as helpful'}
  >
    {#if isSubmitting && pendingRating === 1}
      <div class="animate-spin rounded-full h-3 w-3 border-2 border-green-600 border-t-transparent"></div>
    {:else}
      <ThumbsUp size={buttonSize} />
    {/if}
    {#if currentFeedback?.rating === 1}
      <Check size="10" />
    {/if}
  </button>
  
  <!-- Thumbs Down Button -->
  <button
    class="{buttonClass} text-xs rounded transition-colors flex items-center gap-1 relative disabled:opacity-50 min-w-0"
    class:bg-red-50={currentFeedback?.rating === -1}
    class:dark:bg-red-900={currentFeedback?.rating === -1}
    class:text-red-600={currentFeedback?.rating === -1}
    class:dark:text-red-400={currentFeedback?.rating === -1}
    class:text-blue-500={currentFeedback?.rating !== -1}
    class:dark:text-blue-400={currentFeedback?.rating !== -1}
    on:mouseenter={(e) => {
      if (currentFeedback?.rating !== -1) {
        e.target.style.backgroundColor = 'var(--bg-button-secondary-hover)';
      }
    }}
    on:mouseleave={(e) => {
      if (currentFeedback?.rating !== -1) {
        e.target.style.backgroundColor = 'transparent';
      }
    }}
    on:click={handleThumbsDown}
    disabled={isSubmitting || isLoading}
    title={currentFeedback?.rating === -1 ? 'You disliked this response' : 'Mark as unhelpful'}
  >
    {#if isSubmitting && pendingRating === -1}
      <div class="animate-spin rounded-full h-3 w-3 border-2 border-red-600 border-t-transparent"></div>
    {:else}
      <ThumbsDown size={buttonSize} />
    {/if}
    {#if currentFeedback?.rating === -1}
      <X size="10" />
    {/if}
  </button>
  
  <!-- Status Message (appears temporarily after submission) -->
  {#if showStatus && statusMessage}
    <div class="absolute -top-10 left-0 z-10 px-2 py-1 text-xs font-medium text-white rounded shadow-lg whitespace-nowrap"
         style="background-color: {statusMessage.includes('Thanks') ? '#10b981' : '#ef4444'};">
      {statusMessage}
      <div class="absolute top-full left-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-current"></div>
    </div>
  {/if}
  
  <!-- Loading indicator for initial load -->
  {#if isLoading}
    <div class="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
      <div class="animate-spin rounded-full h-3 w-3 border-2 border-gray-400 dark:border-gray-500 border-t-transparent"></div>
    </div>
  {/if}
</div>

<!-- Feedback Modal -->
<FeedbackModal
  bind:visible={showModal}
  rating={pendingRating}
  {isSubmitting}
  {messageContent}
  {aiName}
  on:submit={handleModalSubmit}
  on:cancel={handleModalCancel}
/>
