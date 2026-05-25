import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/queries.js';


export async function GET({ url, locals }) {
  try {
    // Check authentication
    const user = locals.user;
    const userError = !user ? { message: "Unauthorized" } : null;
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sectionId = url.searchParams.get('sectionId');
    if (!sectionId) {
      return json({ error: 'sectionId is required' }, { status: 400 });
    }

    // Get section with its cards
    const { data: section, error: sectionError } = await db
      .from('deck_sections')
      .select(`
        id,
        name,
        deck_id,
        deck_cards (
          id,
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
      `)
      .eq('id', sectionId)
      .single();

    if (sectionError) {
      console.error('Error fetching section:', sectionError);
      return json({ error: 'Failed to fetch section' }, { status: 500 });
    }

    // Transform the data to match the expected format
    const transformedSection = {
      id: section.id,
      name: section.name,
      deckId: section.deck_id,
      cards: section.deck_cards?.map(deckCard => {
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
      }) || []
    };

    return json({ section: transformedSection });

  } catch (error) {
    console.error('Error in deck-sections GET API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
