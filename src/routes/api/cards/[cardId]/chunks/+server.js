import { json } from '@sveltejs/kit';
import { 
  createCardChunks, 
  getCardChunks, 
  deleteCardChunks, 
  searchCardChunks,
  updateCardChunks
} from '$lib/server/utils/cardChunks.js';

export async function GET({ params, url, locals }) {
  try {
    const { cardId } = params;
    const searchQuery = url.searchParams.get('search');
    const projectId = url.searchParams.get('projectId');

    // Check authentication
    const { data: { user }, error: userError } = await locals.supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (searchQuery && projectId) {
      const chunks = await searchCardChunks(searchQuery, projectId);
      return json({ chunks });
    }

    const chunks = await getCardChunks(cardId);
    return json({ chunks });

  } catch (error) {
    console.error('Error in card chunks GET API:', error);
    return json({ error: 'Failed to get card chunks' }, { status: 500 });
  }
}

export async function POST({ params, request, locals }) {
  try {
    const { cardId } = params;
    const { content, maxTokens } = await request.json();

    if (!content) {
      return json({ error: 'content is required' }, { status: 400 });
    }

    // Check authentication
    const { data: { user }, error: userError } = await locals.supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chunks = await createCardChunks(cardId, content, maxTokens);
    return json({ chunks });

  } catch (error) {
    console.error('Error in card chunks POST API:', error);
    return json({ error: 'Failed to create card chunks' }, { status: 500 });
  }
}

export async function PUT({ params, request, locals }) {
  try {
    const { cardId } = params;
    const { content, maxTokens } = await request.json();

    if (!content) {
      return json({ error: 'content is required' }, { status: 400 });
    }

    // Check authentication
    const { data: { user }, error: userError } = await locals.supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chunks = await updateCardChunks(cardId, content, maxTokens);
    return json({ chunks });

  } catch (error) {
    console.error('Error in card chunks PUT API:', error);
    return json({ error: 'Failed to update card chunks' }, { status: 500 });
  }
}

export async function DELETE({ params, locals }) {
  try {
    const { cardId } = params;

    // Check authentication
    const { data: { user }, error: userError } = await locals.supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    await deleteCardChunks(cardId);
    return json({ success: true });

  } catch (error) {
    console.error('Error in card chunks DELETE API:', error);
    return json({ error: 'Failed to delete card chunks' }, { status: 500 });
  }
}
