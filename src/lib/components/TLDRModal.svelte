<script>
  import { createEventDispatcher } from 'svelte';
  import { X, Copy, Replace, RotateCcw, Loader2, MessageSquare } from 'lucide-svelte';

  export let visible = false;
  export let originalText = '';
  export let projectContext = null;
  export let fieldType = 'general'; // 'project-description', 'fact', 'doc', 'question', 'ask-prompt'

  const dispatch = createEventDispatcher();

  let isProcessing = false;
  let tldrText = '';
  let error = '';
  let copied = false;

  // Reset state when modal opens
  $: if (visible && originalText) {
    generateTLDR();
  }

  // Reset state when modal closes
  $: if (!visible) {
    resetState();
  }

  function resetState() {
    isProcessing = false;
    tldrText = '';
    error = '';
    copied = false;
  }

  async function generateTLDR() {
    if (!originalText.trim()) return;

    isProcessing = true;
    error = '';
    tldrText = '';

    try {
      const response = await fetch('/api/tldr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: originalText,
          projectContext,
          fieldType
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to generate TL;DR');
      }

      const data = await response.json();
      tldrText = data.tldr;
    } catch (err) {
      console.error('TL;DR generation error:', err);
      error = 'Failed to generate TL;DR. Please try again.';
    } finally {
      isProcessing = false;
    }
  }

  function close() {
    visible = false;
    dispatch('close');
  }

  function replace() {
    dispatch('replace', { newText: tldrText });
    close();
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(tldrText);
      copied = true;
      setTimeout(() => copied = false, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  function regenerate() {
    generateTLDR();
  }

  // Close on escape key
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      close();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if visible}
  <!-- Modal Backdrop -->
  <div 
    class="fixed inset-0 -blur-sm z-[60] flex items-center justify-center p-4"
    style="background-color: rgba(0, 0, 0, 0.3);"
    on:click|self={close}
    role="dialog"
    aria-modal="true"
    aria-labelledby="tldr-modal-title"
  >
    <!-- Modal Content -->
    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" style="background-color: var(--bg-primary);">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 id="tldr-modal-title" class="text-xl font-bold text-gray-900 dark:text-gray-100">TL;DR - Make It Concise</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Generate a concise, meaningful summary without the fluff</p>
        </div>
        <button
          on:click={close}
          class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close TL;DR modal"
        >
          <X size="24" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <!-- Original Text -->
        <div>
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Original Text:</h3>
          <div class="bg-gray-50 dark:bg-gray-900 rounded-md p-3 border border-gray-200 dark:border-gray-700 max-h-40 overflow-y-auto">
            <div class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{originalText}</div>
          </div>
        </div>

        <!-- TL;DR Result -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">TL;DR Version:</h3>
            {#if tldrText && !isProcessing}
              <button
                on:click={regenerate}
                class="flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors"
                style="color: var(--color-accent); border-color: var(--color-accent-light);"
                on:mouseenter={(e) => { e.target.style.backgroundColor = 'var(--color-accent-light)'; }}
                on:mouseleave={(e) => { e.target.style.backgroundColor = ''; }}
                title="Generate a different TL;DR version"
              >
                <RotateCcw size="12" />
                Regenerate
              </button>
            {/if}
          </div>
          
          <div class="bg-blue-50 dark:bg-blue-900/20 rounded-md p-3 border border-blue-200 dark:border-blue-800 min-h-[100px] flex items-center justify-center">
            {#if isProcessing}
              <div class="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                <Loader2 size="20" class="animate-spin" />
                <span class="text-sm">Generating concise version...</span>
              </div>
            {:else if error}
              <div class="text-center">
                <p class="text-red-600 dark:text-red-400 text-sm mb-2">{error}</p>
                <button
                  on:click={regenerate}
                  class="text-xs px-3 py-1 rounded border transition-colors"
                  style="color: var(--color-accent); border-color: var(--color-accent);"
                  on:mouseenter={(e) => { e.target.style.backgroundColor = 'var(--color-accent-light)'; }}
                  on:mouseleave={(e) => { e.target.style.backgroundColor = ''; }}
                >
                  Try Again
                </button>
              </div>
            {:else if tldrText}
              <div class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap w-full">{tldrText}</div>
            {/if}
          </div>
        </div>

        <!-- Stats (when available) -->
        {#if tldrText && originalText}
          <div class="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded p-2">
            <span>Original: {originalText.length} characters</span>
            <span>TL;DR: {tldrText.length} characters</span>
            <span class="font-medium" style="color: var(--color-accent);">
              {Math.round(((originalText.length - tldrText.length) / originalText.length) * 100)}% shorter
            </span>
          </div>
        {/if}
      </div>

      <!-- Footer Actions -->
      <div class="flex items-center justify-between p-4 pt-2 border-t border-gray-200 dark:border-gray-700">
        <div class="text-xs text-gray-500 dark:text-gray-400">
          💡 <strong>Tip:</strong> Review the TL;DR version to ensure it captures your key points
        </div>
        
        <div class="flex items-center gap-2">
          <button
            on:click={close}
            class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          
          {#if tldrText}
            <button
              on:click={copyToClipboard}
              class="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg transition-colors text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              class:bg-green-50={copied}
              class:dark:bg-green-900={copied}
              class:border-green-300={copied}
              class:dark:border-green-700={copied}
            >
              <Copy size="16" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            
            <button
              on:click={replace}
              class="flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors hover:bg-opacity-90" 
              style="background-color: var(--color-accent); color: var(--color-accent-text);"
              on:mouseenter={(e) => e.target.style.backgroundColor = 'var(--color-accent-hover)'}
              on:mouseleave={(e) => e.target.style.backgroundColor = 'var(--color-accent)'}
            >
              <Replace size="16" />
              Replace Original
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
