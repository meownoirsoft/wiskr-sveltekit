import { json } from '@sveltejs/kit';

export async function POST({ params, request, locals }) {
  try {
    const { id } = params;
    const { title, content, tags, rarity, progress, investment_cost, art_url, pinned } = await request.json();
    
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
    if (investment_cost !== undefined) updateData.investment_cost = investment_cost;
    if (art_url !== undefined) updateData.art_url = art_url;
    if (pinned !== undefined) updateData.pinned = pinned;
    
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

    return json({ card });
  } catch (error) {
    console.error('Error in cards/update:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
