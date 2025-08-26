<script>
  import { getInputClasses } from '$lib/design/tokens.js';

  export let type = 'text';
  export let size = 'md';
  export let value = '';
  export let placeholder = '';
  export let disabled = false;
  export let required = false;
  export let error = null;
  export let label = null;
  export let id = null;

  $: classes = getInputClasses(size);
  $: inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
</script>

<div class="space-y-1">
  {#if label}
    <label for={inputId} class="block text-sm font-medium text-[var(--text-primary)]">
      {label}
      {#if required}<span class="text-red-500">*</span>{/if}
    </label>
  {/if}
  
  <input
    {id}
    {type}
    {placeholder}
    {disabled}
    {required}
    bind:value
    class="{classes} {error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} {$$props.class || ''}"
    on:input
    on:change
    on:focus
    on:blur
    on:keydown
    {...$$restProps}
  />
  
  {#if error}
    <p class="text-sm text-red-600">{error}</p>
  {/if}
</div>

<style>
  /* Component-specific styles */
</style>
