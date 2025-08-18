<script>
  import { createEventDispatcher } from 'svelte';
  import { FileText } from 'lucide-svelte';

  export let disabled = false;
  export let size = 'sm'; // 'sm', 'md', 'lg'
  export let variant = 'outline'; // 'outline', 'filled'
  export let title = 'Make text more concise with TL;DR';

  const dispatch = createEventDispatcher();

  function handleClick() {
    dispatch('tldr');
  }

  // Size configurations
  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };

  $: buttonClass = `
    flex items-center gap-1 rounded border transition-colors font-medium
    ${sizeClasses[size]}
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
  `;
</script>

<button
  class={buttonClass}
  style="background-color: var(--bg-sessions-button); color: var(--color-accent); border-color: var(--color-accent-light);"
  on:mouseenter={(e) => !disabled && (e.target.style.backgroundColor = 'var(--color-accent-light)')}
  on:mouseleave={(e) => !disabled && (e.target.style.backgroundColor = 'var(--bg-sessions-button)')}
  on:click={handleClick}
  {disabled}
  {title}
>
  <FileText size={16} />
  <span>TL;DR</span>
</button>
