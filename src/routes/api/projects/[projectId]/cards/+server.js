import { json } from '@sveltejs/kit';

export async function GET({ params, locals }) {
  try {
    const { projectId } = params;

    if (!projectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Check authentication
    const { data: { user }, error: userError } = await locals.supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to the project
    const { data: project, error: projectError } = await locals.supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Get cards for the project
    const { data: cards, error: cardsError } = await locals.supabase
      .from('cards')
      .select('id, title, content, tags, rarity, progress, mana_cost, art_url, created_at, project_id')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (cardsError) {
      console.error('Error fetching cards:', cardsError);
      return json({ error: 'Failed to fetch cards' }, { status: 500 });
    }

    return json({ cards: cards || [] });

  } catch (error) {
    console.error('Error in project cards API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
