import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function PUT({ params, request }) {
  try {
    const { deckId } = params;
    const { sections } = await request.json();

    // Process sections: update existing and create new ones
    for (const [index, section] of sections.entries()) {
      if (section.id && section.id.startsWith('section-')) {
        // New section with temporary ID
        const newDbSection = {
          id: uuidv4(),
          deck_id: deckId,
          name: section.name,
          position: index
        };

        const { data, error } = await supabase
          .from('deck_sections')
          .insert(newDbSection)
          .select()
          .single();

        if (error) {
          throw error;
        }

      } else {
        // Existing section
        const { error } = await supabase
          .from('deck_sections')
          .update({ position: index, name: section.name })
          .eq('id', section.id);
        
        if (error) {
          throw error;
        }
      }
    }

    // Fetch the full updated deck structure to return
    const { data: updatedDeck, error: fetchError } = await supabase
      .from('decks')
      .select(`
        *,
        sections:deck_sections(
          *,
          cards:deck_cards(
            id,
            position,
            ...cards(*)
          )
        )
      `)
      .eq('id', deckId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Sort sections and cards by position
    updatedDeck.sections.sort((a, b) => a.position - b.position);
    updatedDeck.sections.forEach(section => {
      section.cards.sort((a, b) => a.position - b.position);
      // Map card data from the nested relationship
      section.cards = section.cards.map(c => ({ ...c, ...c.cards }));
    });

    return json(updatedDeck);
  } catch (error) {
    console.error('Error updating deck structure:', error);
    return json({ error: 'Failed to update deck structure', details: error.message }, { status: 500 });
  }
}