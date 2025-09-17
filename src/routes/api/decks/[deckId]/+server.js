import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function PATCH({ params, request, locals }) {
  try {
    const { deckId } = params;
    const { name, description, position, is_pinned } = await request.json();

    if (!deckId) {
      return json({ error: 'Deck ID is required' }, { status: 400 });
    }

    // Check if deck exists
    const { data: existingDeck, error: fetchError } = await supabase
      .from('decks')
      .select('id, project_id')
      .eq('id', deckId)
      .single();

    if (fetchError || !existingDeck) {
      return json({ error: 'Deck not found' }, { status: 404 });
    }

    // Update deck
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (position !== undefined) updateData.position = position;
    if (is_pinned !== undefined) updateData.is_pinned = is_pinned;

    const { data: updatedDeck, error: updateError } = await supabase
      .from('decks')
      .update(updateData)
      .eq('id', deckId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating deck:', updateError);
      return json({ error: 'Failed to update deck' }, { status: 500 });
    }

    return json({ 
      success: true,
      deck: {
        id: updatedDeck.id,
        name: updatedDeck.name,
        description: updatedDeck.description,
        isPinned: updatedDeck.is_pinned,
        position: updatedDeck.position
      }
    });

  } catch (error) {
    console.error('Error in deck PATCH API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE({ params, locals }) {
  try {
    const { deckId } = params;

    if (!deckId) {
      return json({ error: 'Deck ID is required' }, { status: 400 });
    }

    // Check if deck exists
    const { data: existingDeck, error: fetchError } = await supabase
      .from('decks')
      .select('id')
      .eq('id', deckId)
      .single();

    if (fetchError || !existingDeck) {
      return json({ error: 'Deck not found' }, { status: 404 });
    }

    // Delete deck (cascade will handle sections and cards)
    const { error: deleteError } = await supabase
      .from('decks')
      .delete()
      .eq('id', deckId);

    if (deleteError) {
      console.error('Error deleting deck:', deleteError);
      return json({ error: 'Failed to delete deck' }, { status: 500 });
    }

    return json({ success: true });

  } catch (error) {
    console.error('Error in deck DELETE API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

