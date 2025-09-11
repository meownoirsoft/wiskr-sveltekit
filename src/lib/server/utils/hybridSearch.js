import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from './embeddings.js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Hybrid search combining dense embeddings, sparse BM25, and graph relationships
 * @param {string} query - Search query
 * @param {string} projectId - Project ID to limit search scope
 * @param {Object} options - Search options
 * @returns {Promise<Object>} - Search results with scores
 */
export async function hybridSearch(query, projectId, options = {}) {
  const {
    limit = 20,
    denseWeight = 0.4,
    sparseWeight = 0.3,
    graphWeight = 0.3,
    includeCards = true,
    includeDecks = true,
    includeSections = true,
    includeWorld = true,
    relationshipTypes = ['supports', 'example-of', 'evolves']
  } = options;

  try {
    // Generate embedding for dense search
    const queryEmbedding = await generateEmbedding(query);
    
    // Run all search methods in parallel
    const [denseResults, sparseResults, graphResults] = await Promise.all([
      denseSearch(queryEmbedding, projectId, limit * 2),
      sparseSearch(query, projectId, limit * 2),
      graphSearch(query, projectId, relationshipTypes, limit * 2)
    ]);

    // Combine and rank results
    const combinedResults = combineSearchResults(
      denseResults,
      sparseResults,
      graphResults,
      {
        denseWeight,
        sparseWeight,
        graphWeight,
        includeCards,
        includeDecks,
        includeSections,
        includeWorld
      }
    );

    // Apply structural priors and return top results
    const rankedResults = applyStructuralPriors(combinedResults, projectId);
    
    return {
      results: rankedResults.slice(0, limit),
      total: rankedResults.length,
      breakdown: {
        dense: denseResults.length,
        sparse: sparseResults.length,
        graph: graphResults.length
      }
    };

  } catch (error) {
    console.error('Error in hybrid search:', error);
    throw error;
  }
}

/**
 * Dense vector search using embeddings
 */
async function denseSearch(queryEmbedding, projectId, limit) {
  if (!queryEmbedding) return [];

  try {
    // Search cards
    const { data: cardResults } = await supabase.rpc('search_cards_semantic', {
      query_embedding: queryEmbedding,
      project_id: projectId,
      match_threshold: 0.3,
      match_count: limit
    });

    // Search decks
    const { data: deckResults } = await supabase.rpc('search_decks_semantic', {
      query_embedding: queryEmbedding,
      match_threshold: 0.3,
      match_count: limit
    });

    // Search deck sections
    const { data: sectionResults } = await supabase.rpc('search_deck_sections_semantic', {
      query_embedding: queryEmbedding,
      match_threshold: 0.3,
      match_count: limit
    });

    // Search card chunks
    const { data: chunkResults } = await supabase.rpc('search_card_chunks_semantic', {
      query_embedding: queryEmbedding,
      project_id: projectId,
      match_threshold: 0.3,
      match_count: limit
    });

    return [
      ...(cardResults || []).map(item => ({ ...item, type: 'card', source: 'dense' })),
      ...(deckResults || []).map(item => ({ ...item, type: 'deck', source: 'dense' })),
      ...(sectionResults || []).map(item => ({ ...item, type: 'section', source: 'dense' })),
      ...(chunkResults || []).map(item => ({ ...item, type: 'chunk', source: 'dense' }))
    ];

  } catch (error) {
    console.error('Error in dense search:', error);
    return [];
  }
}

/**
 * Sparse BM25 search using full-text search
 */
async function sparseSearch(query, projectId, limit) {
  try {
    const searchTerms = query.split(' ').filter(term => term.length > 2).join(' & ');
    if (!searchTerms) return [];

    // Search cards
    const { data: cardResults } = await supabase
      .from('cards')
      .select('id, title, content, tags, rarity, progress, created_at')
      .eq('project_id', projectId)
      .textSearch('searchable_text', searchTerms)
      .limit(limit);

    // Search decks
    const { data: deckResults } = await supabase
      .from('decks')
      .select('id, name, description, summary, tags, created_at')
      .eq('project_id', projectId)
      .textSearch('searchable_text', searchTerms)
      .limit(limit);

    // Search deck sections
    const { data: sectionResults } = await supabase
      .from('deck_sections')
      .select('id, name, summary, tags, deck_id, created_at')
      .eq('deck_id', supabase.from('decks').select('id').eq('project_id', projectId))
      .textSearch('searchable_text', searchTerms)
      .limit(limit);

    // Search world context
    const { data: worldResults } = await supabase
      .from('projects')
      .select('id, name, description, created_at')
      .eq('id', projectId)
      .textSearch('searchable_text', searchTerms)
      .limit(limit);

    return [
      ...(cardResults || []).map(item => ({ ...item, type: 'card', source: 'sparse' })),
      ...(deckResults || []).map(item => ({ ...item, type: 'deck', source: 'sparse' })),
      ...(sectionResults || []).map(item => ({ ...item, type: 'section', source: 'sparse' })),
      ...(worldResults || []).map(item => ({ ...item, type: 'world', source: 'sparse' }))
    ];

  } catch (error) {
    console.error('Error in sparse search:', error);
    return [];
  }
}

