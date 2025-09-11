import { json } from '@sveltejs/kit';
import { generateEmbedding } from '$lib/server/utils/embeddings.js';

export async function POST({ request, locals }) {
  try {
    const { query, project_id, limit = 10, threshold = 0.7 } = await request.json();
    
    if (!query || !project_id) {
      return json({ error: 'Missing required fields: query and project_id' }, { status: 400 });
    }

    // Get user from session
    const { data: { user }, error: userError } = await locals.supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);
    
    if (!queryEmbedding) {
      return json({ error: 'Failed to generate search embedding' }, { status: 500 });
    }

    // Perform semantic search using vector similarity
    const { data: cards, error: searchError } = await locals.supabase.rpc('search_cards_semantic', {
      query_embedding: queryEmbedding,
      project_id: project_id,
      match_threshold: threshold,
      match_count: limit
    });

    if (searchError) {
      console.error('Semantic search error:', searchError);
      return json({ error: 'Search failed' }, { status: 500 });
    }

    return json({ cards: cards || [] });
  } catch (error) {
    console.error('Error in cards/search:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
