// src/routes/api/models/+server.js
import { json } from '@sveltejs/kit';
import { getAvailableModels } from '$lib/server/openrouter.js';
import { getAllModelsWithTierInfo, getEffectiveTier } from '$lib/config/tiers.js';
import { supabase } from '$lib/supabase.js';

export async function GET({ url, locals }) {
  try {
    const user = locals.user;
    
    // Use the same tier source as the rest of the application
    const userTier = locals.userTier || 0;
    const trialEndsAt = locals.trialEndsAt || null;
    const effectiveTier = locals.effectiveTier || 0;
    
    // Debug: Log the tier information
    console.log('User tier from locals:', userTier, 'Effective tier:', effectiveTier);
    console.log('locals object keys:', Object.keys(locals));
    console.log('Full locals.userTier:', locals.userTier);
    console.log('Full locals.effectiveTier:', locals.effectiveTier);
    
    // Get all models with tier information
    console.log('Calling getAllModelsWithTierInfo with effectiveTier:', effectiveTier);
    const rawModelsWithTierInfo = getAllModelsWithTierInfo(effectiveTier);
    
    // Debug: Log model availability
    console.log('Raw models with tier info:', rawModelsWithTierInfo.map(m => ({ key: m.key, available: m.available, requiredTier: m.requiredTier })));
    
    // Convert 'available' property to 'isAvailable' for client compatibility
    const modelsWithTierInfo = rawModelsWithTierInfo.map(model => ({
      ...model,
      isAvailable: model.available
    }));
    
    // Separate available and unavailable models
    const availableModels = modelsWithTierInfo.filter(model => model.isAvailable);
    const unavailableModels = modelsWithTierInfo.filter(model => !model.isAvailable);
    
    // Debug: Log final model lists
    console.log('Available models:', availableModels.map(m => m.key));
    console.log('Unavailable models:', unavailableModels.map(m => m.key));
    
    // For backward compatibility, also include the legacy format
    const legacyModels = getAvailableModels();
    
    return json({
      // New tier-aware format
      models: modelsWithTierInfo,
      availableModels,
      unavailableModels,
      userTier: effectiveTier,
      // Legacy format for backward compatibility
      legacy: {
        models: legacyModels,
        provider: legacyModels[0]?.provider || 'unknown'
      },
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    return json({ error: 'Failed to fetch models' }, { status: 500 });
  }
}
