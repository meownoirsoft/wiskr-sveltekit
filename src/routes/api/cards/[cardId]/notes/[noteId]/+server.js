import { json } from '@sveltejs/kit';

// PUT /api/cards/[cardId]/notes/[noteId] - Update a note
export async function PUT({ params, request, locals }) {
  try {
    const { cardId, noteId } = params;
    const { content } = await request.json();
    
    if (!cardId || !noteId) {
      return json({ error: 'Card ID and Note ID are required' }, { status: 400 });
    }

    if (!content || !content.trim()) {
      return json({ error: 'Note content is required' }, { status: 400 });
    }

    const { data: note, error } = await locals.supabase
      .from('card_notes')
      .update({
        content: content.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .eq('card_id', cardId) // Ensure the note belongs to the card
      .select()
      .single();

    if (error) {
      console.error('Error updating note:', error);
      return json({ error: 'Failed to update note' }, { status: 500 });
    }

    if (!note) {
      return json({ error: 'Note not found' }, { status: 404 });
    }

    return json(note);
  } catch (error) {
    console.error('Error in note PUT:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/cards/[cardId]/notes/[noteId] - Delete a note
export async function DELETE({ params, locals }) {
  try {
    const { cardId, noteId } = params;
    
    if (!cardId || !noteId) {
      return json({ error: 'Card ID and Note ID are required' }, { status: 400 });
    }

    const { error } = await locals.supabase
      .from('card_notes')
      .delete()
      .eq('id', noteId)
      .eq('card_id', cardId); // Ensure the note belongs to the card

    if (error) {
      console.error('Error deleting note:', error);
      return json({ error: 'Failed to delete note' }, { status: 500 });
    }

    return json({ success: true });
  } catch (error) {
    console.error('Error in note DELETE:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
