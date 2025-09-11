import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from './embeddings.js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Generate candidates using dense + sparse retrieval with structural boosts and MMR diversification
 * @param {string} query - Search query
 * @param {string} projectId - Project ID to limit search scope
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} - Ranked candidates with scores
 */
export async function generateCandidates(query, projectId, options = {}) {
  const {
    topK = 50,
    finalLimit = 10,
    denseWeight = 0.4,
    sparseWeight = 0.3,
    graphWeight = 0.3,
    mmrLambda = 0.7, // 0.7 = 70% relevance, 30% diversity
    includeCards = true,
    includeDecks = true,
    includeSections = true,
    relationshipTypes = ['supports', 'evolves', 'example-of'],
    boostSameDeck = 0.2,
    boostSameSection = 0.3,
    boostRelationships = 0.15,
    boostRecent = 0.1,
    boostProgress = 0.05,
    boostRarity = 0.1
  } = options;

  try {
    // Generate embedding for dense search
    const queryEmbedding = await generateEmbedding(query);
    
    // Step 1: Generate candidates from dense + sparse + graph
    const [denseCandidates, sparseCandidates, graphCandidates] = await Promise.all([
      denseTopK(queryEmbedding, projectId, topK, includeCards, includeDecks, includeSections),
      sparseTopK(query, projectId, topK, includeCards, includeDecks, includeSections),
      graphTopK(query, projectId, relationshipTypes, topK)
    ]);

    // Step 2: Union and deduplicate
    const unionedCandidates = unionAndDedupe(denseCandidates, sparseCandidates, graphCandidates);

    // Step 3: Apply structural boosts
    const boostedCandidates = await applyStructuralBoosts(unionedCandidates, projectId, {
      boostSameDeck,
      boostSameSection,
      boostRelationships,
      boostRecent,
      boostProgress,
      boostRarity
    });

    // Step 4: MMR diversification
    const diversifiedCandidates = mmrDiversify(boostedCandidates, queryEmbedding, mmrLambda, finalLimit);

    return {
      candidates: diversifiedCandidates,
      total: unionedCandidates.length,
      breakdown: {
        dense: denseCandidates.length,
        sparse: sparseCandidates.length,
        graph: graphCandidates.length,
        afterUnion: unionedCandidates.length,
        afterMMR: diversifiedCandidates.length
      }
    };

  } catch (error) {
    console.error('Error in candidate generation:', error);
    throw error;
  }
}

/**
 * Dense vector search for top-k candidates
 */
async function denseTopK(queryEmbedding, projectId, topK, includeCards, includeDecks, includeSections) {
  if (!queryEmbedding) return [];

  try {
    const candidates = [];

    // Search cards
    if (includeCards) {
      const { data: cardResults } = await supabase.rpc('search_cards_semantic', {
        query_embedding: queryEmbedding,
        project_id: projectId,
        match_threshold: 0.2, // Lower threshold for candidate generation
        match_count: topK
      });

      if (cardResults) {
        candidates.push(...cardResults.map(item => ({
          ...item,
          type: 'card',
          source: 'dense',
          score: item.similarity || 0
        })));
      }
    }

    // Search decks
    if (includeDecks) {
      const { data: deckResults } = await supabase.rpc('search_decks_semantic', {
        query_embedding: queryEmbedding,
        match_threshold: 0.2,
        match_count: topK
      });

      if (deckResults) {
        candidates.push(...deckResults.map(item => ({
          ...item,
          type: 'deck',
          source: 'dense',
          score: item.similarity || 0
        })));
      }
    }

    // Search deck sections
    if (includeSections) {
      const { data: sectionResults } = await supabase.rpc('search_deck_sections_semantic', {
        query_embedding: queryEmbedding,
        match_threshold: 0.2,
        match_count: topK
      });

      if (sectionResults) {
        candidates.push(...sectionResults.map(item => ({
          ...item,
          type: 'section',
          source: 'dense',
          score: item.similarity || 0
        })));
      }
    }

    return candidates.slice(0, topK);

  } catch (error) {
    console.error('Error in dense top-k search:', error);
    return [];
  }
}

