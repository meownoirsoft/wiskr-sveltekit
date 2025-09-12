// API endpoint for updating card rarity
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
    const { cardId, newRarity } = body;

    // Validate required fields
    if (!cardId) {
      return json({ error: 'cardId is required' }, { status: 400 });
    }

    if (!newRarity) {
      return json({ error: 'newRarity is required' }, { status: 400 });
    }

    // Validate rarity value
    const validRarities = ['common', 'special', 'rare', 'legendary'];
    if (!validRarities.includes(newRarity)) {
      return json({ error: 'Invalid rarity. Must be one of: common, special, rare, legendary' }, { status: 400 });
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
      rarity: currentCard.rarity
    });

    // Update the rarity directly in the cards table
    console.log('🔄 API: Updating card rarity in database:', newRarity);
    
    const { data: updatedCard, error: updateError } = await locals.supabase
      .from('cards')
      .update({
        rarity: newRarity
      })
      .eq('id', cardId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating card rarity:', updateError);
      return json({ error: 'Failed to update card rarity' }, { status: 500 });
    }

    console.log('✅ API: Successfully updated card in database:', {
      id: updatedCard.id,
      newRarity: updatedCard.rarity
    });

    // Parse the updated card data for response
    const responseCard = {
      id: updatedCard.id,
      title: updatedCard.title,
      content: updatedCard.content,
      tags: updatedCard.tags || [],
      type: updatedCard.type || 'other',
      rarity: updatedCard.rarity,
      progress: updatedCard.progress || 1,
      mana_cost: updatedCard.mana_cost || 0,
      art_url: updatedCard.art_url,
      pinned: updatedCard.pinned,
      created_at: updatedCard.created_at,
      project_id: updatedCard.project_id
    };

    return json({ 
      success: true, 
      card: responseCard,
      message: `Card rarity updated to ${newRarity}`
    });

  } catch (error) {
    console.error('Error in rarity update API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
