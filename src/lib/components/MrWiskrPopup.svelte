<!-- src/lib/components/MrWiskrPopup.svelte -->
<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { marked } from 'marked';
  import { getAIName } from '$lib/config/aiAvatars.js';
  import { X } from 'lucide-svelte';

  export let visible = false;
  export let x = 0;
  export let y = 0;
  export let isThinking = false;
  export let response = '';
  export let error = '';

  const dispatch = createEventDispatcher();
  
  // Configure marked for better rendering
  marked.setOptions({
    breaks: true,
    gfm: true,
  });
  
  function renderMarkdown(content) {
    if (!content || typeof content !== 'string') return '';
    return marked(content);
  }

  let popupElement;

  // Auto-dismiss when scrolling off-screen
  function checkVisibility() {
    if (!browser || !popupElement || !visible) return;
    
    const rect = popupElement.getBoundingClientRect();
    const isOffScreen = rect.bottom < 0 || rect.top > window.innerHeight || 
                       rect.right < 0 || rect.left > window.innerWidth;
    
    if (isOffScreen) {
      handleDismiss();
    }
  }

  function handleScroll() {
    requestAnimationFrame(checkVisibility);
  }

  function handleDismiss() {
    dispatch('dismiss');
  }
  
  function handleFollowUp(action) {
    dispatch('follow-up', { action, originalResponse: response });
  }

  // Listen for scroll events when visible and ensure popup is in view
  $: if (browser && visible) {
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    
    // Scroll popup into view when it appears
    setTimeout(() => {
      if (popupElement && visible) {
        scrollPopupIntoView();
      }
    }, 150);
  }
  
  function scrollPopupIntoView() {
    if (!popupElement || !visible) return;
    
    const rect = popupElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const margin = 30;
    
    // Check if popup is partially or completely off-screen
    if (rect.bottom > viewportHeight - margin) {
      // Calculate how much to scroll to bring popup into view
      const scrollAmount = rect.bottom - viewportHeight + margin;
      window.scrollBy({ 
        top: scrollAmount, 
        behavior: 'smooth' 
      });
    } else if (rect.top < margin) {
      // If popup is off the top, scroll up
      const scrollAmount = rect.top - margin;
      window.scrollBy({ 
        top: scrollAmount, 
        behavior: 'smooth' 
      });
    }
  }

  onDestroy(() => {
    if (browser) {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
    }
  });

  // Calculate dynamic positioning to the right of click, centered vertically on screen
  $: adjustedX = calculateRightPositionX(x);
  $: adjustedY = calculateScreenCenteredY();
  
  function calculateRightPositionX(targetX) {
    if (!browser) return targetX;
    
    const popupWidth = 520; // Much wider popup for more text
    const offsetFromMessage = 30; // Space between message edge and popup
    
    // Find the message container to position relative to its edge
    const messageContainer = document.querySelector('.assistant-message');
    let messageRightEdge = targetX;
    
    if (messageContainer) {
      const messageRect = messageContainer.getBoundingClientRect();
      messageRightEdge = messageRect.right;
    }
    
    const rightPositionX = messageRightEdge + offsetFromMessage;
    const margin = 30;
    
    // If popup would go off right edge, position it to the left of message instead
    if (rightPositionX + popupWidth + margin > window.innerWidth) {
      const messageLeftEdge = messageContainer ? 
        messageContainer.getBoundingClientRect().left : targetX;
      return Math.max(margin, messageLeftEdge - popupWidth - offsetFromMessage);
    }
    
    return rightPositionX;
  }
  
  function calculateScreenCenteredY() {
    if (!browser) return 0;
    
    const estimatedPopupHeight = 400; // More realistic estimate for most cases
    const viewportHeight = window.innerHeight;
    const margin = 30; // Margin from screen edges
    
    // Center the popup vertically in the viewport
    const centeredY = (viewportHeight - estimatedPopupHeight) / 2;
    
    // Ensure it stays within safe bounds
    const maxY = viewportHeight - estimatedPopupHeight - margin;
    const minY = margin;
    
    // Clamp to safe bounds
    return Math.max(minY, Math.min(centeredY, maxY));
  }
</script>

{#if visible}
  <div
    bind:this={popupElement}
    class="fixed z-50 border-2 rounded-xl shadow-2xl"
    style="left: {adjustedX}px; top: {adjustedY}px; width: 520px; border-color: #5D60DD; background-color: var(--bg-modal, white);"
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
          </div>
        {:else}
          <div class="text-sm text-gray-600 dark:text-gray-400">
            <span class="font-medium">Hey there!</span> Let me help you with this...
          </div>
        {/if}
      </div>
    </div>
    
    <!-- Follow-up Actions and Dismiss -->
    {#if !isThinking && response}
      <div class="border-t border-gray-100 dark:border-gray-700 px-4 py-3 space-y-2">
        <!-- Follow-up Action Buttons -->
        <div class="flex gap-2 flex-wrap justify-center">
          <button
            class="text-xs px-3 py-1.5 rounded border transition-colors hover:bg-purple-50 dark:hover:bg-purple-900/30"
            style="color: #5D60DD; border-color: #5D60DD;"
            on:click={() => handleFollowUp('simplify-more')}
          >
            Simplify More
          </button>
          <button
            class="text-xs px-3 py-1.5 rounded border transition-colors hover:bg-purple-50 dark:hover:bg-purple-900/30"
            style="color: #5D60DD; border-color: #5D60DD;"
            on:click={() => handleFollowUp('show-examples')}
          >
            Show Examples
          </button>
          <button
            class="text-xs px-3 py-1.5 rounded border transition-colors hover:bg-purple-50 dark:hover:bg-purple-900/30"
            style="color: #5D60DD; border-color: #5D60DD;"
            on:click={() => handleFollowUp('ask-someone-else')}
          >
            Let's ask someone else
          </button>
          
          <!-- Show confirmation button if Mr Wiskr suggested a model switch -->
          {#if response && response.includes('Should I set that up?')}
            <button
              class="text-xs px-3 py-1.5 rounded border transition-colors hover:bg-green-50 dark:hover:bg-green-900/30"
              style="color: #16a34a; border-color: #16a34a; font-weight: 500;"
              on:click={() => handleFollowUp('confirm-model-switch')}
            >
              Yes, set it up!
            </button>
          {/if}
        </div>
        
        <!-- Dismiss Button -->
        <button
          class="w-full text-sm font-medium rounded-lg py-2 transition-colors hover:text-white dark:hover:text-white border-t border-gray-200 dark:border-gray-600 pt-3 mt-3"
          style="color: #5D60DD;"
          on:click={handleDismiss}
        >
          Dismiss Mr. Wiskr
        </button>
      </div>
    {:else if !isThinking}
      <div class="border-t border-gray-100 dark:border-gray-700 px-4 py-3">
        <button
          class="w-full text-sm font-medium rounded-lg py-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-white dark:hover:text-white"
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
  /* Animation for popup appearance */
  .fixed {
    animation: mrWiskrSlideIn 0.3s ease-out;
  }
  
  @keyframes mrWiskrSlideIn {
    from {
      opacity: 0;
      transform: translateX(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }
</style>
