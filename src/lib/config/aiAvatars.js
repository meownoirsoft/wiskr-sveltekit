/**
 * Centralized AI Avatar and Name Mapping
 * 
 * This configuration maps model keys to their friendly names and avatar images.
 * Used by both client and server-side code to maintain consistency.
 */

export const AI_AVATARS = {
  // Server key aliases
  'speed': {
    name: 'Ember',
    avatar: 'ember.png',
    description: 'Fast and efficient wiskr from the Constitutional AI Foundation',
    bestFor: 'snappy, lightweight, and great for quick conversations',
    company: 'anthropic'
  },
  'quality': {
    name: 'Verse',
    avatar: 'verse.png',
    description: 'Balanced wiskr with great reasoning from the thoughtful researchers at Anthropic',
    bestFor: 'creative, careful, and highly context-aware',
    company: 'anthropic'
  },
  'gpt4': {
    name: 'Aurora',
    avatar: 'aurora.png',
    description: 'Advanced multimodal wiskr from the innovative minds at OpenAI',
    bestFor: 'balanced blend of speed and intelligence',
    company: 'openai'
  },
  'micro': {
    name: 'Spark',
    avatar: 'spark.png',
    description: 'Lightning-fast wiskr from the search experts at Google',
    bestFor: 'perfect for real-time and creative tasks',
    company: 'google'
  },
  'gpt-oss': {
    name: 'Prism',
    avatar: 'prism.png',
    description: 'Compact but capable wiskr from the creative minds at OpenAI Labs',
    bestFor: 'reliable baseline for everyday Q&A and coding',
    company: 'openai'
  },
  'gpt4-turbo': {
    name: 'Dash',
    avatar: 'dash.png',
    description: 'High-performance wiskr from the forward-thinking researchers at OpenAI',
    bestFor: 'optimized for practical, high-volume use',
    company: 'openai'
  },
  'claude-opus': {
    name: 'Opal',
    avatar: 'opal.png',
    description: 'Thoughtful and comprehensive wiskr from the safety-focused team at Constitutional AI Research',
    bestFor: 'thoughtful, nuanced, and best for longform reasoning',
    company: 'anthropic'
  },
  'gemini-pro': {
    name: 'Gem',
    avatar: 'gem.png',
    description: 'Professional wiskr from the brilliant team at Google AI Research',
    bestFor: 'solid for reasoning, text, and multimodal tasks',
    company: 'google'
  },
  'llama-70b': {
    name: 'Tina',
    avatar: 'tina.png',
    description: 'Open-source wiskr from the social researchers at Meta',
    bestFor: 'strong, versatile, and widely adopted for general tasks',
    company: 'meta'
  },
  'llama-405b': {
    name: 'Titan',
    avatar: 'titan.png',
    description: 'Powerful large-scale wiskr from the open-source advocates at Meta',
    bestFor: 'massive reasoning depth, research-grade output',
    company: 'meta'
  },
  'mistral-large': {
    name: 'Gale',
    avatar: 'gale.png',
    description: 'European wiskr from the innovative minds at Mistral',
    bestFor: 'sharp reasoning, concise answers, and strong coding support',
    company: 'mistral'
  },
  'qwen-72b': {
    name: 'Quest',
    avatar: 'quest.png',
    description: 'Knowledgeable wiskr from the research innovators at Alibaba',
    bestFor: 'excels at coding and structured reasoning',
    company: 'alibaba'
  },
  'deepseek-v3': {
    name: 'Sage',
    avatar: 'sage.png',
    description: 'Deep thinking wiskr from the reasoning specialists at DeepSeek',
    bestFor: 'Lean, efficient, and highly capable for coding & reasoning',
    company: 'deepseek'
  },
  // Full model names (for backward compatibility)
  'claude-3-haiku': {
    name: 'Ember',
    avatar: 'ember.png',
    description: 'Fast and efficient wiskr from the Constitutional AI Foundation',
    bestFor: 'snappy, lightweight, and great for quick conversations',
    company: 'anthropic'
  },
  'claude-3-5-sonnet': {
    name: 'Verse',
    avatar: 'verse.png',
    description: 'Balanced wiskr with great reasoning from the thoughtful researchers at Anthropic',
    bestFor: 'creative, careful, and highly context-aware',
    company: 'anthropic'
  },
  'gpt-4o': {
    name: 'Aurora',
    avatar: 'aurora.png',
    description: 'Advanced multimodal wiskr from the innovative minds at OpenAI',
    bestFor: 'balanced blend of speed and intelligence',
    company: 'openai'
  },
  'gemini-flash-1.5': {
    name: 'Spark',
    avatar: 'spark.png',
    description: 'Lightning-fast wiskr from the search experts at Google',
    bestFor: 'Lightning-fast micro tasks',
    company: 'google'
  },
  'gpt-4o-mini-2024-07-18': {
    name: 'Prism',
    avatar: 'prism.png',
    description: 'Compact but capable wiskr from the creative minds at OpenAI Labs',
    bestFor: 'Quick help',
    company: 'openai'
  },
  'gpt-4-turbo': {
    name: 'Dash',
    avatar: 'dash.png',
    description: 'High-performance wiskr from the forward-thinking researchers at OpenAI',
    bestFor: 'optimized for practical, high-volume use',
    company: 'openai'
  },
  'claude-3-opus': {
    name: 'Opal',
    avatar: 'opal.png',
    description: 'Thoughtful and comprehensive wiskr from the safety-focused team at Constitutional AI Research',
    bestFor: 'thoughtful, nuanced, and best for longform reasoning',
    company: 'anthropic'
  },
  'gemini-pro-1.5': {
    name: 'Gem',
    avatar: 'gem.png',
    description: 'Professional wiskr from the brilliant team at Google AI Research',
    bestFor: 'solid for reasoning, text, and multimodal tasks',
    company: 'google'
  },
  'llama-3.1-70b-instruct': {
    name: 'Tina',
    avatar: 'tina.png',
    description: 'Open-source wiskr from the social researchers at Meta',
    bestFor: 'Most conversations',
    company: 'meta'
  },
  'llama-3.1-405b-instruct': {
    name: 'Titan',
    avatar: 'titan.png',
    description: 'Powerful large-scale wiskr from the open-source advocates at Meta',
    bestFor: 'Heavy reasoning tasks',
    company: 'meta'
  },
  'mistral-large': {
    name: 'Gale',
    avatar: 'gale.png',
    description: 'European wiskr from the innovative minds at Mistral',
    bestFor: 'sharp reasoning, concise answers, and strong coding support',
    company: 'mistral'
  },
  'qwen-2.5-72b-instruct': {
    name: 'Quest',
    avatar: 'quest.png',
    description: 'Knowledgeable wiskr from the research innovators at Alibaba',
    bestFor: 'Research & knowledge tasks',
    company: 'alibaba'
  },
  'deepseek-v3': {
    name: 'Sage',
    avatar: 'sage.png',
    description: 'Deep thinking wiskr from the reasoning specialists at DeepSeek',
    bestFor: 'Lean, efficient, and highly capable for coding & reasoning',
    company: 'deepseek'
  },
  'gpt-5': {
    name: 'Vega',
    avatar: 'vega.png',
    description: 'Next-generation wiskr from OpenAI',
    bestFor: 'deep reasoning, problem-solving, and creativity',
    company: 'openai'
  },
};

