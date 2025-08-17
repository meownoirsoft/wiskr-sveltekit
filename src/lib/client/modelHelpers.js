// Client-side helper functions for AI models

// Model configurations with friendly names (matching server-side)
export const MODEL_FRIENDLY_NAMES = {
  // OpenRouter models
  'speed': 'Haiku',
  'quality': 'Sonnet',
  'gpt4': 'GPT-4o',
  'micro': 'Flash',
  'gpt-oss': 'GPT OSS',
  'gpt4-turbo': 'Turbo',
  'claude-opus': 'Opus',
  'gemini-pro': 'Gemini',
  'llama-70b': 'Llama',
  'llama-405b': 'Llama XL',
  'mistral-large': 'Mistral',
  'qwen-72b': 'Qwen',
  'deepseek-v3': 'DeepSeek',
  // Fallback OpenAI models
  'gpt-4o-mini': 'GPT-4o Mini',
  'gpt-4o': 'GPT-4o'
};

/**
 * Get the friendly name for a model key
 * @param {string} modelKey - The model key (e.g., 'speed', 'quality')
 * @returns {string} The friendly name (e.g., 'Haiku', 'Sonnet')
 */
export function getModelFriendlyName(modelKey) {
  return MODEL_FRIENDLY_NAMES[modelKey] || 'Assistant';
}

/**
 * Check if a model key is valid
 * @param {string} modelKey - The model key to check
 * @returns {boolean} True if the model key exists
 */
export function isValidModelKey(modelKey) {
  return modelKey && MODEL_FRIENDLY_NAMES.hasOwnProperty(modelKey);
}
