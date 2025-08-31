// Tier configuration and entitlements
// This file defines what features and models each tier has access to

export const TIER_NAMES = {
  0: 'Free',
  1: 'Pro', 
  2: 'Studio'
};

export const TIER_CONFIG = {
  0: { // Free
    name: 'Free',
    maxProjects: 3,
    models: [
      'qwen-2.5-72b-instruct',    // Quest
      'llama-3.1-70b-instruct',   // Tina  
      'gemini-flash-1.5',         // Spark
      'gpt-4o-mini-2024-07-18',   // Prism
      'deepseek-v3'               // Sage
    ],
    features: [
      'basic-export',
      'basic-facts',
      'basic-docs', 
      'basic-questions',
      'basic-ideas',
      'basic-branching'
    ],
    exportFormats: ['json'],
    colorSchemes: ['default'],
    avatarTypes: ['default'],
    relatedIdeasPerDay: 5,
    allowedAvatars: ['default', 'mermia', 'ben-cipher', 'benji-fox', 'deerie']
  },
  1: { // Pro
    name: 'Pro',
    maxProjects: -1, // unlimited
    models: [
      // Include all Free tier models
      'qwen-2.5-72b-instruct',    // Quest
      'llama-3.1-70b-instruct',   // Tina
      'gemini-flash-1.5',         // Spark
      'gpt-4o-mini-2024-07-18',   // Prism
      'deepseek-v3',              // Sage
      // Pro tier models
      'llama-3.1-405b-instruct',  // Titan
      'claude-3-haiku',           // Hikari
      'gemini-pro-1.5',           // Gem
      'mistral-large',            // Gale
      'gpt-4o',                   // Aurora
      'gpt-5'                     // Vega
    ],
    features: [
      'basic-export',
      'basic-facts',
      'basic-docs',
      'basic-questions', 
      'basic-ideas',
      'basic-branching',
      'auto-tag',
      'advanced-export',
      'custom-avatar',
      'color-schemes',
      'advanced-models',
      'say-less',
      'custom-fact-types'
    ],
    exportFormats: ['json', 'markdown', 'docx'],
    colorSchemes: ['*'],
    avatarTypes: ['default', 'upload', 'generated'],
    relatedIdeasPerDay: 25,
    allowedAvatars: ['*'] // All avatars allowed
  },
  2: { // Studio
    name: 'Studio',
    maxProjects: -1, // unlimited
    models: [
      // Include all Free and Pro tier models
      'qwen-2.5-72b-instruct',    // Quest
      'llama-3.1-70b-instruct',   // Tina
      'gemini-flash-1.5',         // Spark
      'gpt-4o-mini-2024-07-18',   // Prism
      'deepseek-v3',              // Sage
      'llama-3.1-405b-instruct',  // Titan
      'claude-3-haiku',           // Hikari
      'gemini-pro-1.5',           // Gem
      'mistral-large',            // Gale
      'gpt-4o',                   // Aurora
      'gpt-5',                    // Vega
      // Studio tier models
      'claude-3-5-sonnet',        // Verse
      'gpt-4-turbo',              // Dash
      'claude-3-opus'             // Opal
    ],
    features: ['*'],
    exportFormats: ['*'],
    colorSchemes: ['*'],
    avatarTypes: ['*'],
    relatedIdeasPerDay: 100,
    allowedAvatars: ['*'],
    additionalFeatures: [
      'account-export',
      'priority-support',
      'beta-features'
    ]
  }
};

// Model definitions with tier requirements
// Note: These keys match the AI avatar mappings in aiAvatars.js
export const MODEL_DEFINITIONS = {
  // FREE TIER MODELS
  'qwen-2.5-72b-instruct': {
    key: 'qwen-2.5-72b-instruct',
    name: 'Quest',
    provider: 'alibaba',
    description: 'Knowledgeable wiskr from the research innovators at Alibaba',
    requiredTier: 0,
    icon: '🔍'
  },
  'llama-3.1-70b-instruct': {
    key: 'llama-3.1-70b-instruct',
    name: 'Tina',
    provider: 'meta',
    description: 'Open-source wiskr from the social researchers at Meta',
    requiredTier: 0,
    icon: '🦙'
  },
  'gemini-flash-1.5': {
    key: 'gemini-flash-1.5',
    name: 'Spark',
    provider: 'google',
    description: 'Lightning-fast wiskr from the search experts at Google',
    requiredTier: 0,
    icon: '⚡'
  },
  'gpt-4o-mini-2024-07-18': {
    key: 'gpt-4o-mini-2024-07-18',
    name: 'Prism',
    provider: 'openai',
    description: 'Compact but capable wiskr from the creative minds at OpenAI Labs',
    requiredTier: 0,
    icon: '🔸'
  },
  'deepseek-v3': {
    key: 'deepseek-v3',
    name: 'Sage',
    provider: 'deepseek',
    description: 'Deep thinking wiskr from the reasoning specialists at DeepSeek',
    requiredTier: 0,
    icon: '🧠'
  },
  
  // PRO TIER MODELS
  'llama-3.1-405b-instruct': {
    key: 'llama-3.1-405b-instruct',
    name: 'Titan',
    provider: 'meta',
    description: 'Powerful large-scale wiskr from the open-source advocates at Meta',
    requiredTier: 1,
    icon: '🏛️'
  },
  'claude-3-haiku': {
    key: 'claude-3-haiku',
    name: 'Hikari',
    provider: 'anthropic',
    description: 'Fast and efficient wiskr from the Constitutional AI Foundation',
    requiredTier: 1,
    icon: '🌸'
  },
  'gemini-pro-1.5': {
    key: 'gemini-pro-1.5',
    name: 'Gem',
    provider: 'google',
    description: 'Professional wiskr from the brilliant team at Google AI Research',
    requiredTier: 1,
    icon: '💎'
  },
  'mistral-large': {
    key: 'mistral-large',
    name: 'Gale',
    provider: 'mistral',
    description: 'European wiskr from the innovative minds at Mistral',
    requiredTier: 1,
    icon: '🌪️'
  },
  'gpt-4o': {
    key: 'gpt-4o',
    name: 'Aurora',
    provider: 'openai',
    description: 'Advanced multimodal wiskr from the innovative minds at OpenAI',
    requiredTier: 1,
    icon: '🌅'
  },
  'gpt-5': {
    key: 'gpt-5',
    name: 'Vega',
    provider: 'openai',
    description: 'Next-generation wiskr from OpenAI',
    requiredTier: 1,
    icon: '⭐'
  },
  
  // STUDIO TIER MODELS
  'claude-3-5-sonnet': {
    key: 'claude-3-5-sonnet',
    name: 'Verse',
    provider: 'anthropic',
    description: 'Balanced wiskr with great reasoning from the thoughtful researchers at Anthropic',
    requiredTier: 2,
    icon: '🎭'
  },
  'gpt-4-turbo': {
    key: 'gpt-4-turbo',
    name: 'Dash',
    provider: 'openai',
    description: 'High-performance wiskr from the forward-thinking researchers at OpenAI',
    requiredTier: 2,
    icon: '🏃'
  },
  'claude-3-opus': {
    key: 'claude-3-opus',
    name: 'Opal',
    provider: 'anthropic',
    description: 'Thoughtful and comprehensive wiskr from the safety-focused team at Constitutional AI Research',
    requiredTier: 2,
    icon: '👑'
  }
};

