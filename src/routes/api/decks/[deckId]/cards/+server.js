import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST({ params, request }) {
  try {
    const { deckId } = params;
    const { card_id, section_id, position } = await request.json();

    if (!card_id || !section_id || position === undefined) {
      return json({ error: 'card_id, section_id, and position are required' }, { status: 400 });
    }

    // Remove card from any other deck first (since cards can only be in one deck)
    const { error: deleteError } = await supabase
      .from('deck_cards')
      .delete()
      .eq('card_id', card_id);

    if (deleteError) {
      console.error('Error removing card from other decks:', deleteError);
      return json({ error: 'Failed to remove card from other decks' }, { status: 500 });
    }

    // Add card to the specified deck and section
    const { data: deckCard, error: insertError } = await supabase
      .from('deck_cards')
      .insert({
        deck_id: deckId,
        section_id,
        card_id,
        position
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error adding card to deck:', insertError);
      return json({ error: 'Failed to add card to deck' }, { status: 500 });
    }

    return json({ success: true, deckCard });

  } catch (error) {
    console.error('Error in deck cards POST API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE({ params, request }) {
  try {
    const { deckId } = params;
    const { card_id } = await request.json();

    if (!card_id) {
      return json({ error: 'card_id is required' }, { status: 400 });
    }

    // Remove card from deck
    const { error: deleteError } = await supabase
      .from('deck_cards')
      .delete()
      .eq('deck_id', deckId)
      .eq('card_id', card_id);

    if (deleteError) {
      console.error('Error removing card from deck:', deleteError);
      return json({ error: 'Failed to remove card from deck' }, { status: 500 });
    }

    return json({ success: true });

  } catch (error) {
    console.error('Error in deck cards DELETE API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
