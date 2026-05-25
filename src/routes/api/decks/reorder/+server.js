import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/queries.js';


export async function POST({ request, locals }) {
  try {
    const { projectId, deckOrders } = await request.json();

    if (!projectId || !deckOrders || !Array.isArray(deckOrders)) {
      return json({ error: 'Project ID and deck orders array are required' }, { status: 400 });
    }

    // Update each deck's position
    const updatePromises = deckOrders.map(({ deckId, position }) => 
      db
        .from('decks')
        .update({ position })
        .eq('id', deckId)
        .eq('project_id', projectId)
    );

    const results = await Promise.all(updatePromises);
    
    // Check for any errors
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('Error updating deck positions:', errors);
      return json({ error: 'Failed to update some deck positions' }, { status: 500 });
    }

    return json({ success: true, updated: deckOrders.length });

  } catch (error) {
    console.error('Error in deck reorder API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
