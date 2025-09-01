<!-- VirtualMessageList.svelte - High-performance virtual scrolling for chat messages -->
<script>
  import { createEventDispatcher, onMount, onDestroy, tick } from 'svelte';
  import { createMessageMeasurer } from '$lib/utils/messageMeasurer.js';
  import MessageItem from './MessageItem.svelte';
  import LoadingSpinner from './LoadingSpinner.svelte';

  export let messages = [];
  export let loadingMessages = false;
  export let current = null;
  export let hasInit = false;
  export let currentBranch = null;
  export let currentBranchId = 'main';
  export let messageBranchCounts = {};
  export let userPreferences = { display_name: null };
  export let isMobile = false; // Whether this is on mobile
  export let showMobileForm = false; // Whether mobile form is expanded
  
  // Virtual scrolling configuration
  export let bufferSize = 5; // Number of messages to render outside viewport
  export let estimatedMessageHeight = 120; // Initial height estimate
  export let debugMode = false; // Enable debug logging

  const dispatch = createEventDispatcher();
  
  // Virtual scrolling state
  let containerElement;
  let scrollTop = 0;
  let containerHeight = 0;
  let isUserScrolling = false;
  let shouldScrollToBottom = true;
  let lastMessageCount = 0;
  let isAtBottom = true;
  let scrollTimeoutId = null;

  // Message measurement and positioning
  let messageMeasurer;
  let visibleRange = { startIndex: 0, endIndex: 0, offsetTop: 0, visibleCount: 0 };
  let totalHeight = 0;

  // Initialize message measurer
  onMount(() => {
    messageMeasurer = createMessageMeasurer({
      defaultHeight: estimatedMessageHeight,
      debug: debugMode,
      onUpdate: handleMeasurementUpdate
    });

    if (containerElement) {
      updateContainerHeight();
      // Immediate scroll to bottom if there are messages - this runs first to avoid initial scroll position
      if (messages.length > 0) {
        // Set initial state (don't scroll yet - wait for proper measurements)
        isAtBottom = true;
        shouldScrollToBottom = true;
        
        // Then use aggressive retry mechanism to ensure we stay at bottom
        const scrollToBottomWithRetry = (attempt = 0) => {
          if (attempt >= 5) return; // Max 5 attempts
          
          tick().then(() => {
            if (containerElement) {
              // Force immediate scroll to bottom
              containerElement.scrollTop = containerElement.scrollHeight;
              // Also try smooth scroll as backup
              scrollToBottom(false);
              // Retry with increasing delays for height measurements
              if (attempt < 4) {
                const delay = attempt < 2 ? 50 : attempt < 3 ? 200 : 500;
                setTimeout(() => scrollToBottomWithRetry(attempt + 1), delay);
              }
            }
          });
        };
        
        scrollToBottomWithRetry();
        
        // Additional robust scroll after a delay to handle any layout issues
        setTimeout(() => {
          if (containerElement && messages.length > 0) {
            forceScrollToBottomAfterLoad();
          }
        }, 200);
      }
    }
    
    // Listen for resize events to handle desktop-to-mobile transitions
    const handleResizeForScroll = () => {
      if (containerElement && messages.length > 0 && isAtBottom) {
        // If we're supposed to be at bottom but viewport changed, re-scroll
        setTimeout(() => {
          if (containerElement && messages.length > 0) {
            forceScrollToBottomForResize();
          }
        }, 100);
      }
    };
    
    window.addEventListener('resize', handleResizeForScroll);
    
    // Cleanup on destroy
    return () => {
      window.removeEventListener('resize', handleResizeForScroll);
    };
  });

  // Handle measurement updates from MessageMeasurer
  function handleMeasurementUpdate(update) {
    // Update virtual scrolling calculations
    calculateVisibleRange();
    
    // If user is at bottom and height changed, maintain scroll position
    if (isAtBottom && shouldScrollToBottom) {
      tick().then(() => scrollToBottom(false));
    }
  }

  // Update container dimensions
  function updateContainerHeight() {
    if (containerElement) {
      containerHeight = containerElement.offsetHeight;
      calculateVisibleRange();
    }
  }

  // Calculate which messages should be visible
  function calculateVisibleRange() {
    if (!messageMeasurer || !messages.length || !containerHeight) {
      visibleRange = { startIndex: 0, endIndex: Math.min(messages.length - 1, bufferSize), offsetTop: 0, visibleCount: 0 };
      return;
    }

    // Update positions for all messages
    messageMeasurer.calculatePositionsForMessages(messages);
    totalHeight = messageMeasurer.getTotalHeight(messages);
    
    // Calculate visible range based on scroll position
    visibleRange = messageMeasurer.getVisibleRange(
      scrollTop,
      containerHeight,
      messages,
      bufferSize
    );

    if (debugMode) {
      console.log('📊 VirtualMessageList: Visible range:', {
        scrollTop,
        containerHeight,
        totalHeight,
        ...visibleRange
      });
    }
  }

  // Handle scroll events
  function handleScroll(event) {
    const newScrollTop = event.target.scrollTop;
    const maxScrollTop = event.target.scrollHeight - event.target.clientHeight;
    
    scrollTop = newScrollTop;
    isAtBottom = newScrollTop >= maxScrollTop - 5; // 5px threshold
    
    // Mark as user scrolling to prevent auto-scroll interference
    if (!isUserScrolling) {
      isUserScrolling = true;
      shouldScrollToBottom = isAtBottom;
    }

    // Debounce scroll end detection
    if (scrollTimeoutId) {
      clearTimeout(scrollTimeoutId);
    }
    
    scrollTimeoutId = setTimeout(() => {
      isUserScrolling = false;
      // If user scrolled to bottom, enable auto-scroll for new messages
      if (isAtBottom) {
        shouldScrollToBottom = true;
      }
    }, 150);

    calculateVisibleRange();
  }

  // Scroll to bottom (for new messages or initialization)
  function scrollToBottom(smooth = true) {
    if (!containerElement) return;
    
    if (smooth && 'scrollTo' in containerElement) {
      containerElement.scrollTo({
        top: containerElement.scrollHeight,
        behavior: 'smooth'
      });
    } else {
      containerElement.scrollTop = containerElement.scrollHeight;
    }
  }

  // Handle message height changes
  function handleMessageHeightChange(messageId, height) {
    if (messageMeasurer) {
      messageMeasurer.setHeight(messageId, height);
    }
  }

  // Auto-scroll when messages change (new messages or content updates)
  $: if (messages && messages.length !== lastMessageCount) {
    const wasFirstLoad = lastMessageCount === 0 && messages.length > 0;
    const newMessageAdded = messages.length > lastMessageCount;
    lastMessageCount = messages.length;
    
    // Check if the new message is from the user
    const isNewUserMessage = newMessageAdded && messages.length > 0 && 
      messages[messages.length - 1]?.role === 'user';
    
    if (wasFirstLoad) {
      // For first load, use aggressive scroll-to-bottom that waits for measurements
      forceScrollToBottomAfterLoad();
    } else if (newMessageAdded) {
      if (isNewUserMessage) {
        // Always scroll to bottom for new user messages
        shouldScrollToBottom = true;
        isAtBottom = true;
        tick().then(() => {
          if (containerElement) {
            scrollToBottom(true); // Smooth scroll for new user messages
          }
        });
      } else if (shouldScrollToBottom && isAtBottom) {
        // For assistant messages, only scroll if user is at bottom
        tick().then(() => {
          if (containerElement && shouldScrollToBottom && isAtBottom) {
            scrollToBottom(true); // Smooth scroll for new messages
          }
        });
      }
    }
    
    // Recalculate visible range for new messages
    tick().then(calculateVisibleRange);
  }
  
  // Also auto-scroll when message content changes (during streaming)
  // Only if user is at bottom to avoid disrupting reading
  $: if (messages && messages.length > 0 && shouldScrollToBottom && isAtBottom) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content) {
      // Debounce scroll during streaming to avoid excessive scrolling
      clearTimeout(streamingScrollTimeout);
      streamingScrollTimeout = setTimeout(() => {
        if (containerElement && shouldScrollToBottom && isAtBottom) {
          scrollToBottom(false); // Immediate scroll during streaming
        }
      }, 50);
    }
  }
  
  let streamingScrollTimeout = null;
  
  // Force scroll to bottom immediately (for button click) - ensures single click works
  export async function forceScrollToBottomImmediate() {
    if (!containerElement || !messages.length) return;
    
    // Disable virtualization to render all messages
    visibleRange = {
      startIndex: 0,
      endIndex: messages.length - 1,
      offsetTop: 0,
      visibleCount: messages.length
    };
    
    // Wait for all messages to render in DOM
    await tick();
    
    // More aggressive approach for desktop-to-mobile scenarios
    const maxAttempts = 8; // Increased from 5
    let attempt = 0;
    
    const scrollToBottomWithRetry = async () => {
      if (attempt >= maxAttempts) return;
      
      attempt++;
      
      // Force scroll to bottom with multiple approaches
      const scrollHeight = containerElement.scrollHeight;
      const clientHeight = containerElement.clientHeight;
      const maxScroll = scrollHeight - clientHeight;
      
      // Try multiple scroll methods for better compatibility
      containerElement.scrollTop = scrollHeight;
      
      // Also try smooth scroll as backup
      if (attempt === 1) {
        containerElement.scrollTo({
          top: scrollHeight,
          behavior: 'auto'
        });
      }
      
      // Check if we actually reached the bottom
      await tick();
      const actualScrollTop = containerElement.scrollTop;
      
      // More aggressive tolerance for desktop-to-mobile scenarios
      const tolerance = attempt <= 3 ? 20 : 10; // Higher tolerance for first few attempts
      
      if (Math.abs(actualScrollTop - maxScroll) > tolerance && attempt < maxAttempts) {
        // Exponential backoff for retries
        const delay = Math.min(50 * Math.pow(1.5, attempt - 1), 200);
        setTimeout(scrollToBottomWithRetry, delay);
      } else {
        // Successfully at bottom, update state
        isAtBottom = true;
        shouldScrollToBottom = true;
        scrollTop = actualScrollTop;
        
        // Re-enable virtualization after successful scroll
        setTimeout(() => {
          calculateVisibleRange();
        }, 150); // Increased delay for better stability
      }
    };
    
    // Start the retry process
    await scrollToBottomWithRetry();
  }

  // Force scroll to bottom for desktop-to-mobile resize scenarios - most aggressive approach
  export async function forceScrollToBottomForResize() {
    if (!containerElement || !messages.length) return;
    
    // Completely disable virtualization temporarily
    visibleRange = {
      startIndex: 0,
      endIndex: messages.length - 1,
      offsetTop: 0,
      visibleCount: messages.length
    };
    
    // Clear any existing heights to force re-measurement
    if (messageMeasurer) {
      messageMeasurer.clear();
    }
    
    // Wait for layout to stabilize
    await tick();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Multiple aggressive scroll attempts
    const scrollAttempts = [0, 50, 100, 200, 400, 600];
    
    for (const delay of scrollAttempts) {
      await new Promise(resolve => setTimeout(resolve, delay));
      
      if (containerElement) {
        // Force scroll with multiple methods
        containerElement.scrollTop = containerElement.scrollHeight;
        containerElement.scrollTo({
          top: containerElement.scrollHeight,
          behavior: 'auto'
        });
        
        // Verify scroll position
        await tick();
        const actualScrollTop = containerElement.scrollTop;
        const maxScroll = containerElement.scrollHeight - containerElement.clientHeight;
        
        if (Math.abs(actualScrollTop - maxScroll) < 15) {
          // Successfully scrolled to bottom
          isAtBottom = true;
          shouldScrollToBottom = true;
          scrollTop = actualScrollTop;
          break;
        }
      }
    }
    
    // Re-enable virtualization after a longer delay
    setTimeout(() => {
      calculateVisibleRange();
    }, 200);
  }

  // Force scroll to bottom for first load - more aggressive approach
  async function forceScrollToBottomAfterLoad() {
    if (!containerElement || !messages.length) return;
    
    // Temporarily disable virtualization by showing all messages
    visibleRange = {
      startIndex: 0,
      endIndex: messages.length - 1,
      offsetTop: 0,
      visibleCount: messages.length
    };
    
    // Clear any existing heights to force re-measurement
    if (messageMeasurer) {
      messageMeasurer.clear();
    }
    
    // Wait for all messages to render
    await tick();
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Multiple scroll attempts with increasing delays
    const scrollAttempts = [0, 100, 200, 500, 1000];
    
    for (const delay of scrollAttempts) {
      await new Promise(resolve => setTimeout(resolve, delay));
      
      if (containerElement) {
        const scrollHeight = containerElement.scrollHeight;
        const clientHeight = containerElement.clientHeight;
        const maxScroll = scrollHeight - clientHeight;
        
        containerElement.scrollTop = scrollHeight;
        
        // Verify we actually scrolled to bottom
        await tick();
        const actualScrollTop = containerElement.scrollTop;
        
        if (Math.abs(actualScrollTop - maxScroll) < 10) {
          break; // Successfully scrolled to bottom
        }
      }
    }
    
    // Re-enable virtualization after successful scroll
    await tick();
    calculateVisibleRange();
  }

  // Recalculate on resize
  function handleResize() {
    updateContainerHeight();
  }

  // Event delegation for message actions
  function handleMessageEvent(event) {
    dispatch(event.type, event.detail);
  }

  // Calculate spacer heights for proper scrolling
  $: topSpacerHeight = visibleRange.offsetTop;
  $: bottomSpacerHeight = Math.max(0, totalHeight - visibleRange.offsetTop - getVisibleMessagesHeight());
  $: visibleMessages = messages.slice(visibleRange.startIndex, visibleRange.endIndex + 1);

  function getVisibleMessagesHeight() {
    let height = 0;
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex && i < messages.length; i++) {
      height += messageMeasurer ? messageMeasurer.getHeight(messages[i].id) : estimatedMessageHeight;
    }
    return height;
  }

  // Cleanup
  onDestroy(() => {
    if (scrollTimeoutId) {
      clearTimeout(scrollTimeoutId);
    }
    if (streamingScrollTimeout) {
      clearTimeout(streamingScrollTimeout);
    }
  });

  // Debug info for development
  $: if (debugMode && messageMeasurer) {
    const debugInfo = messageMeasurer.getDebugInfo();
    console.log('🔍 VirtualMessageList Debug:', {
      ...debugInfo,
      visibleMessages: visibleMessages.length,
      totalMessages: messages.length,
      isAtBottom,
      shouldScrollToBottom
    });
  }
  
  // Emit scroll position changes to parent components
  $: if (messages.length > 0) {
    dispatch('scroll-position', { isAtBottom, hasMessages: messages.length > 0 });
  }
