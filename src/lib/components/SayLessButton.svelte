<script>
  import { createEventDispatcher } from 'svelte';
  import { FileText } from 'lucide-svelte';

  export let disabled = false;
  export let size = 'sm'; // 'sm', 'md', 'lg'
  export const variant = 'outline'; // 'outline', 'filled'
  export let title = 'Make text more concise with SayLess';
  export let isMobile = false; // Whether to hide icon on mobile

  const dispatch = createEventDispatcher();

  function handleClick() {
    dispatch('sayless');
  }

  // Size configurations
  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 h-10 sm:h-8',
    md: 'text-sm px-3 py-1.5 h-10 sm:h-8',
    lg: 'text-base px-4 py-2 h-12 sm:h-10'
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };

  // Better disabled styling that's more readable
  $: buttonClass = `
    flex items-center gap-1 rounded border transition-colors font-medium
    ${sizeClasses[size]}
    ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
  `;
  
  $: disabledStyles = disabled ? 
    'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700' :
    'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600';
</script>

<button
  class="{buttonClass} {disabledStyles}"
  on:click={handleClick}
  {disabled}
  {title}
>
  {#if !isMobile}
    <FileText size={16} />
  {/if}
  <span>Say Less</span>
</button>
