import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { generateDeckContext } from '$lib/server/utils/deckContext.js';

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
          position,
          deck_cards (
            id,
            position,
            cards (
              id,
              title,
              content,
              tags,
              rarity,
              progress,
              mana_cost,
              art_url
            )
          )
        )
      `)
      .eq('project_id', projectId)
      .order('position', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: true });

    if (decksError) {
      console.error('Error fetching decks:', decksError);
      return json({ error: 'Failed to fetch decks' }, { status: 500 });
    }

    // Transform the data to match the expected format
    const transformedDecks = decks.map(deck => {
      // Sort sections by position
      const sortedSections = deck.deck_sections?.sort((a, b) => (a.position || 0) - (b.position || 0)) || [];
      
      return {
        id: deck.id,
        name: deck.name,
        description: deck.description,
        isPinned: deck.is_pinned || false,
        cardCount: sortedSections.reduce((total, section) => 
          total + (section.deck_cards?.length || 0), 0),
        sections: sortedSections.map(section => {
          // Sort cards by position within each section
          const sortedCards = section.deck_cards?.sort((a, b) => (a.position || 0) - (b.position || 0)) || [];
          
          return {
            id: section.id,
            name: section.name,
            cards: sortedCards.map(deckCard => {
              // Use the card data directly from the cards table
              const card = deckCard.cards;
              
              return {
                id: card.id,
                title: card.title,
                content: card.content,
                tags: card.tags || [],
                rarity: card.rarity || 'common',
                progress: card.progress || 1,
                mana_cost: card.mana_cost || 1,
                art_url: card.art_url,
                generation_model: card.generation_model || 'GPT-4o',
                art_model: card.art_model || 'Midjourney',
                created_at: card.created_at
              };
            })
          };
        })
      };
    });

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

    // Get the next position for this project
    const { data: maxPosition } = await supabase
      .from('decks')
      .select('position')
      .eq('project_id', projectId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const nextPosition = (maxPosition?.position ?? -1) + 1;

    // Create the deck with proper position
    const { data: deck, error: deckError } = await supabase
      .from('decks')
      .insert({
        project_id: projectId,
        name,
        description: description || '',
        position: nextPosition
      })
      .select()
      .single();

    if (deckError) {
      console.error('Error creating deck:', deckError);
      return json({ error: 'Failed to create deck' }, { status: 500 });
    }

    // Create default sections for the deck
    const defaultSections = [
      { name: 'New Section' }
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

    // Generate context for the new deck in background
    generateDeckContext(deck.id, supabase).catch(error => {
      console.error('Error generating context for new deck:', error);
    });

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