/**
 * Graph-based search using card relationships
 */
async function graphSearch(query, projectId, relationshipTypes, limit) {
  try {
    // First find cards that match the query
    const { data: matchingCards } = await supabase
      .from('cards')
      .select('id')
      .eq('project_id', projectId)
      .textSearch('searchable_text', query.split(' ').join(' & '))
      .limit(10);

    if (!matchingCards || matchingCards.length === 0) return [];

    const cardIds = matchingCards.map(card => card.id);

    // Find related cards through relationships
    const { data: relationships } = await supabase
      .from('card_relationships')
      .select(`
        target_card_id,
        relationship_type,
        strength,
        target_card:cards!card_relationships_target_card_id_fkey(
          id, title, content, tags, rarity, progress, created_at
        )
      `)
      .in('source_card_id', cardIds)
      .in('relationship_type', relationshipTypes);

    // Also get incoming relationships
    const { data: incomingRelationships } = await supabase
      .from('card_relationships')
      .select(`
        source_card_id,
        relationship_type,
        strength,
        source_card:cards!card_relationships_source_card_id_fkey(
          id, title, content, tags, rarity, progress, created_at
        )
      `)
      .in('target_card_id', cardIds)
      .in('relationship_type', relationshipTypes);

    const allRelationships = [
      ...(relationships || []).map(rel => ({
        ...rel.target_card,
        type: 'card',
        source: 'graph',
        relationship_type: rel.relationship_type,
        relationship_strength: rel.strength,
        relationship_direction: 'outgoing'
      })),
      ...(incomingRelationships || []).map(rel => ({
        ...rel.source_card,
        type: 'card',
        source: 'graph',
        relationship_type: rel.relationship_type,
        relationship_strength: rel.strength,
        relationship_direction: 'incoming'
      }))
    ];

    return allRelationships.slice(0, limit);

  } catch (error) {
    console.error('Error in graph search:', error);
    return [];
  }
}

/**
 * Combine results from different search methods
 */
function combineSearchResults(denseResults, sparseResults, graphResults, weights) {
  const resultMap = new Map();

  // Process dense results
  denseResults.forEach(item => {
    const key = `${item.type}_${item.id}`;
    const existing = resultMap.get(key) || { ...item, scores: {} };
    existing.scores.dense = item.similarity || 0;
    resultMap.set(key, existing);
  });

  // Process sparse results
  sparseResults.forEach(item => {
    const key = `${item.type}_${item.id}`;
    const existing = resultMap.get(key) || { ...item, scores: {} };
    existing.scores.sparse = 1.0; // BM25 relevance is implicit in results
    resultMap.set(key, existing);
  });

  // Process graph results
  graphResults.forEach(item => {
    const key = `${item.type}_${item.id}`;
    const existing = resultMap.get(key) || { ...item, scores: {} };
    existing.scores.graph = (item.relationship_strength || 0) * 0.8; // Weight relationship strength
    resultMap.set(key, existing);
  });

  // Calculate hybrid scores
  const combinedResults = Array.from(resultMap.values()).map(item => {
    const scores = item.scores;
    const hybridScore = 
      (scores.dense || 0) * weights.denseWeight +
      (scores.sparse || 0) * weights.sparseWeight +
      (scores.graph || 0) * weights.graphWeight;

    return {
      ...item,
      hybridScore,
      scoreBreakdown: {
        dense: scores.dense || 0,
        sparse: scores.sparse || 0,
        graph: scores.graph || 0
      }
    };
  });

  return combinedResults;
}

/**
 * Apply structural priors to improve ranking
 */
function applyStructuralPriors(results, projectId) {
  return results
    .map(item => {
      let prior = 1.0;

      // Boost cards with more relationships
      if (item.type === 'card' && item.relationship_strength) {
        prior += item.relationship_strength * 0.2;
      }

      // Boost recently created content
      const daysSinceCreation = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation < 7) prior += 0.1;
      else if (daysSinceCreation < 30) prior += 0.05;

      // Boost cards with higher rarity
      if (item.type === 'card' && item.rarity) {
        const rarityBoost = { common: 0, special: 0.1, rare: 0.2, legendary: 0.3 };
        prior += rarityBoost[item.rarity] || 0;
      }

      // Boost cards with higher progress
      if (item.type === 'card' && item.progress) {
        prior += (item.progress - 1) * 0.05;
      }

      return {
        ...item,
        finalScore: item.hybridScore * prior
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore);
}
