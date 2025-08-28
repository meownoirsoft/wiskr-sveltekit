// src/lib/tiers.js
// Shared tier configuration for subscription management

export const TIER_CONFIGS = {
  0: { 
    name: 'Free', 
    maxProjects: 3, 
    features: ['Basic chat', 'Up to 3 projects', 'Standard models'] 
  },
  1: { 
    name: 'Pro', 
    maxProjects: -1, // unlimited
    features: ['Unlimited projects', 'Advanced models', 'Export/Import', 'Priority support'] 
  },
  2: { 
    name: 'Enterprise', 
    maxProjects: -1, // unlimited
    features: ['Everything in Pro', 'Admin controls', 'Custom integrations', 'SLA support']
  }
};

/**
 * Get effective tier considering trial expiration
 * @param {number} userTier - Base tier from user metadata
 * @param {string|null} trialEndsAt - Trial end date ISO string
 * @returns {number} Effective tier number
 */
export function getEffectiveTier(userTier, trialEndsAt) {
  if (!trialEndsAt || !userTier) {
    return userTier || 0;
  }
  
  const now = new Date();
  const trialEnd = new Date(trialEndsAt);
  
  // If trial has expired, fall back to free tier
  if (now > trialEnd) {
    return 0;
  }
  
  return userTier;
}

/**
 * Get tier config for a given tier number
 * @param {number} tier - Tier number
 * @returns {Object} Tier configuration
 */
export function getTierConfig(tier) {
  return TIER_CONFIGS[tier] || TIER_CONFIGS[0];
}

/**
 * Check if a user can create another project
 * @param {number} effectiveTier - User's effective tier
 * @param {number} currentProjectCount - Number of projects user currently has
 * @returns {Object} {canCreate: boolean, reason?: string}
 */
export function canCreateProject(effectiveTier, currentProjectCount) {
  const config = getTierConfig(effectiveTier);
  
  // Unlimited projects
  if (config.maxProjects === -1) {
    return { canCreate: true };
  }
  
  // Check against limit
  if (currentProjectCount >= config.maxProjects) {
    return { 
      canCreate: false, 
      reason: `${config.name} tier allows up to ${config.maxProjects} projects. Consider upgrading to Pro for unlimited projects.`
    };
  }
  
  return { canCreate: true };
}

/**
 * Get display information for a tier
 * @param {number} tier - Tier number
 * @param {string|null} trialEndsAt - Trial end date ISO string
 * @returns {Object} Display information
 */
export function getTierDisplayInfo(tier, trialEndsAt) {
  const config = getTierConfig(tier);
  const effectiveTier = getEffectiveTier(tier, trialEndsAt);
  const isTrialActive = trialEndsAt && new Date() < new Date(trialEndsAt);
  
  let displayName = config.name;
  let status = 'active';
  
  if (isTrialActive) {
    displayName += ' (Trial)';
    status = 'trial';
  } else if (tier > 0 && effectiveTier === 0) {
    displayName = 'Free (Trial Expired)';
    status = 'expired';
  }
  
  return {
    name: displayName,
    status,
    features: config.features,
    maxProjects: config.maxProjects,
    isUnlimited: config.maxProjects === -1
  };
}
