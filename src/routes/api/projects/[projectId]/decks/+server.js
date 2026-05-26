import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/queries.js';
import sql from '$lib/server/db.js';
import { generateDeckContext } from '$lib/server/utils/deckContext.js';

export async function GET({ params }) {
  try {
    const { projectId } = params;
    if (!projectId) return json({ error: 'Project ID is required' }, { status: 400 });

    const decks = await sql`
      SELECT id, name, description, is_pinned, position
      FROM decks
      WHERE project_id = ${projectId}
      ORDER BY position ASC NULLS FIRST, created_at ASC
    `;

    if (!decks.length) return json({ decks: [] });

    const deckIds = decks.map(d => d.id);

    const sections = await sql`
      SELECT id, deck_id, name, position
      FROM deck_sections
      WHERE deck_id = ANY(${deckIds})
      ORDER BY position ASC
    `;

    const sectionIds = sections.map(s => s.id);

    const deckCards = sectionIds.length ? await sql`
      SELECT dc.id, dc.section_id, dc.position,
             c.id as card_id, c.title, c.content, c.tags, c.rarity,
             c.progress, c.mana_cost, c.art_url, c.generation_model,
             c.art_model, c.created_at as card_created_at
      FROM deck_cards dc
      JOIN cards c ON c.id = dc.card_id
      WHERE dc.section_id = ANY(${sectionIds})
      ORDER BY dc.position ASC
    ` : [];

    const cardsBySection = {};
    for (const dc of deckCards) {
      (cardsBySection[dc.section_id] ??= []).push({
        id: dc.card_id,
        title: dc.title,
        content: dc.content,
        tags: dc.tags || [],
        rarity: dc.rarity || 'common',
        progress: dc.progress || 1,
        mana_cost: dc.mana_cost || 1,
        art_url: dc.art_url,
        generation_model: dc.generation_model || 'GPT-4o',
        art_model: dc.art_model || 'Midjourney',
        created_at: dc.card_created_at
      });
    }

    const sectionsByDeck = {};
    for (const s of sections) {
      (sectionsByDeck[s.deck_id] ??= []).push({
        id: s.id,
        name: s.name,
        position: s.position,
        cards: cardsBySection[s.id] ?? []
      });
    }

    const transformedDecks = decks.map(deck => ({
      id: deck.id,
      name: deck.name,
      description: deck.description,
      isPinned: deck.is_pinned,
      cardCount: (sectionsByDeck[deck.id] ?? []).reduce((n, s) => n + s.cards.length, 0),
      sections: sectionsByDeck[deck.id] ?? []
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

    // Get the next position for this project
    const { data: maxPosition } = await db
      .from('decks')
      .select('position')
      .eq('project_id', projectId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const nextPosition = (maxPosition?.position ?? -1) + 1;

    // Create the deck with proper position
    const { data: deck, error: deckError } = await db
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

    const { data: sections, error: sectionsError } = await db
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
    generateDeckContext(deck.id, db).catch(error => {
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
