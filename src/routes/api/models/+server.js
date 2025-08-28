// src/routes/api/models/+server.js
import { json } from '@sveltejs/kit';
import { getAvailableModels } from '$lib/server/openrouter.js';
import { getAllModelsWithTierInfo, getEffectiveTier } from '$lib/config/tiers.js';
import { supabase } from '$lib/supabase.js';

export async function GET({ url, locals }) {
  try {
    const user = locals.user;
    let userTier = 0; // Default to free
    let trialEndsAt = null;
    
    // Get user's tier from auth metadata if authenticated
    if (user) {
      try {
        // Get tier information from user metadata
        const metadata = user.user_metadata || {};
        userTier = metadata.tier ?? 0;
        trialEndsAt = metadata.trial_ends_at || null;
        
        // For now, we'll use default values until tier management is implemented
        // This allows the system to work without database changes
      } catch (error) {
        console.log('Error reading user metadata, using default tier 0:', error.message);
        // Keep default userTier = 0
      }
    }
    
    // Calculate effective tier (handles trial expiration)
    const effectiveTier = getEffectiveTier(userTier, trialEndsAt);
    
    // Get all models with tier information
    const rawModelsWithTierInfo = getAllModelsWithTierInfo(effectiveTier);
    
    // Convert 'available' property to 'isAvailable' for client compatibility
    const modelsWithTierInfo = rawModelsWithTierInfo.map(model => ({
      ...model,
      isAvailable: model.available
    }));
    
    // Separate available and unavailable models
    const availableModels = modelsWithTierInfo.filter(model => model.isAvailable);
    const unavailableModels = modelsWithTierInfo.filter(model => !model.isAvailable);
    
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
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    return json({ error: 'Failed to fetch models' }, { status: 500 });
  }
}
