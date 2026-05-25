// MMR (Maximal Marginal Relevance) implementation for diverse result selection
// Balances relevance to query with diversity from already-selected results

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vecA - First vector
 * @param {number[]} vecB - Second vector  
 * @returns {number} - Similarity score between 0 and 1
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Select diverse results using MMR algorithm
 * @param {Array} candidates - Array of candidates with embedding and similarity fields
 * @param {number[]} queryVector - The query vector for relevance calculation
 * @param {number} k - Number of results to select
 * @param {number} lambda - Balance parameter (0.0 = max diversity, 1.0 = max relevance)
 * @returns {Array} - Selected diverse results
 */
export function selectWithMMR(candidates, queryVector, k, lambda = 0.7) {
  if (!candidates || candidates.length === 0) {
    return [];
  }
  
  // If we have fewer candidates than k, return all
  if (candidates.length <= k) {
    return candidates;
  }
  
  const selected = [];
  const remaining = [...candidates];
  
  console.log(`🎯 MMR: Selecting ${k} diverse results from ${candidates.length} candidates (λ=${lambda})`);
  
  // First, select the most relevant item
  let bestIdx = 0;
  let bestScore = -Infinity;
  
  for (let i = 0; i < remaining.length; i++) {
    const candidate = remaining[i];
    // Use the similarity score that was already calculated by the database
    const relevanceScore = candidate.similarity || 0;
    if (relevanceScore > bestScore) {
      bestScore = relevanceScore;
      bestIdx = i;
    }
  }
  
  selected.push(remaining[bestIdx]);
  remaining.splice(bestIdx, 1);
  console.log(`🎯 MMR: Selected first item (relevance=${bestScore.toFixed(3)}):`, selected[0].key || selected[0].title);
  
  // Select remaining k-1 items using MMR formula
  for (let iteration = 1; iteration < k && remaining.length > 0; iteration++) {
    let bestMMRIdx = 0;
    let bestMMRScore = -Infinity;
    
    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      
      // Relevance score (already calculated by database)
      const relevanceScore = candidate.similarity || 0;
      
      // Calculate maximum similarity to already selected items
      let maxSimToSelected = 0;
      
      if (candidate.embedding && queryVector) {
        for (const selectedItem of selected) {
          if (selectedItem.embedding) {
            const sim = cosineSimilarity(candidate.embedding, selectedItem.embedding);
            maxSimToSelected = Math.max(maxSimToSelected, sim);
          }
        }
      }
      
      // MMR formula: λ * relevance - (1-λ) * max_similarity_to_selected
      const mmrScore = lambda * relevanceScore - (1 - lambda) * maxSimToSelected;
      
      if (mmrScore > bestMMRScore) {
        bestMMRScore = mmrScore;
        bestMMRIdx = i;
      }
    }
    
    const selectedCandidate = remaining[bestMMRIdx];
    selected.push(selectedCandidate);
    remaining.splice(bestMMRIdx, 1);
    
    console.log(`🎯 MMR: Selected item ${iteration + 1} (MMR=${bestMMRScore.toFixed(3)}):`, 
                selectedCandidate.key || selectedCandidate.title);
  }
  
  console.log(`🎯 MMR: Final selection complete - ${selected.length} diverse results`);
  
  return selected;
}

/**
 * Apply MMR to facts results
 * @param {Array} facts - Facts with embedding and similarity fields
 * @param {number[]} queryVector - Query vector for relevance
 * @param {number} k - Number of facts to select
 * @param {number} lambda - Relevance vs diversity balance
 * @returns {Array} - Diverse fact selection
 */
export function selectDiverseFacts(facts, queryVector, k = 12, lambda = 0.7) {
  return selectWithMMR(facts, queryVector, k, lambda);
}

/**
 * Apply MMR to docs results  
 * @param {Array} docs - Docs with embedding and similarity fields
 * @param {number[]} queryVector - Query vector for relevance
 * @param {number} k - Number of docs to select  
 * @param {number} lambda - Relevance vs diversity balance
 * @returns {Array} - Diverse docs selection
 */
export function selectDiverseDocs(docs, queryVector, k = 6, lambda = 0.7) {
  return selectWithMMR(docs, queryVector, k, lambda);
}
