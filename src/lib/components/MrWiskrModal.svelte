<script>
  import { createEventDispatcher } from 'svelte';
  import { X, Send } from 'lucide-svelte';
  import { getAIName } from '$lib/config/aiAvatars.js';

  export let showModal = false;
  export let loading = false;
  
  const dispatch = createEventDispatcher();
  let mrWiskrInput = '';
  let response = '';
  let showResponse = false;
  
  function close() {
    showModal = false;
    mrWiskrInput = '';
    response = '';
    showResponse = false;
    dispatch('close');
  }
  
  function handleKeydown(event) {
    // Submit on Enter (without Shift), allow Shift+Enter for new lines
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      askMrWiskr();
    }
  }
  
  async function askMrWiskr() {
    if (!mrWiskrInput.trim() || loading) return;
    
    const question = mrWiskrInput.trim();
    mrWiskrInput = '';
    showResponse = true;
    
    dispatch('ask', { question });
  }
  
  // Set response from parent
  export function setResponse(newResponse) {
    response = newResponse;
  }
  
  // Focus input when modal opens
  $: if (showModal) {
    setTimeout(() => {
      const input = document.getElementById('mr-wiskr-input');
      if (input) input.focus();
    }, 100);
  }
</script>

{#if showModal}
  <div class="fixed inset-0 backdrop-blur-sm bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col" style="background-color: var(--bg-modal);">
      
      <!-- Header with close button -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <!-- <span class="text-xl">🧙‍♂️</span> -->
          Ask Mr Wiskr
        </h3>
        <button 
          class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          on:click={close}
          title="Close"
        >
          <X size="20" />
        </button>
      </div>
      
      <!-- Mr Wiskr's greeting with image -->
      <div class="p-6">
        <!-- Flexbox container for image and text -->
        <div class="flex items-start gap-4">
          <!-- Black Cat Avatar -->
          <img src="mr-wiskr.png" alt="Mr Wiskr" class="w-20 h-20 flex-shrink-0" />
          
          <!-- Text content -->
          <div class="flex-1">
            <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
              <strong>Mello!</strong> 🐱 I'm Mr. Wiskr, your helpful AI assistant! 
              I can help you with bugs, feature questions, or when other AI assistants like 
              {getAIName('claude-3-5-sonnet')} or {getAIName('gpt-4o')} get a bit complex. What can I help you with today?
            </p>
          </div>
        </div>
      </div>
      
      <!-- Response area -->
      {#if showResponse}
        <div class="px-6 pb-4">
          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-32 overflow-y-auto">
            {#if loading}
              <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <div class="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                <div class="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                <div class="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                <span class="text-sm">Mr Wiskr is thinking...</span>
              </div>
            {:else if response}
              <div class="prose prose-sm max-w-none text-gray-900 dark:text-gray-100">
                {@html response.replace(/\n/g, '<br>')}
              </div>
            {/if}
          </div>
        </div>
      {/if}
      
      <!-- Ask form -->
      <div class="border-t border-gray-200 dark:border-gray-700 p-4">
        <form class="flex gap-2 items-end" on:submit|preventDefault={askMrWiskr}>
          <div class="relative flex-1">
            <textarea 
              id="mr-wiskr-input"
              class="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-3 pr-10 w-full resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
              rows="2" 
              bind:value={mrWiskrInput} 
              placeholder="Ask Mr Wiskr anything..."
              disabled={loading}
              on:keydown={handleKeydown}
            ></textarea>
            
            {#if mrWiskrInput.trim()}
              <button
                type="button"
                class="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1"
                on:click={() => mrWiskrInput = ''}
                title="Clear input"
              >
                <X size="16" />
              </button>
            {/if}
          </div>
          
          <button 
            class="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg px-4 py-2 mb-6 flex items-center gap-2 transition-colors font-medium disabled:cursor-not-allowed" 
            type="submit" 
            disabled={loading || !mrWiskrInput.trim()}
            title="Ask Mr Wiskr"
          >
            <Send size="16" />
            <span class="hidden sm:inline">Ask</span>
          </button>
        </form>
        
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes twinkle {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
  }
  
  .animate-twinkle {
    animation: twinkle 2s ease-in-out infinite;
  }
</style>
