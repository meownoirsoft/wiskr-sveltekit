import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function PUT({ params, request }) {
  try {
    const { deckId } = params;
    const { sections } = await request.json();
    console.log('--- Received request to update deck structure ---');
    console.log('Deck ID:', deckId);
    console.log('Incoming sections:', JSON.stringify(sections, null, 2));

    // Process sections: update existing and create new ones
    for (const [index, section] of sections.entries()) {
      if (section.id && section.id.startsWith('section-')) {
        // New section with temporary ID
        console.log(`Processing NEW section: ${section.name} at position ${index}`);
        const newDbSection = {
          id: uuidv4(),
          deck_id: deckId,
          name: section.name,
          position: index
        };

        console.log('Inserting into DB:', JSON.stringify(newDbSection, null, 2));
        const { data, error } = await supabase
          .from('deck_sections')
          .insert(newDbSection)
          .select()
          .single();

        if (error) {
          console.error('ERROR inserting new section:', error);
          throw error;
        }
        console.log('SUCCESS inserting new section. DB returned:', data);

      } else {
        // Existing section
        console.log(`Processing EXISTING section: ${section.name} at position ${index}`);
        const { error } = await supabase
          .from('deck_sections')
          .update({ position: index, name: section.name })
          .eq('id', section.id);
        
        if (error) {
          console.error('ERROR updating existing section:', error);
          throw error;
        }
        console.log(`SUCCESS updating section ${section.id}`);
      }
    }

    // Fetch the full updated deck structure to return
    console.log('--- Fetching updated deck from DB ---');
    const { data: updatedDeck, error: fetchError } = await supabase
      .from('decks')
      .select('*, sections:deck_sections(*, cards:deck_cards(*, ...facts(*)))')
      .eq('id', deckId)
      .single();

    if (fetchError) {
      console.error('ERROR fetching updated deck:', fetchError);
      throw fetchError;
    }

    // Sort sections and cards by position
    updatedDeck.sections.sort((a, b) => a.position - b.position);
    updatedDeck.sections.forEach(section => {
      section.cards.sort((a, b) => a.position - b.position);
      // Map card data from facts
      section.cards = section.cards.map(c => ({ ...c, ...c.facts }));
    });

    console.log('--- Successfully updated deck structure. Returning data. ---');
    return json(updatedDeck);
  } catch (error) {
    console.error('--- CAUGHT UNHANDLED ERROR in deck structure update ---');
    console.error(error);
    return json({ error: 'Failed to update deck structure', details: error.message }, { status: 500 });
  }
}