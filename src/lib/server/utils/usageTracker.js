// Usage tracking utility for AI operations
import { createOpenAIClient } from '$lib/server/openrouter.js';

/**
 * Track AI usage for any operation
 * @param {Object} params - Usage tracking parameters
 * @param {string} params.userId - User ID
 * @param {string} params.projectId - Project ID  
 * @param {string} params.model - Model name
 * @param {number} params.tokensIn - Input tokens
 * @param {number} params.tokensOut - Output tokens
 * @param {number} params.costUsd - Cost in USD
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.operation - Operation type (optional)
 * @returns {Promise<Object>} Usage log result
 */
export async function trackUsage({ userId, projectId, model, tokensIn, tokensOut, costUsd, supabase, operation = null }) {
  const usagePayload = {
    user_id: userId,
    project_id: projectId,
    model,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    cost_usd: costUsd,
    operation // Add operation type for better tracking
  };

  console.log(`📊 Tracking usage for ${operation || 'AI operation'}:`, usagePayload);
  
  const { data: usageResult, error: usageError } = await supabase
    .from('usage_logs')
    .insert(usagePayload)
    .select();
  
  if (usageError) {
    console.error('❌ Usage tracking error:', usageError);
    return { error: usageError };
  } else {
    console.log('✅ Usage tracked successfully:', usageResult);
    return { data: usageResult };
  }
}

/**
 * Calculate token usage and cost for a model
 * @param {string} model - Model name
 * @param {string} inputText - Input text
 * @param {string} outputText - Output text
 * @returns {Object} Token counts and cost
 */
export function calculateUsage(model, inputText, outputText) {
  // Get model configuration
  const openai = createOpenAIClient();
  const modelConf = openai.models.get(model) || {
    name: model,
    inPerTok: 0.00015, // Default GPT-4o-mini rates
    outPerTok: 0.0006
  };

  const tokensIn = Math.round(JSON.stringify(inputText).length / 4);
  const tokensOut = Math.round(outputText.length / 4);
  const costUsd = +(tokensIn * modelConf.inPerTok + tokensOut * modelConf.outPerTok).toFixed(6);

  return {
    tokensIn,
    tokensOut,
    costUsd,
    model: modelConf.name
  };
}

/**
 * Track usage for an AI API call with automatic calculation
 * @param {Object} params - Parameters
 * @param {string} params.userId - User ID
 * @param {string} params.projectId - Project ID
 * @param {string} params.model - Model name
 * @param {string} params.inputText - Input text
 * @param {string} params.outputText - Output text
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.operation - Operation type
 * @returns {Promise<Object>} Usage log result
 */
export async function trackAIUsage({ userId, projectId, model, inputText, outputText, supabase, operation }) {
  const usage = calculateUsage(model, inputText, outputText);
  
  return await trackUsage({
    userId,
    projectId,
    model: usage.model,
    tokensIn: usage.tokensIn,
    tokensOut: usage.tokensOut,
    costUsd: usage.costUsd,
    supabase,
    operation
  });
}
