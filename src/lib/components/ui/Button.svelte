<script>
  import { getButtonClasses } from '$lib/design/tokens.js';

  export let size = 'md';
  export let variant = 'primary';
  export let disabled = false;
  export let type = 'button';
  export let href = null;
  export let loading = false;

  $: classes = getButtonClasses(size, variant);
  $: Component = href ? 'a' : 'button';
</script>

<svelte:element 
  this={Component} 
  {type}
  {href}
  {disabled}
  class="{classes} {disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} {$$props.class || ''}"
  on:click
  {...$$restProps}
>
  {#if loading}
    <div class="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2"></div>
  {/if}
  <slot />
</svelte:element>

<style>
  /* Additional component-specific styles if needed */
</style>
