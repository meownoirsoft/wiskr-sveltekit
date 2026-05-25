// src/lib/server/openrouter.js
import OpenAI from 'openai';
import { OPENROUTER_API_KEY, OPENAI_API_KEY } from '$env/static/private';
import { getAIName } from '$lib/config/aiAvatars.js';

// OpenRouter model configurations with pricing
export const OPENROUTER_MODELS = {
  // Fast and cheap models
  speed: {
    name: 'anthropic/claude-3-haiku',
    friendlyName: getAIName('claude-3-haiku'),
    inPerTok: 0.25/1_000_000,
    outPerTok: 1.25/1_000_000,
    provider: 'openrouter',
    tier: 'Speed',
    category: 'Fast & Reliable'
  },
  
  // High quality models
  quality: {
    name: 'anthropic/claude-3-5-sonnet',
    friendlyName: getAIName('claude-3-5-sonnet'),
    inPerTok: 3.00/1_000_000,
    outPerTok: 15.00/1_000_000,
    provider: 'openrouter',
    tier: 'Premium',
    category: 'Flagship Performance'
  },
  
  // Alternative quality option
  gpt4: {
    name: 'openai/gpt-4o',
    friendlyName: getAIName('gpt-4o'),
    inPerTok: 2.50/1_000_000,
    outPerTok: 10.00/1_000_000,
    provider: 'openrouter',
    tier: 'Premium',
    category: 'Advanced Reasoning'
  },
  
  // Ultra cheap for simple tasks
  micro: {
    name: 'openai/gpt-4o-mini-2024-07-18',
    friendlyName: getAIName('gpt-4o-mini-2024-07-18'),
    inPerTok: 0.15/1_000_000,
    outPerTok: 0.60/1_000_000,
    provider: 'openrouter',
    tier: 'Budget',
    category: 'Ultra Efficient'
  },
  
  // Free GPT model
  'gpt-oss': {
    name: 'openai/gpt-4o-mini-2024-07-18',
    friendlyName: getAIName('gpt-4o-mini-2024-07-18'),
    inPerTok: 0.00/1_000_000,
    outPerTok: 0.00/1_000_000,
    provider: 'openrouter',
    tier: 'Free',
    category: 'Open Source'
  },
  
  // Additional popular models
  'gpt4-turbo': {
    name: 'openai/gpt-4-turbo',
    friendlyName: getAIName('gpt-4-turbo'),
    inPerTok: 10.00/1_000_000,
    outPerTok: 30.00/1_000_000,
    provider: 'openrouter',
    tier: 'Pro',
    category: 'Extended Context'
  },
  
  'claude-opus': {
    name: 'anthropic/claude-3-opus',
    friendlyName: getAIName('claude-3-opus'),
    inPerTok: 15.00/1_000_000,
    outPerTok: 75.00/1_000_000,
    provider: 'openrouter',
    tier: 'Elite',
    category: 'Maximum Capability'
  },
  
  'gemini-pro': {
    name: 'google/gemini-pro-1.5',
    friendlyName: getAIName('gemini-pro-1.5'),
    inPerTok: 1.25/1_000_000,
    outPerTok: 5.00/1_000_000,
    provider: 'openrouter',
    tier: 'Standard',
    category: 'Balanced Performance'
  },
  
  'llama-70b': {
    name: 'meta-llama/llama-3.1-70b-instruct',
    friendlyName: getAIName('llama-3.1-70b-instruct'),
    inPerTok: 0.52/1_000_000,
    outPerTok: 0.75/1_000_000,
    provider: 'openrouter',
    tier: 'Value',
    category: 'Open Source Power'
  },
  
  'llama-405b': {
    name: 'meta-llama/llama-3.1-405b-instruct',
    friendlyName: getAIName('llama-3.1-405b-instruct'),
    inPerTok: 2.70/1_000_000,
    outPerTok: 2.70/1_000_000,
    provider: 'openrouter',
    tier: 'Pro',
    category: 'Massive Scale'
  },
  
  'mistral-large': {
    name: 'mistralai/mistral-large',
    friendlyName: getAIName('mistral-large'),
    inPerTok: 2.00/1_000_000,
    outPerTok: 6.00/1_000_000,
    provider: 'openrouter',
    tier: 'Premium',
    category: 'European Excellence'
  },
  
  'qwen-72b': {
    name: 'qwen/qwen-2.5-72b-instruct',
    friendlyName: getAIName('qwen-2.5-72b-instruct'),
    inPerTok: 0.40/1_000_000,
    outPerTok: 0.40/1_000_000,
    provider: 'openrouter',
    tier: 'Value',
    category: 'Multilingual Expert'
  },
  
  'deepseek-v3': {
    name: 'deepseek/deepseek-chat-v3.1',
    friendlyName: getAIName('deepseek-v3'),
    inPerTok: 0.20/1_000_000,
    outPerTok: 0.80/1_000_000,
    provider: 'openrouter',
    tier: 'Budget',
    category: 'Code Specialist'
  }
};

