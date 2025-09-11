import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { generateCardEmbedding } from '$lib/server/utils/embeddings.js';
import { generateWorldContext } from '$lib/server/utils/worldContext.js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST({ request, locals }) {
  try {
    const { project_id, title, content, tags, rarity, progress, mana_cost, art_url, generation_model, art_model, pinned } = await request.json();
    
    if (!project_id || !title) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user from session
    const { data: { user }, error: userError } = await locals.supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Insert new card
    const { data: card, error: insertError } = await locals.supabase
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

    // Generate embedding for the card content
    const embedding = await generateCardEmbedding(title, content);

    // Update card with embedding if generated
    if (embedding) {
      const { error: updateError } = await locals.supabase
        .from('cards')
        .update({ embedding })
        .eq('id', card.id);
      
      if (updateError) {
        console.error('Error updating card with embedding:', updateError);
      }
    }

    // Update world context in background (don't await to avoid blocking)
    generateWorldContext(project_id).catch(error => {
      console.error('Error updating world context:', error);
    });

    return json({ card });
  } catch (error) {
    console.error('Error in cards/create:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
