<!-- FeatureGate.svelte - Wrapper component for gating features with tier restrictions -->
<script>
  import { hasFeature, getUpgradeInfo, getUserTier } from '$lib/utils/tiers.js';
  import ProBadge from './ProBadge.svelte';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let user = null; // User object with tier info
  export let feature = null; // Feature name to check (e.g., 'advanced-export')
  export let requiredTier = null; // Alternative: directly specify required tier (1 for Pro, 2 for Studio)
  export let showBadge = true; // Show the Pro/Studio badge
  export let badgeSize = 'sm'; // Size of the badge
  export let badgeVariant = 'minimal'; // Badge variant
  export let disabled = false; // Force disable regardless of tier
  export let showTooltip = true; // Show upgrade tooltip on hover/click
  export let allowClick = true; // Allow clicking when feature is locked
  export let className = ''; // Additional CSS classes

  // Determine if user has access to the feature
  $: userTier = getUserTier(user);
  $: hasAccess = !disabled && (
    feature ? hasFeature(user, feature) : 
    requiredTier ? userTier >= requiredTier : 
    true
  );

  // Get upgrade information if user doesn't have access
  $: upgradeInfo = !hasAccess && feature ? getUpgradeInfo(user, feature) : null;
  $: requiredTierLevel = upgradeInfo?.requiredTierLevel || requiredTier || 1;

  // Handle clicks when feature is locked
  function handleLockedClick(event) {
    if (hasAccess || !allowClick) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    if (upgradeInfo) {
      dispatch('upgrade-needed', {
        feature,
        currentTier: upgradeInfo.currentTier,
        requiredTier: upgradeInfo.requiredTier,
        requiredTierLevel: upgradeInfo.requiredTierLevel
      });
    }
  }

  // Generate tooltip message
  $: tooltipMessage = !hasAccess && upgradeInfo ? 
    `This feature requires ${upgradeInfo.requiredTier}. Upgrade from ${upgradeInfo.currentTier} to unlock it.` : 
    null;
</script>

<div 
  class="relative inline-flex items-center gap-2 {className}"
  class:opacity-60={!hasAccess}
  class:cursor-not-allowed={!hasAccess && allowClick}
  class:pointer-events-none={!hasAccess && !allowClick}
  on:click={handleLockedClick}
  title={showTooltip ? tooltipMessage : null}
>
  <slot {hasAccess} {userTier} {upgradeInfo} />
  
  {#if showBadge && !hasAccess && requiredTierLevel}
    <ProBadge 
      tier={requiredTierLevel} 
      size={badgeSize} 
      variant={badgeVariant}
      className="flex-shrink-0"
    />
  {/if}
</div>
