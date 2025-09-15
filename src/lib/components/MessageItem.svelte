<!-- MessageItem.svelte - Individual message component for virtual list -->
<script>
  import { createEventDispatcher, tick, onMount } from 'svelte';
  import { marked } from 'marked';
  import { Clipboard, GitBranch, Edit2, Trash2, Check, X, Type, MousePointer2, MessageSquare, Info, RotateCcw, ChevronsLeft, ChevronsRight, User } from 'lucide-svelte';
  import { getAIName, getAIAvatar, getAIInfo } from '$lib/config/aiAvatars.js';
  import { getUserAvatarUrl } from '$lib/utils/avatars.js';
  import FeedbackButtons from './FeedbackButtons.svelte';
  import LoadingSpinner from './LoadingSpinner.svelte';

  export let message;
  export let index;
  export let currentBranch = null;
  export let currentBranchId = 'main';
  export let messageBranchCounts = {};
  export let userPreferences = { display_name: null };
  export let current = null;
  export let searchTerm = ''; // Search term for highlighting

  // Clean message content to remove any [DONE] markers that might have been stored
  $: cleanedContent = message?.content?.replace(/\[DONE\]/g, '').trim() || '';

  // Height measurement
  export let onHeightChange = null;
  let messageElement;
  let lastMeasuredHeight = 0;
  
  // Dynamic width based on chat column width
  let isWideChat = false;
  
  // Check if chat column is wider than 1000px
  function checkChatWidth() {
    if (typeof window !== 'undefined' && messageElement) {
      const chatColumn = messageElement.closest('.flex-1'); // Find the main chat area
      if (chatColumn) {
        isWideChat = chatColumn.offsetWidth > 1000;
      }
    }
  }

  const dispatch = createEventDispatcher();

  // Configure marked for better rendering
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  // Rainbow colors for branches - match ChatInterface exactly
  const RAINBOW_COLORS = [
    { bg: 'bg-white', border: 'border-gray-200', accent: 'border-l-gray-300', name: 'Main' },
    { bg: 'bg-red-50', border: 'border-red-200', accent: 'border-l-red-400', name: 'Red' },
    { bg: 'bg-orange-50', border: 'border-orange-200', accent: 'border-l-orange-400', name: 'Orange' },
    { bg: 'bg-yellow-50', border: 'border-yellow-200', accent: 'border-l-yellow-400', name: 'Yellow' },
    { bg: 'bg-green-50', border: 'border-green-200', accent: 'border-l-green-400', name: 'Green' },
    { bg: 'bg-blue-50', border: 'border-blue-200', accent: 'border-l-blue-400', name: 'Blue' },
    { bg: 'bg-indigo-50', border: 'border-indigo-200', accent: 'border-l-indigo-400', name: 'Indigo' },
    { bg: 'bg-purple-50', border: 'border-purple-200', accent: 'border-l-purple-400', name: 'Purple' },
    { bg: 'bg-pink-50', border: 'border-pink-200', accent: 'border-l-pink-400', name: 'Pink' }
  ];

  function renderMarkdown(content) {
    if (!content || typeof content !== 'string') return '';
    return marked(content);
  }
  
  // Highlight search terms in text
  function highlightText(text, term) {
    if (!term || !text) return text;
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<span class="search-highlight" style="display: inline;">$1</span>');
  }

  function getBranchColor(branch) {
    if (!branch) return RAINBOW_COLORS[0];
    return RAINBOW_COLORS[branch.color_index % RAINBOW_COLORS.length];
  }

  function selectAllMessage(index) {
    dispatch('select-all', index);
  }

  function openBranchModal(index) {
    dispatch('open-branch-modal', index);
  }

  function openMrWiskrForMessage(index, event) {
    dispatch('open-mr-wiskr', { index, event });
  }

  // Measure height and report changes
  function measureHeight() {
    if (!messageElement) return;
    
    const height = messageElement.offsetHeight;
    if (height > 0 && height !== lastMeasuredHeight) {
      lastMeasuredHeight = height;
      if (onHeightChange) {
        onHeightChange(message.id, height);
      }
    }
  }

  // Measure on mount and when content changes
  onMount(() => {
    measureHeight();
    checkChatWidth();
    
    // Listen for resize events to update width constraint
    const resizeObserver = new ResizeObserver(() => {
      checkChatWidth();
    });
    
    if (messageElement) {
      const chatColumn = messageElement.closest('.flex-1');
      if (chatColumn) {
        resizeObserver.observe(chatColumn);
      }
    }
    
    // Cleanup resize observer
    return () => {
      resizeObserver.disconnect();
    };
  });

  // Re-measure when message content changes
  $: if (message && messageElement) {
    tick().then(() => {
      measureHeight();
      checkChatWidth();
    });
  }

  $: branchColor = getBranchColor(currentBranch);
  $: messageBranchCount = messageBranchCounts[message.id] || 0;
