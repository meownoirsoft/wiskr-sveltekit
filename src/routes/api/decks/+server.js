import { json } from '@sveltejs/kit';
import sql from '$lib/server/db.js';

export async function GET({ url, locals }) {
  try {
    const projectId = url.searchParams.get('project_id');
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
      SELECT dc.id, dc.section_id, dc.position, c.*
      FROM deck_cards dc
      JOIN cards c ON c.id = dc.card_id
      WHERE dc.section_id = ANY(${sectionIds})
      ORDER BY dc.position ASC
    ` : [];

    // Assemble nested structure
    const cardsBySection = {};
    for (const dc of deckCards) {
      (cardsBySection[dc.section_id] ??= []).push(dc);
    }

    const sectionsByDeck = {};
    for (const s of sections) {
      (sectionsByDeck[s.deck_id] ??= []).push({
        id: s.id,
        name: s.name,
        position: s.position,
        cards: (cardsBySection[s.id] ?? [])
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

    // Get the next position for this project
    const { data: maxPosition } = await db
      .from('decks')
      .select('position')
      .eq('project_id', project_id)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const nextPosition = (maxPosition?.position ?? -1) + 1;

    // Create deck
    const { data: deck, error: deckError } = await db
      .from('decks')
      .insert({
        project_id,
        name,
        description: description || null,
        position: nextPosition
      })
      .select()
      .single();

    if (deckError) {
      console.error('Error creating deck:', deckError);
      return json({ error: 'Failed to create deck' }, { status: 500 });
    }

    // Create default sections
    const defaultSections = [
      { name: 'New Section', position: 0 }
    ];

    const { data: sections, error: sectionsError } = await db
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
