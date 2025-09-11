import { json } from '@sveltejs/kit';

// GET /api/cards/[cardId]/notes - Get all notes for a card
export async function GET({ params, locals }) {
  try {
    const { cardId } = params;
    
    if (!cardId) {
      return json({ error: 'Card ID is required' }, { status: 400 });
    }

    const { data: notes, error } = await locals.supabase
      .from('card_notes')
      .select('*')
      .eq('card_id', cardId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return json({ error: 'Failed to fetch notes' }, { status: 500 });
    }

    return json(notes || []);
  } catch (error) {
    console.error('Error in notes GET:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/cards/[cardId]/notes - Create a new note
export async function POST({ params, request, locals }) {
  try {
    const { cardId } = params;
    const { content } = await request.json();
    
    if (!cardId) {
      return json({ error: 'Card ID is required' }, { status: 400 });
    }

    if (!content || !content.trim()) {
      return json({ error: 'Note content is required' }, { status: 400 });
    }

    const { data: note, error } = await locals.supabase
      .from('card_notes')
      .insert({
        card_id: cardId,
        content: content.trim()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating note:', error);
      return json({ error: 'Failed to create note' }, { status: 500 });
    }

    return json(note, { status: 201 });
  } catch (error) {
    console.error('Error in notes POST:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
