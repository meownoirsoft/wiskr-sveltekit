import { json } from '@sveltejs/kit';
import { supabaseAdmin, requireAuth } from '$lib/server/supabaseClient.js';
import { generateCardEmbedding } from '$lib/server/utils/embeddings.js';
import { generateWorldContext } from '$lib/server/utils/worldContext.js';
import { createCardChunks } from '$lib/server/utils/cardChunks.js';

export async function POST({ request, locals }) {
  try {
    const { project_id, title, content, tags, rarity, progress, mana_cost, art_url, generation_model, art_model, pinned } = await request.json();
    
    console.log('🎴 Card Creation API: Creating card:', { title, project_id, content: content?.substring(0, 50) + '...' });
    
    if (!project_id || !title) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user from session
    const user = await requireAuth(locals);

    // Insert new card
    const { data: card, error: insertError } = await supabaseAdmin
      .from('cards')
      .insert({
        project_id,
        user_id: user.id,
        title,
        content: content || '',
        tags: tags || [],
        rarity: rarity || 'common',
        progress: progress || 1,
        mana_cost: mana_cost || 1,
        art_url,
        generation_model: generation_model || 'GPT-4o',
        art_model: art_model || 'Midjourney',
        pinned: pinned || false
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Error creating card:', insertError);
      return json({ error: insertError.message }, { status: 500 });
    }

    console.log('🎴 Card Creation API: Card created successfully:', { id: card.id, title: card.title });

    // Generate embedding for the card content
    const embedding = await generateCardEmbedding(title, content);

    // Update card with embedding if generated
    if (embedding) {
      const { error: updateError } = await supabaseAdmin
        .from('cards')
        .update({ embedding })
        .eq('id', card.id);
      
      if (updateError) {
        console.error('Error updating card with embedding:', updateError);
      }
    }

    // Create chunks for long cards in background
    if (content && content.length > 2000) { // Roughly 500 tokens
      createCardChunks(card.id, content).catch(error => {
        console.error('Error creating card chunks:', error);
      });
    }

    // Update world context in background (don't await to avoid blocking)
    generateWorldContext(project_id, supabaseAdmin).catch(error => {
      console.error('Error updating world context:', error);
    });

    return json({ card });
  } catch (error) {
    console.error('Error in cards/create:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
