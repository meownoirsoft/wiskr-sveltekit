import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST({ request, locals }) {
  try {
    const { project_id, title, content, tags, rarity, progress, investment_cost, art_url } = await request.json();
    
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
        investment_cost: investment_cost || 1,
        art_url
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Error creating card:', insertError);
      return json({ error: insertError.message }, { status: 500 });
    }

    return json({ card });
  } catch (error) {
    console.error('Error in cards/create:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
