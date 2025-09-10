import { json } from '@sveltejs/kit';

export async function DELETE({ params, locals }) {
  try {
    const { id } = params;
    const { user } = await locals.getSession();

    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!id) {
      return json({ error: 'Card ID is required' }, { status: 400 });
    }

    // Delete the card (RLS will ensure user can only delete their own cards)
    const { error: deleteError } = await locals.supabase
      .from('cards')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // Double-check RLS

    if (deleteError) {
      console.error('Error deleting card:', deleteError);
      return json({ error: 'Failed to delete card' }, { status: 500 });
    }

    return json({ success: true });

  } catch (error) {
    console.error('Error in cards delete API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