/**
 * Sparse keyword search for top-k candidates
 */
async function sparseTopK(query, projectId, topK, includeCards, includeDecks, includeSections) {
  try {
    const searchTerms = query.split(' ').filter(term => term.length > 2).join(' & ');
    if (!searchTerms) return [];

    const candidates = [];

    // Search cards
    if (includeCards) {
      const { data: cardResults } = await supabase
        .from('cards')
        .select('id, title, content, tags, rarity, progress, created_at, deck_id, section_id')
        .eq('project_id', projectId)
        .textSearch('searchable_text', searchTerms)
        .limit(topK);

      if (cardResults) {
        candidates.push(...cardResults.map(item => ({
          ...item,
          type: 'card',
          source: 'sparse',
          score: 1.0 // BM25 relevance is implicit
        })));
      }
    }

    // Search decks
    if (includeDecks) {
      const { data: deckResults } = await supabase
        .from('decks')
        .select('id, name, description, summary, tags, created_at')
        .eq('project_id', projectId)
        .textSearch('searchable_text', searchTerms)
        .limit(topK);

      if (deckResults) {
        candidates.push(...deckResults.map(item => ({
          ...item,
          type: 'deck',
          source: 'sparse',
          score: 1.0
        })));
      }
    }

    // Search deck sections
    if (includeSections) {
      const { data: sectionResults } = await supabase
        .from('deck_sections')
        .select('id, name, summary, tags, deck_id, created_at')
        .eq('deck_id', supabase.from('decks').select('id').eq('project_id', projectId))
        .textSearch('searchable_text', searchTerms)
        .limit(topK);

      if (sectionResults) {
        candidates.push(...sectionResults.map(item => ({
          ...item,
          type: 'section',
          source: 'sparse',
          score: 1.0
        })));
      }
    }

    return candidates.slice(0, topK);

  } catch (error) {
    console.error('Error in sparse top-k search:', error);
    return [];
  }
}

/**
 * Graph-based search for top-k candidates
 */
async function graphTopK(query, projectId, relationshipTypes, topK) {
  try {
    // Find cards that match the query
    const { data: matchingCards } = await supabase
      .from('cards')
      .select('id, deck_id, section_id')
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
          id, title, content, tags, rarity, progress, created_at, deck_id, section_id
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
          id, title, content, tags, rarity, progress, created_at, deck_id, section_id
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
        score: rel.strength || 0
      })),
      ...(incomingRelationships || []).map(rel => ({
        ...rel.source_card,
        type: 'card',
        source: 'graph',
        relationship_type: rel.relationship_type,
        relationship_strength: rel.strength,
        score: rel.strength || 0
      }))
    ];

    return allRelationships.slice(0, topK);

  } catch (error) {
    console.error('Error in graph top-k search:', error);
    return [];
  }
}

/**
 * Union and deduplicate candidates from different sources
 */
function unionAndDedupe(denseCandidates, sparseCandidates, graphCandidates) {
  const candidateMap = new Map();

  // Process all candidates
  [...denseCandidates, ...sparseCandidates, ...graphCandidates].forEach(candidate => {
    const key = `${candidate.type}_${candidate.id}`;
    const existing = candidateMap.get(key);

    if (existing) {
      // Merge scores from different sources
      existing.scores = existing.scores || {};
      existing.scores[existing.source] = existing.score;
      existing.scores[candidate.source] = candidate.score;
      existing.sources = [...(existing.sources || [existing.source]), candidate.source];
    } else {
      candidateMap.set(key, {
        ...candidate,
        scores: { [candidate.source]: candidate.score },
        sources: [candidate.source]
      });
    }
  });

  return Array.from(candidateMap.values());
}

/**
 * Apply structural boosts to candidates
 */