// Fallback to original OpenAI models if OpenRouter not available
export const FALLBACK_MODELS = {
  speed: { 
    name: 'gpt-4o-mini',
    friendlyName: 'GPT-4o Mini',
    inPerTok: 0.15/1_000_000, 
    outPerTok: 0.60/1_000_000,
    provider: 'openai'
  },
  quality: { 
    name: 'gpt-4o',
    friendlyName: 'GPT-4o',
    inPerTok: 2.50/1_000_000, 
    outPerTok: 10.00/1_000_000,
    provider: 'openai'
  }
};

// Create OpenRouter client
export function createOpenRouterClient() {
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'your_openrouter_api_key_here') {
    console.warn('OpenRouter API key not configured, falling back to OpenAI');
    return null;
  }
  
  return new OpenAI({
    apiKey: OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://wiskr.dev', // Replace with your actual domain
      'X-Title': 'Wiskr'
    }
  });
}

// Create fallback OpenAI client
export function createOpenAIClient() {
  return new OpenAI({ 
    apiKey: OPENAI_API_KEY 
  });
}

// Get the appropriate model configuration
export function getModelConfig(modelKey = 'speed') {
  const openrouterClient = createOpenRouterClient();
  
  if (openrouterClient && OPENROUTER_MODELS[modelKey]) {
    return {
      config: OPENROUTER_MODELS[modelKey],
      client: openrouterClient
    };
  }
  
  // Fallback to OpenAI
  const fallbackConfig = FALLBACK_MODELS[modelKey] || FALLBACK_MODELS.speed;
  return {
    config: fallbackConfig,
    client: createOpenAIClient()
  };
}

// Helper to get friendly name for a model key
export function getModelFriendlyName(modelKey) {
  const openrouterModel = OPENROUTER_MODELS[modelKey];
  if (openrouterModel && openrouterModel.friendlyName) {
    return openrouterModel.friendlyName;
  }
  
  const fallbackModel = FALLBACK_MODELS[modelKey];
  if (fallbackModel && fallbackModel.friendlyName) {
    return fallbackModel.friendlyName;
  }
  
  // Default fallback
  return 'Assistant';
}

// Helper to get all available models for UI
export function getAvailableModels() {
  const openrouterClient = createOpenRouterClient();
  
  // Define tier priority order (most common user needs first)
  const tierPriority = {
    'Free': 0,      // Free models - best value
    'Budget': 1,    // Ultra affordable - great starting point
    'Speed': 2,     // Fast and reliable - most popular
    'Value': 3,     // Great performance per dollar
    'Standard': 4,  // Balanced option
    'Premium': 5,   // High quality
    'Pro': 6,       // Advanced features
    'Elite': 7      // Maximum capability
  };
  
  if (openrouterClient) {
    const models = Object.entries(OPENROUTER_MODELS).map(([key, config]) => ({
      key,
      name: config.name,
      friendlyName: config.friendlyName,
      provider: config.provider,
      tier: config.tier,
      category: config.category,
      costPer1kTokens: {
        input: (config.inPerTok * 1000).toFixed(3),
        output: (config.outPerTok * 1000).toFixed(3)
      },
      // Add sorting priority
      sortPriority: tierPriority[config.tier] || 999
    }));
    
    // Sort by tier priority, then by cost (cheaper first within tier)
    return models.sort((a, b) => {
      if (a.sortPriority !== b.sortPriority) {
        return a.sortPriority - b.sortPriority;
      }
      // Within same tier, sort by total cost (input + output)
      const aCost = parseFloat(a.costPer1kTokens.input) + parseFloat(a.costPer1kTokens.output);
      const bCost = parseFloat(b.costPer1kTokens.input) + parseFloat(b.costPer1kTokens.output);
      return aCost - bCost;
    });
  }
  
  return Object.entries(FALLBACK_MODELS).map(([key, config]) => ({
    key,
    name: config.name,
    friendlyName: config.friendlyName,
    provider: config.provider,
    tier: config.tier || 'Standard',
    category: config.category || 'General Purpose',
    costPer1kTokens: {
      input: (config.inPerTok * 1000).toFixed(3),
      output: (config.outPerTok * 1000).toFixed(3)
    }
  }));
}
