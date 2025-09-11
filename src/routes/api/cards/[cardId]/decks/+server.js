import { json } from '@sveltejs/kit';
import { supabaseAdmin, requireAuth } from '$lib/server/supabaseClient.js';

export async function GET({ params, locals }) {
  try {
    const user = await requireAuth(locals);
    const { cardId } = params;

    if (!cardId) {
      return json({ error: 'Card ID is required' }, { status: 400 });
    }

    // Get decks that contain this card
    const { data: cardDecks, error } = await supabaseAdmin
      .from('deck_cards')
      .select(`
        deck_id,
        decks (
          id,
          name,
          description,
          created_at
        )
      `)
      .eq('card_id', cardId);

    if (error) {
      console.error('Error fetching card decks:', error);
      return json({ error: 'Failed to fetch card decks' }, { status: 500 });
    }

    // Transform the data to a simpler format
    const decks = cardDecks?.map(cd => ({
      id: cd.decks.id,
      name: cd.decks.name,
      description: cd.decks.description,
      created_at: cd.decks.created_at
    })) || [];

    return json(decks);

  } catch (error) {
    console.error('Error in card decks API:', error);
    return json({ error: 'Failed to fetch card decks' }, { status: 500 });
  }
}