async function applyStructuralBoosts(candidates, projectId, boostConfig) {
  try {
    // Get context for structural boosts
    const context = await getStructuralContext(projectId);

    return candidates.map(candidate => {
      let boost = 0;
      const reasons = [];

      // Same deck boost
      if (candidate.deck_id && context.deckIds.has(candidate.deck_id)) {
        boost += boostConfig.boostSameDeck;
        reasons.push('same_deck');
      }

      // Same section boost
      if (candidate.section_id && context.sectionIds.has(candidate.section_id)) {
        boost += boostConfig.boostSameSection;
        reasons.push('same_section');
      }

      // Relationship boost
      if (candidate.relationship_strength) {
        boost += boostConfig.boostRelationships * candidate.relationship_strength;
        reasons.push('relationship');
      }

      // Recency boost
      if (candidate.created_at) {
        const daysSinceCreation = (Date.now() - new Date(candidate.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation < 7) {
          boost += boostConfig.boostRecent;
          reasons.push('recent');
        }
      }

      // Progress boost (for cards)
      if (candidate.type === 'card' && candidate.progress) {
        boost += boostConfig.boostProgress * (candidate.progress - 1) / 4; // Normalize to 0-1
        reasons.push('progress');
      }

      // Rarity boost (for cards)
      if (candidate.type === 'card' && candidate.rarity) {
        const rarityBoost = { common: 0, special: 0.5, rare: 0.8, legendary: 1.0 };
        boost += boostConfig.boostRarity * (rarityBoost[candidate.rarity] || 0);
        reasons.push('rarity');
      }

      return {
        ...candidate,
        structuralBoost: boost,
        boostReasons: reasons,
        finalScore: (candidate.score || 0) + boost
      };
    });

  } catch (error) {
    console.error('Error applying structural boosts:', error);
    return candidates;
  }
}

/**
 * Get structural context for boosting
 */
async function getStructuralContext(projectId) {
  try {
    // Get recent working set (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recentCards } = await supabase
      .from('cards')
      .select('deck_id, section_id')
      .eq('project_id', projectId)
      .gte('created_at', sevenDaysAgo);

    const deckIds = new Set();
    const sectionIds = new Set();

    recentCards?.forEach(card => {
      if (card.deck_id) deckIds.add(card.deck_id);
      if (card.section_id) sectionIds.add(card.section_id);
    });

    return { deckIds, sectionIds };

  } catch (error) {
    console.error('Error getting structural context:', error);
    return { deckIds: new Set(), sectionIds: new Set() };
  }
}

/**
 * MMR (Maximal Marginal Relevance) diversification
 */
function mmrDiversify(candidates, queryEmbedding, lambda, limit) {
  if (!queryEmbedding || candidates.length === 0) {
    return candidates.slice(0, limit);
  }

  const diversified = [];
  const remaining = [...candidates];

  // Sort by final score for initial ranking
  remaining.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));

  while (diversified.length < limit && remaining.length > 0) {
    let bestCandidate = null;
    let bestScore = -Infinity;
    let bestIndex = -1;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      
      // Calculate MMR score
      const relevanceScore = candidate.finalScore || 0;
      const diversityScore = calculateDiversityScore(candidate, diversified, queryEmbedding);
      const mmrScore = lambda * relevanceScore + (1 - lambda) * diversityScore;

      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestCandidate = candidate;
        bestIndex = i;
      }
    }

    if (bestCandidate) {
      diversified.push(bestCandidate);
      remaining.splice(bestIndex, 1);
    } else {
      break;
    }
  }

  return diversified;
}

/**
 * Calculate diversity score for MMR
 */
function calculateDiversityScore(candidate, selected, queryEmbedding) {
  if (selected.length === 0) return 1.0;

  // Simple diversity based on content similarity
  // In a full implementation, you'd use actual embeddings
  let maxSimilarity = 0;

  selected.forEach(selectedCandidate => {
    // Calculate similarity based on title/content overlap
    const similarity = calculateTextSimilarity(
      candidate.title || candidate.name || '',
      selectedCandidate.title || selectedCandidate.name || ''
    );
    maxSimilarity = Math.max(maxSimilarity, similarity);
  });

  return 1.0 - maxSimilarity; // Higher diversity = lower similarity
}

/**
 * Calculate text similarity (simplified)
 */
function calculateTextSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;

  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size; // Jaccard similarity
}
