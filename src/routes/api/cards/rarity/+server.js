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
      .from('facts')
      .select('*')
      .eq('id', cardId)
      .single();

    if (fetchError || !currentCard) {
      console.error('Card not found:', fetchError);
      return json({ error: 'Card not found' }, { status: 404 });
    }

    console.log('Current card data:', {
      id: currentCard.id,
      type: currentCard.type,
      key: currentCard.key,
      value: currentCard.value,
      valueType: typeof currentCard.value
    });

    // Parse the current card data
    let cardData;
    try {
      cardData = JSON.parse(currentCard.value);
      console.log('Successfully parsed card data:', cardData);
    } catch (e) {
      console.error('Failed to parse card data:', e);
      console.error('Raw value:', currentCard.value);
      
      // If it's not JSON, it might be an old fact format - convert it
      if (currentCard.type === 'card') {
        return json({ error: 'Invalid card data format - expected JSON but got: ' + typeof currentCard.value }, { status: 400 });
      } else {
        // Convert old fact format to card format
        cardData = {
          content: currentCard.value,
          tags: [],
          type: 'other',
          rarity: 'common',
          progress: 1,
          investment_cost: 0,
          art_url: null
        };
        console.log('Converted old fact to card format:', cardData);
      }
    }

    // Update the rarity
    cardData.rarity = newRarity;

    // Update the card in the database
    console.log('🔄 API: Updating card in database with new rarity:', newRarity);
    console.log('🔄 API: Card data to save:', JSON.stringify(cardData, null, 2));
    
    const { data: updatedCard, error: updateError } = await locals.supabase
      .from('facts')
      .update({
        value: JSON.stringify(cardData),
        type: 'card'  // Ensure it's marked as a card
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
      newValue: updatedCard.value
    });

    // Parse the updated card data for response
    const responseCard = {
      id: updatedCard.id,
      title: updatedCard.key,
      content: cardData.content,
      tags: cardData.tags || [],
      type: cardData.type || 'other',
      rarity: cardData.rarity,
      progress: cardData.progress || 1,
      investment_cost: cardData.investment_cost || 0,
      art_url: cardData.art_url,
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