</script>

<div 
  class="{message.role === 'user' ? `w-full ${isWideChat ? 'max-w-[80%] mx-[5%]' : 'mr-2 sm:mr-4'} ml-auto mt-16 mb-3` : `w-full ${isWideChat ? 'max-w-[80%] mx-[5%]' : ''} group mb-3 mt-16`} relative" 
  bind:this={messageElement}
  data-message-id={message.id}
>
  
  <!-- Message Bubble -->
  <div id="message-bubble" class="rounded-lg px-2 sm:px-2 border border-l-4 transition-colors relative {message.role === 'user' ? `ml-3 sm:ml-6 whitespace-pre-wrap ${branchColor.accent} pb-6 sm:pb-6 pt-1 sm:pt-1` : `mr-3 sm:mr-6 assistant-message ${branchColor.accent} pb-5 sm:pb-5 pt-4 sm:pt-4`}"
       style="background-color: {message.role === 'user' ? 'var(--bg-message-user)' : 'var(--bg-message-assistant)'}; border-color: {message.role === 'user' ? 'var(--color-accent)' : '#4a4a52'}; border-left-color: {message.role === 'user' ? 'var(--color-accent)' : '#5D60DD'}; box-shadow: {message.role === 'user' ? '0 0 0 1px var(--color-accent-light)' : '-2px 0 8px rgba(93, 96, 221, 0.15)'}; color: var(--text-primary);">
    
    <!-- Avatar positioned absolutely over message bubble -->
    {#if message.role === 'user'}
      <div id="user-avatar" class="absolute -top-6 sm:-top-12 right-2 sm:right-3 w-16 h-16 sm:w-[56px] sm:h-[56px] z-10 rounded-lg shadow-sm border-4 flex items-center justify-center p-px sm:p-px flex-shrink-0" style="border-color: var(--color-accent); background-image: url('/avatars/users/cosmic-bg.png'); background-size: cover; background-position: center;">
        {#if userPreferences.avatar_type === 'default'}
          <User size="24" class="sm:size-9 text-gray-500 dark:text-gray-400" />
        {:else}
          <img src={getUserAvatarUrl(userPreferences)} alt="Your Avatar" class="w-full h-full rounded-md" loading="lazy" decoding="async" />
        {/if}
      </div>
      <!-- Name positioned absolutely -->
      <div id="user-name" class="absolute -top-8 sm:-top-8 right-20 sm:right-20 text-base sm:text-base font-bold text-zinc-700 dark:text-zinc-300">{userPreferences.display_name || 'You'}</div>
    {:else}
      {#if message.model_key}
        <div id="ai-avatar" class="absolute -top-3 sm:-top-12 left-2 sm:left-3 w-16 h-16 sm:w-[56px] sm:h-[56px] z-10 rounded-lg bg-white shadow-sm border-4 flex items-center justify-center p-px sm:p-px flex-shrink-0" style="border-color: #5D60DD;">
          <img src={getAIAvatar(message.model_key)} alt="Wiskr Avatar" class="w-full h-full rounded-md" fetchpriority="high" />
        </div>
        <!-- Name positioned absolutely -->
        <div id="wiskr-name" class="absolute -top-8 sm:-top-8 left-20 sm:left-20 text-base sm:text-base font-bold text-zinc-700 dark:text-zinc-300">{getAIName(message.model_key)}</div>
      {:else}
        <div id="ai-avatar" class="absolute -top-3 sm:-top-12 left-2 sm:left-3 w-16 h-16 sm:w-[56px] sm:h-[56px] z-10 rounded-lg bg-white shadow-sm border-4 flex items-center justify-center p-px sm:p-px flex-shrink-0" style="border-color: #5D60DD;">
          <img src="/avatars/default-ai.png" alt="Wiskr Avatar" class="w-full h-full rounded-md" fetchpriority="high" />
        </div>
        <!-- Name positioned absolutely -->
        <div id="wiskr-name" class="absolute -top-8 sm:-top-8 left-20 sm:left-20 text-base sm:text-base font-bold text-zinc-700 dark:text-zinc-300">Wiskr</div>
      {/if}
    {/if}
    
    {#if message.role === 'assistant'}
      {#if message.isLoading}
        <div class="flex items-center gap-3 py-2">
          <LoadingSpinner size="sm" text="AI is thinking..." showText={true} center={false} />
        </div>
      {:else}
        <div class="prose prose-sm sm:prose-base max-w-none prose-gray dark:prose-invert leading-relaxed">
          {@html highlightText(renderMarkdown(cleanedContent), searchTerm)}
        </div>
      {/if}
      
      <!-- Select All button for assistant messages (bottom right) - only show when not loading -->
      {#if !message.isLoading}
        <button
          class="absolute bottom-1 sm:bottom-2 right-1 sm:right-2 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity border border-gray-300 dark:border-gray-600 rounded px-1.5 sm:px-2 py-1 sm:py-1 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 shadow-sm touch-action-manipulation h-8 sm:h-6" 
          style="background-color: var(--bg-button-secondary); touch-action: manipulation;" 
          on:mouseenter={(e) => e.target.style.backgroundColor = 'var(--bg-button-secondary-hover)'} 
          on:mouseleave={(e) => e.target.style.backgroundColor = 'var(--bg-button-secondary)'}
          on:click={() => dispatch('select-all', index)}
          title="Select all and format for socials"
        >
          <MousePointer2 size="10" class="inline mr-0.5 sm:mr-1" />
          <span class="hidden xs:inline">Select All</span>
          <span class="xs:hidden">Select</span>
        </button>
      {/if}
    {:else}
      <div class="text-sm sm:text-base -mt-2 leading-normal">
        {@html highlightText(cleanedContent, searchTerm)}
      </div>
    {/if}
  </div>

  <div class="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center {message.role === 'user' ? '' : 'mr-3 sm:mr-6'} mt-2 gap-2">
    <!-- Highlight-to-add feature hint (only for assistant messages) -->
    {#if message.role === 'assistant' && cleanedContent.trim() && !message.isLoading}
      <div class="hidden sm:flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 italic">
        <Type size="14" class="flex-shrink-0" />
        <span class="hidden sm:inline">Click & drag to capture/format</span>
        <span class="sm:hidden">Tap & drag to capture/format</span>
      </div>
    {/if}
    
    <div class="flex flex-wrap gap-1 sm:gap-2 justify-end sm:justify-end ml-auto sm:ml-auto">
      {#if message.role === 'assistant' && cleanedContent.trim() && !message.isLoading}
        <!-- Feedback Buttons -->  
        {#if current?.id}
          <div class="">
            <FeedbackButtons
              messageId={message.id}
              projectId={current.id}
              messageContent={cleanedContent}
              aiName={message.model_key ? getAIName(message.model_key) : 'Wiskr'}
              size="sm"
            />
          </div>
        {/if}
      {/if}
      
      {#if message.role === 'assistant' && message.content.trim() && currentBranchId === 'main' && !message.isLoading}
        <div class="z-10">
          <button id="branch-button-{index}"
            class="flex items-center gap-1 text-xs sm:text-sm px-2 py-1 rounded border transition-colors relative h-10 sm:h-8 touch-action-manipulation"
            style="background: var(--color-accent); border-color: var(--color-accent); color: var(--color-accent-text); touch-action: manipulation;"
            on:mouseenter={(e) => { e.target.style.backgroundColor = 'var(--color-accent-hover)'; }}
            on:mouseleave={(e) => { e.target.style.backgroundColor = 'var(--color-accent)'; }}
            on:click={() => openBranchModal(index)}
            title="Create new branch from here"
          >
            <GitBranch size="14" class="flex-shrink-0" />
            Branch
            {#if messageBranchCount > 0}
              <span class="text-xs rounded-full px-1.5 py-0.5 min-w-[16px] h-4 flex items-center justify-center leading-none ml-1" style="background-color: var(--color-accent); color: var(--color-accent-text);">
                {messageBranchCount}
              </span>
            {/if}
          </button>
        </div>
      {/if}
      
      {#if message.role === 'assistant' && cleanedContent.trim() && !message.isLoading}
        <div class="z-10">
          <button
            class="flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors text-white font-medium shadow-sm hover:shadow-md h-10 sm:h-8 touch-action-manipulation overflow-hidden"
            style="background-color: #5D60DD; border-color: #5D60DD; touch-action: manipulation;"
            on:mouseenter={(e) => { e.target.style.backgroundColor = '#4B4BC7'; e.target.style.borderColor = '#4B4BC7'; }}
            on:mouseleave={(e) => { e.target.style.backgroundColor = '#5D60DD'; e.target.style.borderColor = '#5D60DD'; }}
            on:click={(e) => openMrWiskrForMessage(index, e)}
            title="Get help from Albert with this response"
          >
            <img src="/mr-wiskr-emoji.webp" alt="Albert" class="w-6 h-6 sm:w-6 sm:h-6 flex-shrink-0" fetchpriority="high" />
            <span class="hidden xs:inline">HALP!</span>
            <span class="xs:hidden">HALP!</span>
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>
