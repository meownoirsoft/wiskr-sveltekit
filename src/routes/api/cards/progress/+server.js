// API endpoint for updating card progress
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
  // Check authentication
  const { data: { user } } = await locals.supabase.auth.getUser();
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { cardId, newProgress } = body;

    // Validate required fields
    if (!cardId) {
      return json({ error: 'cardId is required' }, { status: 400 });
    }

    if (!newProgress) {
      return json({ error: 'newProgress is required' }, { status: 400 });
    }

    // Validate progress value (1-5)
    if (!Number.isInteger(newProgress) || newProgress < 1 || newProgress > 5) {
      return json({ error: 'Invalid progress. Must be an integer between 1 and 5' }, { status: 400 });
    }

    // Get the current card
    const { data: currentCard, error: fetchError } = await locals.supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .single();

    if (fetchError || !currentCard) {
      console.error('Card not found:', fetchError);
      return json({ error: 'Card not found' }, { status: 404 });
    }

    console.log('Current card data:', {
      id: currentCard.id,
      title: currentCard.title,
      progress: currentCard.progress
    });

    // Update the progress directly in the cards table
    console.log('🔄 API: Updating card progress in database:', newProgress);
    
    const { data: updatedCard, error: updateError } = await locals.supabase
      .from('cards')
      .update({
        progress: newProgress
      })
      .eq('id', cardId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating card progress:', updateError);
      return json({ error: 'Failed to update card progress' }, { status: 500 });
    }

    console.log('✅ API: Successfully updated card progress in database:', {
      id: updatedCard.id,
      newProgress: updatedCard.progress
    });

    // Parse the updated card data for response
    const responseCard = {
      id: updatedCard.id,
      title: updatedCard.title,
      content: updatedCard.content,
      tags: updatedCard.tags || [],
      type: updatedCard.type || 'other',
      rarity: updatedCard.rarity,
      progress: updatedCard.progress,
      mana_cost: updatedCard.mana_cost || 0,
      art_url: updatedCard.art_url,
      pinned: updatedCard.pinned,
      created_at: updatedCard.created_at,
      project_id: updatedCard.project_id
    };

    return json({ 
      success: true, 
      card: responseCard,
      message: `Card progress updated to ${newProgress} stars`
    });

  } catch (error) {
    console.error('Error in progress update API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
