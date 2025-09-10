import { json } from '@sveltejs/kit';

export async function POST({ request, locals }) {
  try {
    const { cardId, artUrl } = await request.json();
    
    console.log('🔍 Art API received:', { cardId, artUrl });

    if (!cardId || !artUrl) {
      console.error('❌ Missing required fields:', { cardId, artUrl });
      return json({ error: 'Card ID and art URL are required' }, { status: 400 });
    }

    // Get the current card data
    console.log('🔍 Fetching card from database:', cardId);
    const { data: currentCard, error: fetchError } = await locals.supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching card:', fetchError);
      return json({ error: 'Card not found' }, { status: 404 });
    }
    
    console.log('🔍 Found card:', { id: currentCard.id, title: currentCard.title, art_url: currentCard.art_url });

    // Update the art URL directly in the cards table
    console.log('🔍 Updating art_url from', currentCard.art_url, 'to', artUrl);
    
    const { data: updatedCard, error: updateError } = await locals.supabase
      .from('cards')
      .update({
        art_url: artUrl
      })
      .eq('id', cardId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating card art:', updateError);
      return json({ error: 'Failed to update card art' }, { status: 500 });
    }

    console.log('✅ Successfully updated card art in database:', { id: updatedCard.id, art_url: artUrl });
    return json({ 
      success: true, 
      card: {
        id: updatedCard.id,
        art_url: artUrl
      }
    });

  } catch (error) {
    console.error('Error in card art API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
