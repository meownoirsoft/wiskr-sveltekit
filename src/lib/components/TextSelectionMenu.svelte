<!-- src/lib/components/TextSelectionMenu.svelte -->
<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { Pin, FileText, HelpCircle, BrushCleaning, MessageCircle } from 'lucide-svelte';

  export let projectId = null;

  const dispatch = createEventDispatcher();

  let menuVisible = false;
  let menuX = 0;
  let menuY = 0;
  let selectedText = '';
  let selection = null;

  function handleMouseUp(event) {
    if (!browser || typeof window === 'undefined') return;
    
    // Small delay to ensure selection is complete
    setTimeout(() => {
      const sel = window.getSelection();
      const text = sel.toString().trim();
      
      if (text && sel.rangeCount > 0) {
        // Check if selection is within an assistant message
        const range = sel.getRangeAt(0);
        const assistantMessage = range.commonAncestorContainer.closest ? 
          range.commonAncestorContainer.closest('.assistant-message') :
          range.commonAncestorContainer.parentElement?.closest('.assistant-message');
        
        if (assistantMessage && text.length > 3) {
          selectedText = text;
          selection = sel;
          
          // Position menu near the end of selection
          const rect = range.getBoundingClientRect();
          menuX = Math.min(rect.right + 10, window.innerWidth - 200);
          menuY = Math.max(rect.top - 10, 10);
          
          menuVisible = true;
        } else {
          hideMenu();
        }
      } else {
        hideMenu();
      }
    }, 10);
  }

  function handleClick(event) {
    // Hide menu if clicking outside of it
    if (!event.target.closest('.selection-menu')) {
      hideMenu();
    }
  }

  function hideMenu() {
    menuVisible = false;
    selectedText = '';
    selection = null;
  }

  function addToFacts() {
    if (selectedText) {
      dispatch('add-to-facts', { text: selectedText });
      hideMenu();
    }
  }

  function addToDocs() {
    if (selectedText) {
      dispatch('add-to-docs', { text: selectedText });
      hideMenu();
    }
  }

  function addToQuestions() {
    if (selectedText) {
      dispatch('add-to-questions', { text: selectedText });
      hideMenu();
    }
  }

  function formatText() {
    if (selectedText) {
      dispatch('format-text', { text: selectedText });
      hideMenu();
    }
  }


  onMount(() => {
    if (browser) {
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('click', handleClick);
    }
  });

  onDestroy(() => {
    if (browser && typeof document !== 'undefined') {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('click', handleClick);
    }
  });
</script>

{#if menuVisible && selectedText}
  <div 
    class="selection-menu fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg py-0.5 min-w-[130px]"
    style="left: {menuX}px; top: {menuY}px;"
  >
    <button
      class="w-full flex items-center gap-2 px-2 py-1 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left cursor-pointer"
      on:click={addToFacts}
    >
      <Pin size="16" />
      <span>Add to Facts</span>
    </button>
    <button
      class="w-full flex items-center gap-2 px-2 py-1 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left cursor-pointer"
      on:click={addToDocs}
    >
      <FileText size="16" />
      <span>Add to Docs</span>
    </button>
    <button
      class="w-full flex items-center gap-2 px-2 py-1 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left cursor-pointer"
      on:click={addToQuestions}
    >
      <HelpCircle size="16" />
      <span>Add to Next Questions</span>
    </button>
    <button
      class="w-full flex items-center gap-2 px-2 py-1 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left cursor-pointer"
      on:click={formatText}
    >
      <BrushCleaning size="16" />
      <span>Format for Socials</span>
    </button>
  </div>
{/if}

<style>
  .selection-menu {
    animation: fadeInScale 0.15s ease-out;
  }
  
  @keyframes fadeInScale {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
