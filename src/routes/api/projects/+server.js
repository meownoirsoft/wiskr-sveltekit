import { json } from '@sveltejs/kit';

/**
 * Get user's projects
 * @type {import('@sveltejs/kit').RequestHandler}
 */
export async function GET({ locals }) {
  try {
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: projects, error } = await locals.supabase
      .from('projects')
      .select('id, name, description, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    return json({ projects: projects || [] });

  } catch (error) {
    console.error('Projects API error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
