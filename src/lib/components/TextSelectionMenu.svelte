<!-- src/lib/components/TextSelectionMenu.svelte -->
<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { Plus, BrushCleaning } from 'lucide-svelte';

  export const projectId = null;

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

  function handleSelectionChange() {
    if (!browser || typeof window === 'undefined') return;
    
    const sel = window.getSelection();
    const text = sel.toString().trim();
    
    // If selection is cleared, hide menu
    if (!text) {
      hideMenu();
    }
  }

  function handleClick(event) {
    // Hide menu if clicking outside of it
    if (menuVisible && !event.target.closest('.selection-menu')) {
      // Small delay to prevent immediate hiding when menu is first shown
      setTimeout(() => {
        if (menuVisible) {
          hideMenu();
        }
      }, 10);
    }
  }

  function hideMenu() {
    menuVisible = false;
    selectedText = '';
    selection = null;
  }

  function addAsCard() {
    console.log('🎯 TextSelectionMenu addAsCard called with selectedText:', selectedText);
    if (selectedText) {
      console.log('🎯 Dispatching add-as-card event with text:', selectedText);
      dispatch('add-as-card', { text: selectedText });
      hideMenu();
    } else {
      console.log('🎯 No selected text available');
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
      document.addEventListener('selectionchange', handleSelectionChange);
    }
  });

  onDestroy(() => {
    if (browser && typeof document !== 'undefined') {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('selectionchange', handleSelectionChange);
    }
  });
</script>

{#if menuVisible && selectedText}
  <div 
    class="selection-menu fixed z-[9999] bg-blue-500 dark:bg-blue-600 border border-blue-400 dark:border-blue-500 rounded-md shadow-lg py-0.5 min-w-[130px]"
    style="left: {menuX}px; top: {menuY}px;"
    on:click|stopPropagation
  >
    <button
      class="w-full flex items-center gap-2 px-2 py-1 text-sm text-white hover:bg-blue-400 dark:hover:bg-blue-500 transition-colors text-left cursor-pointer"
      on:click={addAsCard}
    >
      <Plus size="16" />
      <span>Add as Card</span>
    </button>
    <button
      class="w-full flex items-center gap-2 px-2 py-1 text-sm text-white hover:bg-blue-400 dark:hover:bg-blue-500 transition-colors text-left cursor-pointer"
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
