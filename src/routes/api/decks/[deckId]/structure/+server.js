import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function PUT({ params, request }) {
  console.log('🔍 saveDeckStructure API: Endpoint called');
  try {
    const { deckId } = params;
    const { sections } = await request.json();

    console.log('🔍 saveDeckStructure API: Received sections:', sections.map(s => ({ id: s.id, name: s.name, position: sections.indexOf(s) })));

    // Test if position column exists by querying current sections
    const { data: currentSections, error: queryError } = await supabase
      .from('deck_sections')
      .select('id, name, position')
      .eq('deck_id', deckId);
    
    if (queryError) {
      console.error('❌ Error querying current sections:', queryError);
    } else {
      console.log('🔍 Current sections in DB:', currentSections);
    }

    // Get current section IDs from the request
    const currentSectionIds = sections.map(s => s.id).filter(id => id && !id.startsWith('section-'));
    
    // Delete sections that are no longer in the request
    if (currentSections && currentSections.length > 0) {
      const sectionsToDelete = currentSections.filter(s => !currentSectionIds.includes(s.id));
      if (sectionsToDelete.length > 0) {
        console.log('🔍 Deleting sections:', sectionsToDelete.map(s => s.id));
        const { error: deleteError } = await supabase
          .from('deck_sections')
          .delete()
          .in('id', sectionsToDelete.map(s => s.id));
        
        if (deleteError) {
          console.error('❌ Error deleting sections:', deleteError);
          throw deleteError;
        } else {
          console.log('✅ Successfully deleted sections');
        }
      }
    }

    // Process sections: update existing and create new ones
    for (const [index, section] of sections.entries()) {
      console.log(`🔍 Processing section ${index}: ${section.id} - ${section.name}`);
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
        console.log(`🔍 Updating section ${section.id} to position ${index}`);
        const { error } = await supabase
          .from('deck_sections')
          .update({ position: index, name: section.name })
          .eq('id', section.id);
        
        if (error) {
          console.error(`❌ Error updating section ${section.id}:`, error);
          throw error;
        } else {
          console.log(`✅ Successfully updated section ${section.id} to position ${index}`);
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