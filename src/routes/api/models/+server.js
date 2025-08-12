// src/routes/api/models/+server.js
import { json } from '@sveltejs/kit';
import { getAvailableModels } from '$lib/server/openrouter.js';

export async function GET() {
  try {
    const models = getAvailableModels();
    
    return json({
      models: models,
      provider: models[0]?.provider || 'unknown',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    return json({ error: 'Failed to fetch models' }, { status: 500 });
  }
}
