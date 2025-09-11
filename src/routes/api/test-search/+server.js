import { json } from '@sveltejs/kit';
import { generateCardEmbedding } from '$lib/server/utils/embeddings.js';

export async function GET({ url, locals }) {
  try {
    const searchTerm = url.searchParams.get('q') || 'cat';
    const projectId = url.searchParams.get('projectId');
    
    if (!projectId) {
      return json({ error: 'Project ID required' }, { status: 400 });
    }

    const { supabase } = locals;

    // Test 1: Check if we have any cards
    const { data: allCards, error: allCardsError } = await supabase
      .from('cards')
      .select('id, title, content, embedding IS NOT NULL as has_embedding')
      .eq('project_id', projectId)
      .limit(5);

    // Test 2: Try text search
    const { data: textResults, error: textError } = await supabase
      .from('cards')
      .select('id, title, content')
      .eq('project_id', projectId)
      .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,tags.ilike.%${searchTerm}%`)
      .limit(5);

    // Test 3: Try semantic search
    let semanticResults = [];
    let semanticError = null;
    try {
      const queryEmbedding = await generateCardEmbedding(searchTerm, '');
      if (queryEmbedding) {
        const { data, error } = await supabase.rpc('search_cards_semantic', {
          query_embedding: queryEmbedding,
          project_id: projectId,
          match_threshold: 0.3,
          match_count: 5
        });
        semanticResults = data || [];
        semanticError = error;
      }
    } catch (e) {
      semanticError = e.message;
    }

    return json({
      searchTerm,
      projectId,
      allCards: allCards?.length || 0,
      allCardsError: allCardsError?.message,
      sampleCards: allCards?.slice(0, 2) || [],
      textResults: textResults?.length || 0,
      textError: textError?.message,
      textMatches: textResults?.map(c => ({ title: c.title, content: c.content?.substring(0, 50) })) || [],
      semanticResults: semanticResults?.length || 0,
      semanticError: semanticError?.message,
      semanticMatches: semanticResults?.map(c => ({ title: c.title, similarity: c.similarity })) || []
    });

  } catch (error) {
    console.error('Test search error:', error);
    return json({ error: error.message }, { status: 500 });
  }
}
