<!-- src/lib/components/MrWiskrPopup.svelte -->
<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { marked } from 'marked';
  import { getAIName } from '$lib/config/aiAvatars.js';
  import { X, ThumbsUp, ThumbsDown } from 'lucide-svelte';

  export let visible = false;
  export let x = 0;
  export let y = 0;
  export let isThinking = false;
  export let response = '';
  export let error = '';
  export let showOptions = true; // New prop to control options display
  export let originalText = ''; // Store the original message text
  export let projectId = null; // Current project ID for feedback

  const dispatch = createEventDispatcher();
  
  // Mr Wiskr feedback state
  let feedbackSubmitted = false;
  let feedbackType = null; // 'positive' or 'negative'
  let showFeedbackComment = false;
  let feedbackComment = '';
  let submittingFeedback = false;
  
  // Positioning and animation state
  let popupElement;
  let isPositioned = false;
  let finalX = 0;
  let finalY = 0;
  
  // Configure marked for better rendering
  marked.setOptions({
    breaks: true,
    gfm: true,
  });
  
  function renderMarkdown(content) {
    if (!content || typeof content !== 'string') return '';
    return marked(content);
  }


  function handleScroll() {
    requestAnimationFrame(checkVisibility);
  }
  
  function handleResize() {
    // Debounce resize events to avoid excessive repositioning
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (visible && popupElement && isPositioned) {
        repositionOnResize();
      }
    }, 100);
  }
  
  let resizeTimeout;

  function handleDismiss() {
    dispatch('dismiss');
  }
  
  function handleFollowUp(action) {
    dispatch('follow-up', { action, originalResponse: response });
  }
  
  // Handle help option selection
  function handleHelpOption(type) {
    dispatch('help-requested', { type, text: originalText });
  }
  
  // Reset popup to show options menu
  function handleBackToOptions() {
    // This will be caught by the parent component
    dispatch('back-to-options');
  }
  
  // Handle Mr Wiskr feedback
  async function handleMrWiskrFeedback(rating, comment = null) {
    if (submittingFeedback) return;
    
    submittingFeedback = true;
    
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit-mr-wiskr-feedback',
          projectId,
          rating,
          comment: comment || null,
          context: originalText ? originalText.slice(0, 200) + '...' : 'Mr Wiskr assistance'
        })
      });
      
      if (response.ok) {
        feedbackSubmitted = true;
        feedbackType = rating === 1 ? 'positive' : 'negative';
        showFeedbackComment = false;
        
        // Auto-dismiss after showing thanks
        setTimeout(() => {
          if (visible) {
            handleDismiss();
          }
        }, 2000);
      } else {
        console.error('Failed to submit Mr Wiskr feedback');
      }
    } catch (error) {
      console.error('Error submitting Mr Wiskr feedback:', error);
    } finally {
      submittingFeedback = false;
    }
  }
  
  function handleThumbsUp() {
    if (feedbackSubmitted) return;
    handleMrWiskrFeedback(1);
  }
  
  function handleThumbsDown() {
    if (feedbackSubmitted) return;
    feedbackType = 'negative';
    showFeedbackComment = true;
  }
  
  function submitNegativeFeedback() {
    handleMrWiskrFeedback(-1, feedbackComment.trim() || null);
  }
  
  function cancelFeedbackComment() {
    showFeedbackComment = false;
    feedbackComment = '';
    feedbackType = null;
  }

  // Track content changes to trigger repositioning
  $: contentKey = `${response}${error}${showOptions}${isThinking}`;
  
  // Position popup after content is rendered or content changes
  $: if (browser && visible && popupElement && contentKey) {
    // Reset positioning state when content changes
    isPositioned = false;
    
    // Wait for next tick to ensure content is rendered
    setTimeout(() => {
      positionPopup();
    }, 10); // Slightly longer delay to ensure DOM updates are complete
  }
  
  // Listen for scroll and resize events when visible
  $: if (browser && visible) {
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
  }
  
  function positionPopup() {
    if (!popupElement || !visible) return;
    
    const rect = popupElement.getBoundingClientRect();
    const actualHeight = rect.height;
    const actualWidth = rect.width;
    
    // Calculate final position
    finalX = calculateRightPositionX(x, actualWidth);
    finalY = calculateCenteredY(actualHeight);
    
    // Mark as positioned and trigger animation
    isPositioned = true;
  }
  
  function repositionOnResize() {
    if (!popupElement || !visible || !isPositioned) return;
    
    const rect = popupElement.getBoundingClientRect();
    const actualHeight = rect.height;
    const actualWidth = rect.width;
    
    // Recalculate position based on new window size
    const newX = calculateRightPositionX(x, actualWidth);
    const newY = calculateCenteredY(actualHeight);
    
    // Update position smoothly
    finalX = newX;
    finalY = newY;
  }
  
  // Auto-dismiss when scrolling off-screen
  function checkVisibility() {
    if (!browser || !popupElement || !visible || !isPositioned) return;
    
    const rect = popupElement.getBoundingClientRect();
    const isOffScreen = rect.bottom < 0 || rect.top > window.innerHeight || 
                       rect.right < 0 || rect.left > window.innerWidth;
    
    if (isOffScreen) {
      handleDismiss();
    }
  }

  onDestroy(() => {
    if (browser) {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    }
  });
  
  // Reset positioning when popup visibility changes
  $: if (visible) {
    // Only reset if it just became visible
    finalX = 0;
    finalY = 0;
  } else {
    // Reset positioning state when hidden
    isPositioned = false;
  }
  
  function calculateRightPositionX(targetX, actualWidth = 520) {
    if (!browser) return targetX;
    
    const offsetFromMessage = 30; // Space between message edge and popup
    const margin = 30; // Margin from screen edges
    
    // Always try to position on the right side first
    // Calculate ideal right position based on viewport
    const viewportWidth = window.innerWidth;
    const idealRightX = viewportWidth - actualWidth - margin;
    
    // If we have enough space on the right side, use it
    if (idealRightX > margin) {
      return idealRightX;
    }
    
    // If not enough space on right, try to find the message container for better positioning
    const messageContainer = document.querySelector('.assistant-message');
    if (messageContainer) {
      const messageRect = messageContainer.getBoundingClientRect();
      const messageRightEdge = messageRect.right;
      const rightPositionX = messageRightEdge + offsetFromMessage;
      
      // If positioning to the right of message fits, use it
      if (rightPositionX + actualWidth + margin <= viewportWidth) {
        return rightPositionX;
      }
      
      // Otherwise position to the left of message if there's space
      const leftPositionX = messageRect.left - actualWidth - offsetFromMessage;
      if (leftPositionX >= margin) {
        return leftPositionX;
      }
    }
    
    // Final fallback: position with margin from right edge
    return Math.max(margin, viewportWidth - actualWidth - margin);
  }
  
  function calculateCenteredY(actualHeight) {
    if (!browser) return 0;
    
    const viewportHeight = window.innerHeight;
    const margin = 30; // Margin from screen edges
    
    // Center the popup vertically in the viewport
    const centeredY = (viewportHeight - actualHeight) / 2;
    
    // Ensure it stays within safe bounds
    const maxY = viewportHeight - actualHeight - margin;
    const minY = margin;
    
    // Clamp to safe bounds
    return Math.max(minY, Math.min(centeredY, maxY));
  }
