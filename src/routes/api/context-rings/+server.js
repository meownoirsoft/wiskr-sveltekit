import { json } from '@sveltejs/kit';
import { getContextRings } from '$lib/server/context/contextRings.js';

export async function POST({ request, locals }) {
  try {
    const { 
      operation = 'create',
      targetCards = [],
      deckId = null,
      sectionId = null,
      userMessage = '',
      budget = 'medium',
      projectId
    } = await request.json();
    
    // Get user from session
    const user = locals.user;
    const userError = !user ? { message: "Unauthorized" } : null;
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate project ID
    if (!projectId) {
      return json({ error: 'Project ID required' }, { status: 400 });
    }
    
    // Build context rings
    const context = await getContextRings({
      supabase: locals.db,
      projectId,
      operation,
      targetCards,
      deckId,
      sectionId,
      userMessage,
      budget
    });
    
    return json(context);
  } catch (error) {
    console.error('Error in context-rings API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
