<!-- MessageItem.svelte - Individual message component for virtual list -->
<script>
  import { createEventDispatcher, tick, onMount } from 'svelte';
  import { marked } from 'marked';
  import { Clipboard, GitBranch, Edit2, Trash2, Check, X, Type, MousePointer2, MessageSquare, Info, RotateCcw, ChevronsLeft, ChevronsRight } from 'lucide-svelte';
  import { getAIName, getAIAvatar, getAIInfo } from '$lib/config/aiAvatars.js';
  import FeedbackButtons from './FeedbackButtons.svelte';

  export let message;
  export let index;
  export let currentBranch = null;
  export let currentBranchId = 'main';
  export let messageBranchCounts = {};
  export let userPreferences = { display_name: null };
  export let current = null;

  // Height measurement
  export let onHeightChange = null;
  let messageElement;
  let lastMeasuredHeight = 0;

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
  });

  // Re-measure when message content changes
  $: if (message && messageElement) {
    tick().then(measureHeight);
  }

  $: branchColor = getBranchColor(currentBranch);
  $: messageBranchCount = messageBranchCounts[message.id] || 0;
</script>

<div class="{message.role === 'user' ? 'max-w-[90%] sm:max-w-2xl ml-auto mr-2 sm:mr-4' : 'max-w-[95%] sm:max-w-4xl group'}" bind:this={messageElement}>
  <div class="text-sm sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1 {message.role === 'user' ? 'text-right' : 'flex items-center gap-3 sm:gap-3'}">
    {#if message.role === 'user'}
      <span class="text-sm sm:text-sm font-bold">{userPreferences.display_name || 'You'}</span>
    {:else}
      {#if message.model_key}
        <div class="w-12 h-12 sm:w-8 sm:h-8 -mb-2 sm:-mb-2 z-10 rounded-full bg-white dark:bg-white shadow-sm border-2 flex items-center justify-center p-0.5 sm:p-1 flex-shrink-0" style="border-color: var(--color-accent);">
          <img src={getAIAvatar(message.model_key)} alt="Wiskr Avatar" class="w-full h-full rounded-full" />
        </div>
        <span class="text-base sm:text-sm font-bold text-zinc-700 dark:text-zinc-300 min-w-0">{getAIName(message.model_key)}</span>
      {:else}
        <div class="w-12 h-12 sm:w-8 sm:h-8 -mb-2 sm:-mb-2 z-10 rounded-full bg-white dark:bg-white shadow-sm border-2 flex items-center justify-center p-0.5 sm:p-1 flex-shrink-0" style="border-color: var(--color-accent);">
          <img src="/avatars/default-ai.png" alt="Wiskr Avatar" class="w-full h-full rounded-full" />
        </div>
        <span class="text-base sm:text-sm font-bold text-zinc-700 dark:text-zinc-300 min-w-0">Wiskr</span>
      {/if}
    {/if}
  </div>
  
  <div class="rounded-lg p-2 sm:p-3 border border-l-4 transition-colors relative {message.role === 'user' ? `ml-3 sm:ml-6 whitespace-pre-wrap ${branchColor.accent}` : `mr-3 sm:mr-6 assistant-message ${branchColor.accent}`}" 
       style="background-color: {message.role === 'user' ? 'var(--bg-message-user)' : 'var(--bg-message-assistant)'}; border-color: {message.role === 'user' ? 'var(--color-accent)' : '#4a4a52'}; border-left-color: {message.role === 'user' ? 'var(--color-accent)' : '#5D60DD'}; box-shadow: {message.role === 'user' ? '0 0 0 1px var(--color-accent-light)' : '-2px 0 8px rgba(93, 96, 221, 0.15)'}; color: var(--text-primary);">
    
    {#if message.role === 'assistant'}
      <div class="prose prose-xs sm:prose-sm max-w-none prose-gray dark:prose-invert">
        {@html renderMarkdown(message.content)}
      </div>
      
      <!-- Select All button for assistant messages (bottom right) -->
      <button
        class="absolute bottom-1 sm:bottom-2 right-1 sm:right-2 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity border border-gray-300 dark:border-gray-600 rounded px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 shadow-sm touch-action-manipulation" 
        style="background-color: var(--bg-button-secondary); touch-action: manipulation;" 
        on:mouseenter={(e) => e.target.style.backgroundColor = 'var(--bg-button-secondary-hover)'} 
        on:mouseleave={(e) => e.target.style.backgroundColor = 'var(--bg-button-secondary)'}
        on:click={() => selectAllMessage(index)}
        title="Select all and format for posts"
      >
        <MousePointer2 size="10" class="inline mr-0.5 sm:mr-1" />
        <span class="hidden xs:inline">Select All</span>
        <span class="xs:hidden">Select</span>
      </button>
    {:else}
      <div class="text-xs sm:text-sm">
        {message.content}
      </div>
    {/if}
  </div>
  
  <div class="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center {message.role === 'user' ? '' : 'mr-3 sm:mr-6'} mt-2 gap-2">
    <!-- Highlight-to-add feature hint (only for assistant messages) -->
    {#if message.role === 'assistant' && message.content.trim()}
      <div class="hidden sm:flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 italic">
        <Type size="14" class="flex-shrink-0" />
        <span class="hidden sm:inline">Highlight to capture/format</span>
        <span class="sm:hidden">Highlight to capture</span>
      </div>
    {/if}
    
    <div class="flex flex-wrap gap-1 sm:gap-2 justify-end sm:justify-end ml-auto sm:ml-auto">
      {#if message.role === 'assistant' && message.content.trim()}
        <!-- Feedback Buttons -->  
        <div class="">
          <FeedbackButtons
            messageId={message.id}
            projectId={current?.id}
            messageContent={message.content}
            aiName={message.model_key ? getAIName(message.model_key) : 'Wiskr'}
            size="sm"
          />
        </div>
      {/if}
      
      {#if message.content.trim() && currentBranchId === 'main'}
        <div class="z-10">
          <button id="branch-button-{index}"
            class="flex items-center gap-1 text-xs sm:text-sm px-2 py-1 rounded border transition-colors relative h-8 touch-action-manipulation"
            style="background: var(--color-accent); border-color: var(--color-accent); touch-action: manipulation;"
            on:mouseenter={(e) => { e.target.style.backgroundColor = 'var(--color-accent-hover)'; }}
            on:mouseleave={(e) => { e.target.style.backgroundColor = 'var(--color-accent)'; e.target.style.color = 'var(--text-primary)'; }}
            on:click={() => openBranchModal(index)}
            title="Create new branch from here"
          >
            <GitBranch size="14" class="flex-shrink-0" />
            Branch
            {#if messageBranchCount > 0}
              <span class="text-white text-xs rounded-full px-1.5 py-0.5 min-w-[16px] h-4 flex items-center justify-center leading-none ml-1" style="background-color: var(--color-accent);">
                {messageBranchCount}
              </span>
            {/if}
          </button>
        </div>
      {/if}
      
      {#if message.role === 'assistant' && message.content.trim()}
        <div class="z-10">
          <button
            class="flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors text-white font-medium shadow-sm hover:shadow-md h-8 touch-action-manipulation"
            style="background-color: #5D60DD; border-color: #5D60DD; touch-action: manipulation;"
            on:mouseenter={(e) => { e.target.style.backgroundColor = '#4B4BC7'; e.target.style.borderColor = '#4B4BC7'; }}
            on:mouseleave={(e) => { e.target.style.backgroundColor = '#5D60DD'; e.target.style.borderColor = '#5D60DD'; }}
            on:click={(e) => openMrWiskrForMessage(index, e)}
            title="Ask Mr Wiskr for help with this response"
          >
            <img src="/mr-wiskr-emoji.png" alt="Mr Wiskr" class="w-4 h-4 sm:w-7 sm:h-7 flex-shrink-0" />
            <span class="hidden xs:inline">Mr&nbsp;Wiskr</span>
            <span class="xs:hidden">Wiskr</span>
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>
