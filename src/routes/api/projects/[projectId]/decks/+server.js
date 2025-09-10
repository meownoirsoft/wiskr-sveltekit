import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function GET({ params }) {
  try {
    const { projectId } = params;

    if (!projectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Get decks for the project
    const { data: decks, error: decksError } = await supabase
      .from('decks')
      .select(`
        *,
        deck_sections (
          id,
          name,
          deck_cards (
            id,
            cards (
              id,
              title,
              content,
              tags,
              rarity,
              progress,
              investment_cost,
              art_url
            )
          )
        )
      `)
      .eq('project_id', projectId)
      .order('created_at');

    if (decksError) {
      console.error('Error fetching decks:', decksError);
      return json({ error: 'Failed to fetch decks' }, { status: 500 });
    }

    // Transform the data to match the expected format
    const transformedDecks = decks.map(deck => ({
      id: deck.id,
      name: deck.name,
      description: deck.description,
      isPinned: deck.is_pinned || false,
      cardCount: deck.deck_sections?.reduce((total, section) => 
        total + (section.deck_cards?.length || 0), 0) || 0,
      sections: deck.deck_sections?.map(section => ({
        id: section.id,
        name: section.name,
        cards: section.deck_cards?.map(deckCard => {
          // Use the card data directly from the cards table
          const card = deckCard.cards;
          
          return {
            id: card.id,
            title: card.title,
            content: card.content,
            tags: card.tags || [],
            rarity: card.rarity || 'common',
            progress: card.progress || 1,
            investment_cost: card.investment_cost || 1,
            art_url: card.art_url
          };
        }) || []
      })) || []
    }));

    return json({ decks: transformedDecks });

  } catch (error) {
    console.error('Error in decks GET API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST({ params, request }) {
  try {
    const { projectId } = params;
    const { name, description } = await request.json();

    if (!projectId || !name) {
      return json({ error: 'Project ID and name are required' }, { status: 400 });
    }

    // Create the deck (without position column for now)
    const { data: deck, error: deckError } = await supabase
      .from('decks')
      .insert({
        project_id: projectId,
        name,
        description: description || ''
      })
      .select()
      .single();

    if (deckError) {
      console.error('Error creating deck:', deckError);
      return json({ error: 'Failed to create deck' }, { status: 500 });
    }

    // Create default sections for the deck
    const defaultSections = [
      { name: 'Opening' },
      { name: 'Development' },
      { name: 'Climax' },
      { name: 'Resolution' }
    ];

    const { data: sections, error: sectionsError } = await supabase
      .from('deck_sections')
      .insert(
        defaultSections.map(section => ({
          deck_id: deck.id,
          name: section.name
        }))
      )
      .select();

    if (sectionsError) {
      console.error('Error creating deck sections:', sectionsError);
      // Don't fail the request, just log the error
    }

    return json({ 
      deck: {
        id: deck.id,
        name: deck.name,
        description: deck.description,
        isPinned: deck.is_pinned || false,
        cardCount: 0,
        sections: sections || []
      }
    });

  } catch (error) {
    console.error('Error in decks POST API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
