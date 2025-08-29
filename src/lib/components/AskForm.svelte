<script>
  import { createEventDispatcher } from 'svelte';
  import { RotateCcw, X, ChevronsRight } from 'lucide-svelte';
  import InfoPopup from './InfoPopup.svelte';
  import ModelDropdown from './ModelDropdown.svelte';
  import SayLessButton from './SayLessButton.svelte';
  
  // Props
  export let current = null;
  export let input = '';
  export let modelKey = 'speed';
  export let availableModels = [];
  export let hasLastUserMessage = false;
  export let isMobile = false;
  
  const dispatch = createEventDispatcher();
  
  function send() {
    if (!current || !input.trim()) return;
    dispatch('submit', { message: input.trim() });
  }
  
  function handleKeydown(event) {
    // Submit on Enter (without Shift), allow Shift+Enter for new lines
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  }
  
  function reAskLastQuestion() {
    dispatch('reask');
  }
  
  function handleSayLessClick() {
    dispatch('sayless');
  }
</script>
<!-- Fixed Ask Form at Bottom -->
  <div class="flex-shrink-0" style="background-color: var(--bg-ask-form);">
    
    <!-- Ask Form -->
    <div class="border-t border-gray-200 dark:border-gray-700">
      <!-- Top Row: Friend Selection and ReAsk -->
      <div class="px-2 sm:px-3 pt-2 pb-1">
        <!-- First row: Model selector -->
        <div class="flex items-center justify-between pb-2">
          <div class="{isMobile ? 'flex flex-col gap-1' : 'flex items-center gap-1 sm:gap-2'} min-w-0">
            <label for="model-select" class="text-xs text-zinc-500 dark:text-zinc-400 flex-shrink-0">Wiskr:</label>
            <div class="{isMobile ? 'w-full' : 'flex-1'}">
              <ModelDropdown
                bind:modelKey
                {availableModels}
                disabled={!current}
                on:change={(e) => { modelKey = e.detail.value; }}
              />
            </div>
            {#if !isMobile}
              <InfoPopup
                title="Da heck is a Wiskr?"
                content={`<p>Smart friends who get rewarded to do various tasks for you:</p><br />
                  <ul>
                    <li><strong>🚀 Speedy</strong> - Quick paws, light on kibble. Handles small tasks with ease.</li>
                    <li><strong>⭐ Quality</strong> - Sharper whiskers, stronger mind. Suited for tangled problems.</li>
                    <li><strong>👑 Premium</strong> - Full prowl power. Best for tough hunts and deep thinking.</li>
                    <li><strong>💰 Micro</strong> - Streamlined swipes. Perfect for neat, simple text tasks.</li>
                  </ul>
                  <br />
                  <p>Each Wiskr has a different rewards for doing their tasks:</p>
                  <ul>
                    <li><strong>You talking to them</strong> - Cost for your questions (yes they are elitists)</li>
                    <li><strong>Them talking to you</strong> - Cost for their insights and number crunching</li>
                  </ul><br />
                  <p>Speedy Wiskrs work great for most conversations!</p>`}
                buttonTitle="Learn about Wiskrs"
              />
            {/if}
          </div>
          
          <!-- Action buttons -->
          <div class="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {#if input.trim()}
              <SayLessButton
                on:sayless={handleSayLessClick}
                disabled={!current || !input.trim()}
                size="sm"
              />
            {/if}
            
            <!-- ReAsk Button (always visible when there's a last message) -->
            {#if hasLastUserMessage}
              <button
                class="flex items-center gap-0.5 sm:gap-1 text-xs {isMobile ? 'px-1.5 py-1.5' : 'px-2 sm:px-3 py-1.5'} rounded border transition-colors font-medium touch-action-manipulation bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600" 
                style="touch-action: manipulation;"
                on:click={reAskLastQuestion}
                disabled={!current}
                title="Try your last question again"
              >
                <RotateCcw size={isMobile ? "16" : "12"} class="sm:hidden" />
                <RotateCcw size="14" class="hidden sm:inline" />
                {#if !isMobile}
                  <span class="xs:inline">ReAsk</span>
                {/if}
              </button>
            {/if}
          </div>
        </div>
      </div>
      
      <!-- Box and Send -->
      <form class="px-2 sm:px-3 pb-2 sm:pb-3 flex gap-2 {isMobile ? 'items-center justify-center' : 'items-center'}" on:submit|preventDefault={send}>
        <div class="relative {isMobile ? 'flex-1' : 'w-full'}">
          <textarea id="ask-box" class="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded p-2 sm:p-3 pr-8 w-full resize-none text-sm sm:text-base min-h-[var(--input-height-mobile)] sm:min-h-[var(--input-height)]" 
          rows="2" 
          bind:value={input} 
          placeholder={current ? "Ask…" : "Pick a project"} 
          disabled={!current} on:keydown={handleKeydown} 
          style="touch-action: manipulation;"></textarea>
          {#if input.trim()}
            <button
              type="button"
              class="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1 touch-action-manipulation"
              style="touch-action: manipulation;"
              on:click={() => input = ''}
              title="Clear box"
            >
              <X size="16" class="sm:hidden" />
              <X size="20" class="hidden sm:inline" />
            </button>
          {/if}
        </div>
        <button class="border border-gray-300 dark:border-gray-600 rounded pl-1 pr-2 sm:pl-1.5 sm:pr-2 py-2 sm:py-3 transition-colors flex-shrink-0 min-h-[var(--input-height-mobile)] sm:min-h-[var(--input-height)] touch-action-manipulation" type="submit" disabled={!current || !input.trim()} 
        style="background-color: var(--color-accent); color: var(--color-accent-text);" 
        on:mouseenter={(e) => e.target.style.backgroundColor = 'var(--color-accent-hover)'} 
        on:mouseleave={(e) => e.target.style.backgroundColor = 'var(--color-accent)'}
        >
          <div class="flex flex-col items-center justify-center text-xs sm:text-sm leading-tight">
            {#if isMobile}
              <span class="font-medium"><ChevronsRight size="24" /></span>
            {:else}
              <!-- <ChevronsRight size="16" class="sm:hidden mb-0.5" /> -->
              <!-- <ChevronsRight size="20" class="hidden sm:inline mb-1" /> -->
              <span class="font-medium"><ChevronsRight size="24" /></span>
              <!-- <ChevronsLeft size="16" class="sm:hidden mt-0.5" /> -->
              <!-- <ChevronsLeft size="20" class="hidden sm:inline mt-1" /> -->
            {/if}
          </div>
        </button>
      </form>
    </div>
  </div>