// Utility functions for checking permissions
export function getUserTierConfig(tier) {
  if (tier === undefined || tier === null) {
    return TIER_CONFIG[0]; // Default to free
  }
  return TIER_CONFIG[tier] || TIER_CONFIG[0];
}

export function hasFeature(userTier, featureName) {
  const config = getUserTierConfig(userTier);
  return config.features.includes('*') || config.features.includes(featureName);
}

export function hasModel(userTier, modelKey) {
  const config = getUserTierConfig(userTier);
  return config.models.includes('*') || config.models.includes(modelKey);
}

export function canCreateProject(userTier, currentProjectCount) {
  const config = getUserTierConfig(userTier);
  return config.maxProjects === -1 || currentProjectCount < config.maxProjects;
}

export function getAvailableModels(userTier) {
  const config = getUserTierConfig(userTier);
  return Object.values(MODEL_DEFINITIONS).filter(model => 
    config.models.includes('*') || config.models.includes(model.key)
  );
}

export function getAllModelsWithTierInfo(userTier) {
  const userConfig = getUserTierConfig(userTier);
  return Object.values(MODEL_DEFINITIONS).map(model => ({
    ...model,
    available: userConfig.models.includes('*') || userConfig.models.includes(model.key),
    requiredTierName: TIER_NAMES[model.requiredTier]
  }));
}

export function hasExportFormat(userTier, format) {
  const config = getUserTierConfig(userTier);
  return config.exportFormats.includes('*') || config.exportFormats.includes(format);
}

export function getAvailableExportFormats(userTier) {
  const config = getUserTierConfig(userTier);
  const allFormats = ['json', 'markdown', 'docx'];
  
  if (config.exportFormats.includes('*')) {
    return allFormats;
  }
  
  return allFormats.filter(format => config.exportFormats.includes(format));
}

// Check if user needs to upgrade for a feature
export function getUpgradeInfo(userTier, requiredFeature) {
  if (hasFeature(userTier, requiredFeature)) {
    return null; // No upgrade needed
  }
  
  // Find the minimum tier that has this feature
  for (let tier = userTier + 1; tier <= 2; tier++) {
    if (hasFeature(tier, requiredFeature)) {
      return {
        currentTier: TIER_NAMES[userTier],
        requiredTier: TIER_NAMES[tier],
        requiredTierLevel: tier
      };
    }
  }
  
  return {
    currentTier: TIER_NAMES[userTier],
    requiredTier: TIER_NAMES[2], // Default to highest tier
    requiredTierLevel: 2
  };
}

// Validate trial status
export function isTrialExpired(trialEndsAt) {
  if (!trialEndsAt) return false;
  return new Date() > new Date(trialEndsAt);
}

// Calculate effective tier (considering trial expiration)
export function getEffectiveTier(baseTier, trialEndsAt) {
  if (baseTier === 1 && isTrialExpired(trialEndsAt)) {
    return 0; // Downgrade expired Pro trial to Free
  }
  return baseTier;
}

// Related Ideas utility functions
export function getRelatedIdeasLimit(userTier) {
  const config = getUserTierConfig(userTier);
  return config.relatedIdeasPerDay || 5; // Default to 5 if not specified
}

export function canGenerateIdeas(userTier, usedToday) {
  const limit = getRelatedIdeasLimit(userTier);
  return usedToday < limit;
}

export function getRemainingIdeas(userTier, usedToday) {
  const limit = getRelatedIdeasLimit(userTier);
  return Math.max(0, limit - usedToday);
}

// Avatar utility functions
export function isAvatarAllowed(userTier, avatarId) {
  const config = getUserTierConfig(userTier);
  if (config.allowedAvatars.includes('*')) {
    return true;
  }
  return config.allowedAvatars.includes(avatarId);
}

export function getAvailableAvatars(userTier, allAvatars) {
  const config = getUserTierConfig(userTier);
  if (config.allowedAvatars.includes('*')) {
    return allAvatars;
  }
  return allAvatars.filter(avatar => config.allowedAvatars.includes(avatar.id));
}