/**
 * Get AI information by model key
 * @param {string} modelKey - The model identifier
 * @returns {Object} AI information with name, avatar, and description
 */
export function getAIInfo(modelKey) {
  // First check if the key exists directly in our avatars
  let aiInfo = AI_AVATARS[modelKey];
  
  // If not found, try legacy key mappings
  if (!aiInfo) {
    const keyMappings = {
      'speed': 'claude-3-haiku',
      'quality': 'claude-3-5-sonnet',
      'gpt4': 'gpt-4o',
      'micro': 'gpt-4o-mini-2024-07-18',
      'turbo': 'gpt-4-turbo',
      'opus': 'claude-3-opus',
      'gemini': 'gemini-pro-1.5',
      'llama': 'llama-3.1-70b-instruct',
      'mistral': 'mistral-large',
      'qwen': 'qwen-2.5-72b-instruct',
      'deepseek': 'deepseek-v3'
    };
    
    const mappedKey = keyMappings[modelKey];
    if (mappedKey) {
      aiInfo = AI_AVATARS[mappedKey];
    }
  }
  
  if (aiInfo) {
    const cacheBuster = '?v=2'; // Increment this when avatars are updated
    return {
      ...aiInfo,
      avatarPath: `/avatars/${aiInfo.avatar}${cacheBuster}`,
      modelKey: modelKey
    };
  }
  
  // Fallback for unknown models
  return {
    name: 'Wiskr',
    avatar: 'default-ai.png',
    avatarPath: '/avatars/default-ai.png?v=2',
    description: 'Default Wiskr',
    bestFor: 'General tasks',
    modelKey: modelKey
  };
}

/**
 * Get friendly name for a model
 * @param {string} modelKey - The model identifier
 * @returns {string} The friendly display name
 */
export function getAIName(modelKey) {
  return getAIInfo(modelKey).name;
}

/**
 * Get avatar path for a model
 * @param {string} modelKey - The model identifier
 * @returns {string} The avatar image path
 */
export function getAIAvatar(modelKey) {
  // getAIInfo already includes cache-busting, so just return the path directly
  return getAIInfo(modelKey).avatarPath;
}

/**
 * Company to team name mapping
 */
const COMPANY_TEAMS = {
  'anthropic': 'Anthropic',
  'openai': 'OpenAI', 
  'google': 'Google',
  'meta': 'Meta',
  'mistral': 'Mistral',
  'alibaba': 'Alibaba',
  'deepseek': 'DeepSeek'
};

/**
 * Get team name for a model
 * @param {string} modelKey - The model identifier
 * @returns {string} The team name
 */
export function getAITeam(modelKey) {
  const aiInfo = getAIInfo(modelKey);
  return COMPANY_TEAMS[aiInfo.company] || 'Independent';
}

/**
 * Get formatted display name with team
 * @param {string} modelKey - The model identifier
 * @returns {string} The formatted name like "Hikari @ House Anthropic"
 */
export function getAINameWithTeam(modelKey) {
  const aiInfo = getAIInfo(modelKey);
  const teamName = getAITeam(modelKey);
  return `${aiInfo.name} @ ${teamName}`;
}

/**
 * Get all available AI models with their information
 * @returns {Array} Array of AI model objects with keys and info
 */
export function getAllAIModels() {
  const cacheBuster = '?v=2'; // Increment this when avatars are updated
  return Object.entries(AI_AVATARS).map(([key, info]) => ({
    key,
    ...info,
    avatarPath: `/avatars/${info.avatar}${cacheBuster}`
  }));
}
