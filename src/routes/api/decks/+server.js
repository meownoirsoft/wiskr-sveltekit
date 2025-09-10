import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function GET({ url, locals }) {
  try {
    const projectId = url.searchParams.get('project_id');
    
    if (!projectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Get decks with sections and cards
    const { data: decks, error: decksError } = await supabase
      .from('decks')
      .select(`
        *,
        deck_sections (
          *,
          deck_cards (
            *,
            facts (*)
          )
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (decksError) {
      console.error('Error fetching decks:', decksError);
      return json({ error: 'Failed to fetch decks' }, { status: 500 });
    }

    // Transform the data to match our frontend structure
    const transformedDecks = decks.map(deck => ({
      id: deck.id,
      name: deck.name,
      description: deck.description,
      isPinned: deck.is_pinned,
      cardCount: deck.deck_sections.reduce((total, section) => total + section.deck_cards.length, 0),
      sections: deck.deck_sections
        .sort((a, b) => a.position - b.position)
        .map(section => ({
          id: section.id,
          name: section.name,
          position: section.position,
          cards: section.deck_cards
            .sort((a, b) => a.position - b.position)
            .map(deckCard => deckCard.facts)
        }))
    }));

    return json({ decks: transformedDecks });

  } catch (error) {
    console.error('Error in decks API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST({ request, locals }) {
  try {
    const { project_id, name, description } = await request.json();

    if (!project_id || !name) {
      return json({ error: 'Project ID and name are required' }, { status: 400 });
    }

    // Create deck
    const { data: deck, error: deckError } = await supabase
      .from('decks')
      .insert({
        project_id,
        name,
        description: description || null
      })
      .select()
      .single();

    if (deckError) {
      console.error('Error creating deck:', deckError);
      return json({ error: 'Failed to create deck' }, { status: 500 });
    }

    // Create default sections
    const defaultSections = [
      { name: 'Opening', position: 0 },
      { name: 'Development', position: 1 },
      { name: 'Climax', position: 2 },
      { name: 'Resolution', position: 3 }
    ];

    const { data: sections, error: sectionsError } = await supabase
      .from('deck_sections')
      .insert(
        defaultSections.map(section => ({
          deck_id: deck.id,
          name: section.name,
          position: section.position
        }))
      )
      .select();

    if (sectionsError) {
      console.error('Error creating sections:', sectionsError);
      return json({ error: 'Failed to create deck sections' }, { status: 500 });
    }

    return json({ 
      deck: {
        id: deck.id,
        name: deck.name,
        description: deck.description,
        isPinned: deck.is_pinned,
        cardCount: 0,
        sections: sections.map(section => ({
          id: section.id,
          name: section.name,
          position: section.position,
          cards: []
        }))
      }
    });

  } catch (error) {
    console.error('Error in decks POST API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
