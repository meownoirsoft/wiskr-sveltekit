import { json } from '@sveltejs/kit';
import { generateCardEmbedding } from '$lib/server/utils/embeddings.js';

export async function POST({ params, request, locals }) {
  try {
    const { id } = params;
    const { title, content, tags, rarity, progress, mana_cost, art_url, pinned, generation_model, art_model } = await request.json();
    
    if (!id) {
      return json({ error: 'Missing card ID' }, { status: 400 });
    }

    // Get user from session
    const { data: { user }, error: userError } = await locals.supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build update object with only provided fields
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (tags !== undefined) updateData.tags = tags;
    if (rarity !== undefined) updateData.rarity = rarity;
    if (progress !== undefined) updateData.progress = progress;
    if (mana_cost !== undefined) updateData.mana_cost = mana_cost;
    if (art_url !== undefined) updateData.art_url = art_url;
    if (pinned !== undefined) updateData.pinned = pinned;
    if (generation_model !== undefined) updateData.generation_model = generation_model;
    if (art_model !== undefined) updateData.art_model = art_model;
    
    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    // Update the card
    const { data: card, error: updateError } = await locals.supabase
      .from('cards')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user can only update their own cards
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating card:', updateError);
      return json({ error: updateError.message }, { status: 500 });
    }

    if (!card) {
      return json({ error: 'Card not found or access denied' }, { status: 404 });
    }

    // Regenerate embedding if content or title changed
    if ((content !== undefined || title !== undefined) && (card.content || card.title)) {
      const embedding = await generateCardEmbedding(card.title, card.content);

      // Update card with new embedding if generated
      if (embedding) {
        const { error: embeddingError } = await locals.supabase
          .from('cards')
          .update({ embedding })
          .eq('id', card.id);
        
        if (embeddingError) {
          console.error('Error updating card with embedding:', embeddingError);
        }
      }
    }

    return json({ card });
  } catch (error) {
    console.error('Error in cards/update:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
