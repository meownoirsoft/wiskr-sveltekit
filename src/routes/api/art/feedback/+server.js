import { json } from '@sveltejs/kit';

export async function POST({ request, locals }) {
  try {
    const { artUrl, cardId, reason, details } = await request.json();
    
    // Get user from session
    const { data: { user }, error: userError } = await locals.supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!artUrl || !cardId || !reason) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Store feedback in database
    const { error } = await locals.supabase
      .from('art_feedback')
      .insert({
        user_id: user.id,
        card_id: cardId,
        art_url: artUrl,
        reason: reason, // 'text_in_image', 'card_borders', 'low_quality', 'wrong_style', 'other'
        details: details || '',
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error storing art feedback:', error);
      return json({ error: 'Failed to store feedback' }, { status: 500 });
    }

    return json({ success: true, message: 'Feedback submitted successfully' });

  } catch (error) {
    console.error('Art feedback error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
