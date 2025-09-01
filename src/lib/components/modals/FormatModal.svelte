<script>
  import { createEventDispatcher } from 'svelte';
  import { marked } from 'marked';
  import { X, Music, Camera, Video, ShoppingBag, MessageCircle, Briefcase, Shirt, MapPin, Users, MessageSquare, FileText, Hash, Clipboard } from 'lucide-svelte';

  export let showFormatModal = false;
  export let selectedText = '';
  export let selectedPlatform = '';
  export let formattedContent = '';
  export let isFormatting = false;

  const dispatch = createEventDispatcher();

  // Configure marked for better rendering
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  // Platform definitions with Lucide icons and type
  const platforms = [
    { id: 'tiktok', name: 'TikTok', icon: 'Music', type: 'Social' },
    { id: 'instagram', name: 'Instagram', icon: 'Camera', type: 'Social' },
    { id: 'youtube', name: 'YouTube', icon: 'Video', type: 'Social' },
    { id: 'facebook', name: 'Facebook', icon: 'Users', type: 'Social' },
    { id: 'twitter', name: 'Twitter', icon: 'MessageCircle', type: 'Social' },
    { id: 'reddit', name: 'Reddit', icon: 'MessageSquare', type: 'Social' },
    { id: 'linkedin', name: 'LinkedIn', icon: 'Briefcase', type: 'Professional' },
    { id: 'pinterest', name: 'Pinterest', icon: 'MapPin', type: 'Discovery' },
    { id: 'etsy', name: 'Etsy', icon: 'ShoppingBag', type: 'E-commerce' },
    { id: 'teepublic', name: 'TeePublic', icon: 'Shirt', type: 'E-commerce' },
    { id: 'plaintext', name: 'Plain Text', icon: 'FileText', type: 'Text' },
    { id: 'markdown', name: 'Markdown', icon: 'Hash', type: 'Text' },
  ];

  // Group platforms by type
  const platformTypes = Array.from(new Set(platforms.map(p => p.type)));
  const platformsByType = platformTypes.map(type => ({
    type,
    items: platforms.filter(p => p.type === type)
  }));

  // Icon component mapping
  const iconComponents = {
    Music,
    Camera,
    Video,
    ShoppingBag,
    MessageCircle,
    Briefcase,
    Shirt,
    MapPin,
    Users,
    MessageSquare,
    FileText,
    Hash,
    Clipboard
  };

  function renderMarkdown(content) {
    if (!content || typeof content !== 'string') return '';
    return marked(content);
  }

  function closeModal() {
    dispatch('close');
  }

  function formatForPlatform(platform) {
    dispatch('format', platform);
  }

  function copyToClipboard() {
    dispatch('copy', formattedContent);
  }
</script>

{#if showFormatModal}
  <div class="fixed inset-0 backdrop-blur-sm bg-black  flex items-center justify-center p-4 z-[99999]">
    <div class="rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden" style="background-color: var(--bg-modal);">
      <!-- Modal Header -->
      <div class="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Format for Socials</h3>
        <button
          class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
          on:click={closeModal}
          title="Close"
        >
          <X size="24" />
        </button>
      </div>
      
      <!-- Modal Content -->
      <div class="p-6 overflow-y-auto max-h-[70vh]">
        <!-- Editable Text Area -->
        <div class="mb-6">
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content to Format:</h4>
          <textarea
            bind:value={selectedText}
            class="w-full h-32 p-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter text to format..."
          ></textarea>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">You can edit this text before formatting it for different platforms.</p>
        </div>
        
        <!-- Platform Grid Organized by Type -->
        <div class="mb-6">
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Choose Platform:</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {#each platformsByType as group}
              <div>
                <h5 class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">{group.type}</h5>
                <div class="flex flex-wrap gap-2">
                  {#each group.items as platform}
                    <button
                      class="flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors cursor-pointer {selectedPlatform === platform.id ? 'bg-blue-50 dark:bg-blue-800/30 border-blue-200 dark:border-blue-700' : 'border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-800/30 hover:border-blue-200 dark:hover:border-blue-700'}"
                      on:click={() => formatForPlatform(platform.id)}
                      disabled={isFormatting}
                    >
                      <svelte:component this={iconComponents[platform.icon]} size={16} class="text-gray-600 dark:text-gray-400" />
                      <span class="text-xs font-medium text-gray-700 dark:text-gray-300">{platform.name}</span>
                    </button>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </div>
        
        <!-- Formatted Content -->
        {#if selectedPlatform}
          <div class="mb-4">
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
                Formatted for {platforms.find(p => p.id === selectedPlatform)?.name}:
              </h4>
              {#if formattedContent && !isFormatting}
                <button
                  class="flex items-center gap-1 text-sm rounded hover:bg-blue-700 transition-colors cursor-pointer px-3 py-1" 
                  style="background-color: var(--color-accent); color: var(--color-accent-text);"
                  on:click={copyToClipboard}
                >
                  <svelte:component this={iconComponents['Clipboard']} size={12} />
                  Copy
                </button>
              {/if}
            </div>
            
            <div class="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 min-h-[120px]">
              {#if isFormatting}
                <div class="flex items-center justify-center py-8">
                  <div class="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <div class="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500"></div>
                    Formatting content...
                  </div>
                </div>
              {:else if formattedContent}
                <div class="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{formattedContent}</div>
              {:else}
                <div class="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                  Select a platform to format this content
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
      
      <!-- Modal Footer -->
      <div class="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-2">
        <button
          class="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          on:click={closeModal}
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}
