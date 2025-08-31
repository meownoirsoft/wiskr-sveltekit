<!-- FeatureGate.svelte - Wrapper component for gating features with tier restrictions -->
<script>
  import { hasFeature, getUpgradeInfo, getUserTier } from '$lib/utils/tiers.js';
  import ProBadge from './ProBadge.svelte';
  import UpgradeModal from './modals/UpgradeModal.svelte';
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
  
  // Upgrade modal state
  let showUpgradeModal = false;
  
  function handleProBadgeClick(event) {
    const { tier } = event.detail;
    showUpgradeModal = true;
  }
  
  function handleUpgradeModalClose() {
    showUpgradeModal = false;
  }

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
  class:opacity-75={!hasAccess}
  class:cursor-not-allowed={!hasAccess && allowClick}
  on:click={handleLockedClick}
  title={showTooltip ? tooltipMessage : null}
  data-testid="feature-gate"
>
  <!-- Always show the content, but disable click events if no access -->
  <div class:pointer-events-none={!hasAccess && !allowClick}>
    <slot {hasAccess} {userTier} {upgradeInfo} />
  </div>
  
  {#if showBadge && !hasAccess && requiredTierLevel}
    <ProBadge 
      tier={requiredTierLevel} 
      size={badgeSize} 
      variant={badgeVariant}
      className="flex-shrink-0"
      on:upgrade-click={handleProBadgeClick}
    />
  {/if}
</div>

<!-- Upgrade Modal -->
<UpgradeModal
  bind:showModal={showUpgradeModal}
  targetTier={requiredTierLevel}
  {feature}
  {user}
  on:close={handleUpgradeModalClose}
/>
