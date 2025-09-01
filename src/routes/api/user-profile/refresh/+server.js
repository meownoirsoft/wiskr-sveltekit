import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
  try {
    if (!locals.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = locals.user.id;
    
    // Fetch the latest user profile from the database
    const { data: profile, error } = await locals.supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    // Return the updated profile data
    return json({ 
      success: true, 
      profile,
      message: 'Profile refreshed successfully'
    });

  } catch (error) {
    console.error('Error in profile refresh:', error);
    return json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
