<!-- src/lib/components/LoadingSpinner.svelte -->
<script>
  import { RefreshCw } from 'lucide-svelte';
  
  export let size = 'md'; // 'sm', 'md', 'lg', 'xl'
  export let text = 'Loading...';
  export let showText = true;
  export let center = true;
  export let overlay = false; // If true, shows as an overlay
  export let backgroundColor = 'var(--bg-primary)'; // For overlay mode
  export let spinnerColor = 'var(--color-accent)';
  export let textColor = 'var(--text-primary)';
  
  // Size mappings
  const sizeMap = {
    sm: { icon: 16, text: 'text-sm', padding: 'p-2' },
    md: { icon: 20, text: 'text-base', padding: 'p-4' },
    lg: { icon: 24, text: 'text-lg', padding: 'p-6' },
    xl: { icon: 32, text: 'text-xl', padding: 'p-8' }
  };
  
  $: sizeConfig = sizeMap[size] || sizeMap.md;
</script>

{#if overlay}
  <!-- Overlay Mode -->
  <div 
    class="absolute inset-0 flex items-center justify-center z-[99999] rounded transition-opacity duration-200"
    style="background: {backgroundColor}; backdrop-filter: blur(4px);"
  >
    <div class="text-center {sizeConfig.padding}">
      <RefreshCw 
        size={sizeConfig.icon} 
        class="animate-spin mx-auto {showText ? 'mb-3' : ''}" 
        style="color: {spinnerColor};" 
      />
      {#if showText}
        <div class="{sizeConfig.text} font-medium" style="color: {textColor};">{text}</div>
      {/if}
    </div>
  </div>
{:else}
  <!-- Inline Mode -->
  <div class="flex {center ? 'justify-center' : ''} items-center gap-3 {sizeConfig.padding}">
    <RefreshCw 
      size={sizeConfig.icon} 
      class="animate-spin" 
      style="color: {spinnerColor};" 
    />
    {#if showText}
      <div class="{sizeConfig.text} font-medium" style="color: {textColor};">{text}</div>
    {/if}
  </div>
{/if}