</script>

{#if visible}
  <div
    bind:this={popupElement}
    class="fixed z-50 border-2 rounded-xl shadow-2xl mr-wiskr-popup"
    class:positioned={isPositioned}
    style="
      left: {isPositioned ? finalX : finalX}px; 
      top: {isPositioned ? finalY : window.innerHeight}px; 
      width: 520px; 
      border-color: #5D60DD; 
      background-color: var(--bg-modal, white);
      opacity: {isPositioned ? 1 : 0};
      transition: {isPositioned ? 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'};
    "
  >
    <div class="relative">
      <!-- Close X button in top right -->
      <button
        class="absolute top-3 right-3 z-20 p-1 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
        style="color: #5D60DD;"
        on:click={handleDismiss}
        title="Close"
      >
        <X size={20} />
      </button>
      
      <!-- Mr Wiskr Image - positioned to pop out of the left side -->
      <div class="absolute -left-10 top-3 z-10">
        <img 
          src="/mr-wiskr.png" 
          alt="Mr Wiskr" 
          class="w-20 h-20 rounded-full border-2 shadow-lg bg-white"
          style="border-color: #5D60DD;"
        />
      </div>
      
      <!-- Content Area with left margin for the protruding image -->
      <div class="pl-14 pr-4 pt-4 pb-4">
        {#if isThinking}
          <div class="flex items-center gap-2" style="color: #5D60DD;">
            <div class="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent" style="border-color: #5D60DD;"></div>
            <span class="text-sm font-medium">Mr Wiskr is thinking...</span>
          </div>
        {:else if error}
          <div class="text-sm text-red-600 dark:text-red-400">
            <p class="font-medium mb-1">Oops!</p>
            <p>{error}</p>
          </div>
        {:else if response}
          <div class="text-sm text-gray-800 dark:text-gray-200 space-y-2">
            <div class="font-medium mb-2" style="color: #5D60DD;">Mr Wiskr says:</div>
            <div class="prose prose-sm max-w-none prose-gray dark:prose-invert">
              {@html renderMarkdown(response)}
            </div>
            
            <!-- Mr Wiskr Feedback Section -->
            {#if !feedbackSubmitted && !showFeedbackComment}
              <div class="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                <div class="text-xs text-gray-600 dark:text-gray-400 mb-2 text-center">Was this helpful?</div>
                <div class="flex items-center justify-center gap-2">
                  <button
                    class="flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50"
                    style="color: #10b981; border-color: #10b981;"
                    on:click={handleThumbsUp}
                    disabled={submittingFeedback}
                    title="Mr Wiskr was helpful"
                  >
                    <ThumbsUp size="14" />
                    <span>Yes</span>
                  </button>
                  <button
                    class="flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                    style="color: #ef4444; border-color: #ef4444;"
                    on:click={handleThumbsDown}
                    disabled={submittingFeedback}
                    title="Mr Wiskr could do better"
                  >
                    <ThumbsDown size="14" />
                    <span>No</span>
                  </button>
                </div>
              </div>
            {:else if showFeedbackComment}
              <div class="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                <div class="text-xs text-gray-600 dark:text-gray-400 mb-2">What could Mr Wiskr do better?</div>
                <textarea
                  bind:value={feedbackComment}
                  placeholder="Tell us how Mr Wiskr can improve..."
                  rows="2"
                  class="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
                  style="background-color: #1b1b1e; color: var(--text-primary);"
                ></textarea>
                <div class="flex items-center justify-end gap-2 mt-2">
                  <button
                    class="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                    on:click={cancelFeedbackComment}
                    disabled={submittingFeedback}
                  >
                    Skip
                  </button>
                  <button
                    class="px-2 py-1 text-xs text-white rounded transition-colors disabled:opacity-50"
                    style="background-color: var(--color-accent);"
                    on:click={submitNegativeFeedback}
                    disabled={submittingFeedback}
                  >
                    {#if submittingFeedback}
                      <div class="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                    {:else}
                      Submit
                    {/if}
                  </button>
                </div>
              </div>
            {:else if feedbackSubmitted}
              <div class="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                <div class="text-xs text-center" style="color: var(--color-accent);">
                  {#if feedbackType === 'positive'}
                    🐱 Thanks! Mr Wiskr purrs with appreciation!
                  {:else}
                    🐱 Thanks for the feedback - Mr Wiskr will learn and get better!
                  {/if}
                </div>
              </div>
            {/if}
          </div>
        {:else if showOptions}
          <!-- Help Options Menu -->
          <div class="text-sm space-y-3">
            <div class="font-medium text-center mb-4" style="color: #5D60DD;">
              Hey there! How can I help you with this?
            </div>
            
            <div class="space-y-2">
              <button
                class="cursor-pointer w-full text-left p-3 rounded-lg border transition-all hover:shadow-md hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                style="border-color: #e5e7eb; background-color: var(--bg-modal, white);"
                on:click={() => handleHelpOption('translate')}
              >
                <div class="font-medium mb-1" style="color: #5D60DD;">Let me break it down for you</div>
                <div class="text-xs text-gray-600 dark:text-gray-400">I'll unravel this in plain language that makes sense</div>
              </button>
              
              <button
                class="cursor-pointer w-full text-left p-3 rounded-lg border transition-all hover:shadow-md hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                style="border-color: #e5e7eb; background-color: var(--bg-modal, white);"
                on:click={() => handleHelpOption('examples')}
              >
                <div class="font-medium mb-1" style="color: #5D60DD;">Can I show you what this looks like?</div>
                <div class="text-xs text-gray-600 dark:text-gray-400">Need some examples of how this actually works?</div>
              </button>
              
              <button
                class="cursor-pointer w-full text-left p-3 rounded-lg border transition-all hover:shadow-md hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                style="border-color: #e5e7eb; background-color: var(--bg-modal, white);"
                on:click={() => handleHelpOption('next-steps')}
              >
                <div class="font-medium mb-1" style="color: #5D60DD;">So, what's next?</div>
                <div class="text-xs text-gray-600 dark:text-gray-400">I'll give you practical steps to take</div>
              </button>
              
              <button
                class="cursor-pointer w-full text-left p-3 rounded-lg border transition-all hover:shadow-md hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                style="border-color: #e5e7eb; background-color: var(--bg-modal, white);"
                on:click={() => handleHelpOption('critique')}
              >
                <div class="font-medium mb-1" style="color: #5D60DD;">Wait, is this actually right?</div>
                <div class="text-xs text-gray-600 dark:text-gray-400">I'll hunt down red flags or missing pieces</div>
              </button>
              
              <button
                class="cursor-pointer w-full text-left p-3 rounded-lg border transition-all hover:shadow-md hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                style="border-color: #e5e7eb; background-color: var(--bg-modal, white);"
                on:click={() => handleHelpOption('alternative')}
              >
                <div class="font-medium mb-1" style="color: #5D60DD;">Let's ask a friend</div>
                <div class="text-xs text-gray-600 dark:text-gray-400">Maybe another wiskr could explain this better?</div>
              </button>
              
              <button
                class="cursor-pointer w-full text-left p-3 rounded-lg border transition-all hover:shadow-md hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                style="border-color: #e5e7eb; background-color: var(--bg-modal, white);"
                on:click={() => handleHelpOption('report-problem')}
              >
                <div class="font-medium mb-1" style="color: #ef4444;">There's a problem</div>
                <div class="text-xs text-gray-600 dark:text-gray-400">Bugs, offensive content, or issues that need attention</div>
              </button>
            </div>
          </div>
        {:else}
          <div class="text-sm text-gray-600 dark:text-gray-400">
            <span class="font-medium">Hey there!</span> Let me help you with this...
          </div>
        {/if}
      </div>
    </div>
    
    <!-- Footer with dismiss -->
    {#if !isThinking && response}
      <div class="border-t border-gray-100 dark:border-gray-700 px-4 py-3 space-y-2">
        <!-- Back to options button -->
        <div class="flex justify-center">
          <button
            class="cursor-pointer text-xs px-4 py-2 rounded border transition-colors hover:bg-purple-50 dark:hover:bg-purple-900/30 flex items-center gap-1"
            style="color: #5D60DD; border-color: #5D60DD;"
            on:click={() => dispatch('back-to-options')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            <span>Pick a different option</span>
          </button>
          
          <!-- Show confirmation button if Mr Wiskr suggested a model switch -->
          {#if response && response.includes('Should I set that up?')}
            <button
              class="cursor-pointer text-xs ml-2 px-3 py-1.5 rounded border transition-colors hover:bg-green-50 dark:hover:bg-green-900/30"
              style="color: #16a34a; border-color: #16a34a; font-weight: 500;"
              on:click={() => handleFollowUp('confirm-model-switch')}
            >
              Yes, set it up!
            </button>
          {/if}
        </div>
        
        <!-- Dismiss Button -->
        <button
          class="cursor-pointer w-full text-sm font-medium rounded-lg py-2 transition-colors hover:text-white dark:hover:text-white border-t border-gray-200 dark:border-gray-600 pt-3 mt-3"
          style="color: #5D60DD;"
          on:click={handleDismiss}
        >
          Dismiss Mr. Wiskr
        </button>
      </div>
    {:else if !isThinking}
      <div class="border-t border-gray-100 dark:border-gray-700 px-4 py-3">
        <button
          class="cursor-pointer w-full text-sm font-medium rounded-lg py-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-white dark:hover:text-white"
          style="color: #5D60DD;"
          on:click={handleDismiss}
        >
          Dismiss
        </button>
      </div>
    {/if}
  </div>
{/if}

<style>
  /* Initial state - positioned off-screen at bottom */
  .mr-wiskr-popup {
    transform: translateY(20px);
  }
  
  /* Final positioned state - slides up and fades in */
  .mr-wiskr-popup.positioned {
    transform: translateY(0);
  }
</style>