</script>

<svelte:window on:resize={handleResize} />

<div 
  class="flex-1 overflow-y-auto overflow-x-hidden py-4 pl-4 pr-2 searchable-chat-area" 
  style="background-color: var(--bg-chat);"
  bind:this={containerElement}
  on:scroll={handleScroll}
>
  {#if !current && !hasInit}
    <LoadingSpinner 
      size="md" 
      text="Loading projects..." 
      center={true} 
    />
  {:else if !current && hasInit}
    <p class="text-gray-600 dark:text-gray-400">Select a project to start chatting.</p>
  {:else if loadingMessages}
    <LoadingSpinner 
      size="md" 
      text="Loading conversation history..." 
      center={true} 
    />
  {:else if messages.length === 0}
    <div class="text-center text-zinc-500 dark:text-zinc-400 py-8">
      <div class="text-sm">Look at this brand new space ready for action!</div>
      <div class="text-xs mt-1">What do you want to do next?</div>
    </div>
  {:else}
    <!-- Top spacer for messages above viewport -->
    {#if topSpacerHeight > 0}
      <div style="height: {topSpacerHeight}px;" aria-hidden="true"></div>
    {/if}

    <!-- Visible messages -->
    {#each visibleMessages as message, localIndex (message.id)}
      {@const globalIndex = visibleRange.startIndex + localIndex}
      <MessageItem
        {message}
        index={globalIndex}
        {currentBranch}
        {currentBranchId}
        {messageBranchCounts}
        {userPreferences}
        {current}
        onHeightChange={handleMessageHeightChange}
        on:select-all={(e) => dispatch('select-all', e.detail)}
        on:open-branch-modal={(e) => dispatch('open-branch-modal', e.detail)}
        on:open-mr-wiskr={(e) => dispatch('open-mr-wiskr', e.detail)}
      />
    {/each}

    <!-- Bottom spacer for messages below viewport -->
    {#if bottomSpacerHeight > 0}
      <div style="height: {bottomSpacerHeight}px;" aria-hidden="true"></div>
    {/if}
  {/if}
</div>

<!-- Scroll to bottom button (appears when user scrolled up, hidden when mobile form is open) -->
{#if messages.length > 0 && !isAtBottom && !(isMobile && showMobileForm)}
  <div class="absolute bottom-48 left-1/2 transform -translate-x-1/2 z-20">
    <button
      class="bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-full px-4 py-2 shadow-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium"
      on:click={() => forceScrollToBottomImmediate()}
      title="Scroll to bottom"
    >
      ↓ New messages
    </button>
  </div>
{/if}

<style>
  /* Ensure smooth scrolling performance */
  .searchable-chat-area {
    scroll-behavior: smooth;
    /* Use GPU acceleration for better performance */
    will-change: scroll-position;
    /* Optimize for scrolling */
    -webkit-overflow-scrolling: touch;
    /* Prevent horizontal overflow at all costs */
    word-wrap: break-word;
    word-break: break-word;
    overflow-wrap: break-word;
  }
  
  /* Ensure all child elements respect container bounds */
  .searchable-chat-area * {
    max-width: 100%;
    box-sizing: border-box;
  }

  /* Hide scrollbar in some browsers for cleaner look (optional) */
  .searchable-chat-area::-webkit-scrollbar {
    width: 8px;
  }

  .searchable-chat-area::-webkit-scrollbar-track {
    background: transparent;
  }

  .searchable-chat-area::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.5);
    border-radius: 4px;
  }

  .searchable-chat-area::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.7);
  }

  @media (prefers-color-scheme: dark) {
    .searchable-chat-area::-webkit-scrollbar-thumb {
      background: rgba(75, 85, 99, 0.5);
    }

    .searchable-chat-area::-webkit-scrollbar-thumb:hover {
      background: rgba(75, 85, 99, 0.7);
    }
  }
</style>
