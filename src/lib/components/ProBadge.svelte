<!-- ProBadge.svelte - Shows tier requirement badges -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { TIER_NAMES } from '$lib/config/tiers.js';
  
  const dispatch = createEventDispatcher();
  
  export let tier = 1; // Default to Pro
  export let size = 'sm'; // 'xs', 'sm', 'md' 
  export let variant = 'solid'; // 'solid', 'outline', 'minimal'
  export let className = ''; // Additional CSS classes
  export let clickable = true; // Whether the badge is clickable for upgrades
  
  function handleClick(event) {
    if (!clickable) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    dispatch('upgrade-click', {
      tier,
      tierName: TIER_NAMES[tier]
    });
  }
  
  $: tierName = TIER_NAMES[tier] || 'Pro';
  $: sizeClasses = {
    'xs': 'text-[10px] px-1 py-0.5',
    'sm': 'text-xs px-1.5 py-0.5', 
    'md': 'text-sm px-2 py-1'
  };
  
  $: variantClasses = {
    'solid': getTierSolidClasses(tier),
    'outline': getTierOutlineClasses(tier), 
    'minimal': getTierMinimalClasses(tier)
  };
  
  function getTierSolidClasses(tierLevel) {
    switch(tierLevel) {
      case 1: // Pro
        return 'bg-blue-500 text-white border border-blue-600';
      case 2: // Studio
        return 'bg-purple-500 text-white border border-purple-600';
      default:
        return 'bg-gray-500 text-white border border-gray-600';
    }
  }
  
  function getTierOutlineClasses(tierLevel) {
    switch(tierLevel) {
      case 1: // Pro
        return 'bg-transparent text-blue-600 border border-blue-500 dark:text-blue-400 dark:border-blue-400';
      case 2: // Studio  
        return 'bg-transparent text-purple-600 border border-purple-500 dark:text-purple-400 dark:border-purple-400';
      default:
        return 'bg-transparent text-gray-600 border border-gray-500 dark:text-gray-400 dark:border-gray-400';
    }
  }
  
  function getTierMinimalClasses(tierLevel) {
    switch(tierLevel) {
      case 1: // Pro
        return 'bg-blue-50 text-blue-700 border-0 dark:bg-blue-900/20 dark:text-blue-300';
      case 2: // Studio
        return 'bg-purple-50 text-purple-700 border-0 dark:bg-purple-900/20 dark:text-purple-300';
      default:
        return 'bg-gray-50 text-gray-700 border-0 dark:bg-slate-800 dark:text-gray-300';
    }
  }
</script>

<span 
  class="inline-flex items-center rounded-full font-medium leading-none tracking-wide uppercase transition-colors {sizeClasses[size]} {variantClasses[variant]} {className}"
  class:cursor-pointer={clickable}
  class:hover:opacity-80={clickable}
  title="{clickable ? `Click to upgrade to ${tierName}` : `${tierName} feature`}"
  on:click={handleClick}
  role={clickable ? 'button' : undefined}
  tabindex={clickable ? 0 : undefined}
  data-testid="pro-badge"
>
  {tierName}
</span>
