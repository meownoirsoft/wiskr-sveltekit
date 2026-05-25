// Client-side tier utilities
// These functions work with the user data passed from the server

import { 
  hasFeature as _hasFeature,
  hasModel as _hasModel,
  canCreateProject as _canCreateProject,
  getAvailableModels as _getAvailableModels,
  getAllModelsWithTierInfo as _getAllModelsWithTierInfo,
  hasExportFormat as _hasExportFormat,
  getAvailableExportFormats as _getAvailableExportFormats,
  getUpgradeInfo as _getUpgradeInfo,
  getUserTierConfig as _getUserTierConfig,
  getEffectiveTier as _getEffectiveTier,
  TIER_NAMES
} from '$lib/config/tiers.js';

// Helper to get user tier from user object (with trial support)
function getUserTier(user) {
  if (!user) return 0; // Default to free if no user
  
  const baseTier = user.tier ?? 0;
  const trialEndsAt = user.trial_ends_at;
  
  return _getEffectiveTier(baseTier, trialEndsAt);
}

// Client-side wrappers that take user object instead of tier number
export function hasFeature(user, featureName) {
  return _hasFeature(getUserTier(user), featureName);
}

export function hasModel(user, modelKey) {
  return _hasModel(getUserTier(user), modelKey);
}

export function canCreateProject(user, currentProjectCount) {
  return _canCreateProject(getUserTier(user), currentProjectCount);
}

export function getAvailableModels(user) {
  return _getAvailableModels(getUserTier(user));
}

export function getAllModelsWithTierInfo(user) {
  return _getAllModelsWithTierInfo(getUserTier(user));
}

export function hasExportFormat(user, format) {
  return _hasExportFormat(getUserTier(user), format);
}

export function getAvailableExportFormats(user) {
  return _getAvailableExportFormats(getUserTier(user));
}

export function getUpgradeInfo(user, requiredFeature) {
  return _getUpgradeInfo(getUserTier(user), requiredFeature);
}

export function getUserTierConfig(user) {
  return _getUserTierConfig(getUserTier(user));
}

export function getUserTierName(user) {
  return TIER_NAMES[getUserTier(user)] || 'Free';
}

export function isOnTrial(user) {
  if (!user?.trial_ends_at) return false;
  return new Date() < new Date(user.trial_ends_at);
}

export function getTrialDaysRemaining(user) {
  if (!isOnTrial(user)) return 0;
  
  const now = new Date();
  const trialEnd = new Date(user.trial_ends_at);
  const diffTime = trialEnd - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

// Check if user can access a specific model (for UI decisions)
export function canUseModel(user, modelKey) {
  return hasModel(user, modelKey);
}

// Get upgrade message for a specific feature
export function getFeatureUpgradeMessage(user, featureName) {
  const upgradeInfo = getUpgradeInfo(user, featureName);
  if (!upgradeInfo) return null;
  
  return `This feature requires ${upgradeInfo.requiredTier}. Upgrade from ${upgradeInfo.currentTier} to unlock it.`;
}

// Get project limit info
export function getProjectLimitInfo(user, currentProjectCount) {
  const config = getUserTierConfig(user);
  
  if (config.maxProjects === -1) {
    return {
      unlimited: true,
      current: currentProjectCount,
      remaining: null,
      canCreate: true
    };
  }
  
  return {
    unlimited: false,
    max: config.maxProjects,
    current: currentProjectCount,
    remaining: Math.max(0, config.maxProjects - currentProjectCount),
    canCreate: currentProjectCount < config.maxProjects
  };
}

export { getUserTier, TIER_NAMES };
