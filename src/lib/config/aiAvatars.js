/**
 * Centralized AI Avatar and Name Mapping
 * 
 * This configuration maps model keys to their friendly names and avatar images.
 * Used by both client and server-side code to maintain consistency.
 */

export const AI_AVATARS = {
  // Server key aliases
  'speed': {
    name: 'Hikari',
    avatar: 'hikari.png',
    description: 'Fast and efficient AI assistant'
  },
  'quality': {
    name: 'Sonny',
    avatar: 'sonny.png',
    description: 'Balanced AI with great reasoning'
  },
  'gpt4': {
    name: 'Aurora',
    avatar: 'aurora.png',
    description: 'Advanced multimodal AI assistant'
  },
  'micro': {
    name: 'Nova Flash',
    avatar: 'nova-flash.png',
    description: 'Lightning-fast AI responses'
  },
  'gpt-oss': {
    name: 'Mini Moe',
    avatar: 'moe.png',
    description: 'Compact but capable AI assistant'
  },
  'gpt4-turbo': {
    name: 'Turbo Tess',
    avatar: 'turbo-tess.png',
    description: 'High-performance AI assistant'
  },
  'claude-opus': {
    name: 'Professor Opal',
    avatar: 'prof-opal.png',
    description: 'Thoughtful and comprehensive AI'
  },
  'gemini-pro': {
    name: 'Gemma',
    avatar: 'gemma.png',
    description: 'Professional AI assistant'
  },
  'llama-70b': {
    name: 'Tina',
    avatar: 'tina.png',
    description: 'Open-source AI assistant'
  },
  'llama-405b': {
    name: 'Big Timmy',
    avatar: 'big-timmy.png',
    description: 'Powerful large-scale AI'
  },
  'mistral-large': {
    name: 'Misty',
    avatar: 'misty.png',
    description: 'European AI assistant'
  },
  'qwen-72b': {
    name: 'Dr. Qwen',
    avatar: 'dr-qwen.png',
    description: 'Knowledgeable AI assistant'
  },
  'deepseek-v3': {
    name: 'Marina',
    avatar: 'marina.png',
    description: 'Deep thinking AI assistant'
  },
  // Full model names (for backward compatibility)
  'claude-3-haiku': {
    name: 'Hikari',
    avatar: 'hikari.png',
    description: 'Fast and efficient AI assistant'
  },
  'claude-3-5-sonnet': {
    name: 'Sonny',
    avatar: 'sonny.png',
    description: 'Balanced AI with great reasoning'
  },
  'gpt-4o': {
    name: 'Aurora',
    avatar: 'aurora.png',
    description: 'Advanced multimodal AI assistant'
  },
  'gemini-flash-1.5': {
    name: 'Nova Flash',
    avatar: 'nova-flash.png',
    description: 'Lightning-fast AI responses'
  },
  'gpt-4o-mini-2024-07-18': {
    name: 'Mini Moe',
    avatar: 'moe.png',
    description: 'Compact but capable AI assistant'
  },
  'gpt-4-turbo': {
    name: 'Turbo Tess',
    avatar: 'turbo-tess.png',
    description: 'High-performance AI assistant'
  },
  'claude-3-opus': {
    name: 'Professor Opal',
    avatar: 'prof-opal.png',
    description: 'Thoughtful and comprehensive AI'
  },
  'gemini-pro-1.5': {
    name: 'Gemma',
    avatar: 'gemma.png',
    description: 'Professional AI assistant'
  },
  'llama-3.1-70b-instruct': {
    name: 'Tina',
    avatar: 'tina.png',
    description: 'Open-source AI assistant'
  },
  'llama-3.1-405b-instruct': {
    name: 'Big Timmy',
    avatar: 'big-timmy.png',
    description: 'Powerful large-scale AI'
  },
  'mistral-large': {
    name: 'Misty',
    avatar: 'misty.png',
    description: 'European AI assistant'
  },
  'qwen-2.5-72b-instruct': {
    name: 'Dr. Qwen',
    avatar: 'dr-qwen.png',
    description: 'Knowledgeable AI assistant'
  },
  'deepseek-v3': {
    name: 'Marina',
    avatar: 'marina.png',
    description: 'Deep thinking AI assistant'
  }
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
    return {
      ...aiInfo,
      avatarPath: `/avatars/${aiInfo.avatar}`,
      modelKey: modelKey
    };
  }
  
  // Fallback for unknown models
  return {
    name: 'AI Assistant',
    avatar: 'default-ai.png',
    avatarPath: '/avatars/default-ai.png',
    description: 'AI Assistant',
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
  return getAIInfo(modelKey).avatarPath;
}

/**
 * Get all available AI models with their information
 * @returns {Array} Array of AI model objects with keys and info
 */
export function getAllAIModels() {
  return Object.entries(AI_AVATARS).map(([key, info]) => ({
    key,
    ...info,
    avatarPath: `/avatars/${info.avatar}`
  }));
}
