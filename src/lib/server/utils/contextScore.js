// src/lib/server/utils/contextScore.js
// Utility functions for calculating and caching project context quality scores

/**
 * Check if a description is a generic welcome message that shouldn't count toward context score
 * @param {string} description - The project description
 * @returns {boolean} True if it's a generic welcome message
 */
function isGenericWelcomeDescription(description) {
  if (!description) return false;
  const normalizedDesc = description.toLowerCase().trim();
  
  // Check for generic welcome patterns
  const genericPatterns = [
    'welcome to wiskr',
    'this is your first project to get you started',
    'welcome to wiskr! this is your first project to get you started.',
    'your first project to get you started'
  ];
  
  return genericPatterns.some(pattern => normalizedDesc.includes(pattern));
}

/**
 * Calculate the quality score for a project description based on length, detail, and content
 * @param {string} description - The project description
 * @returns {number} Score from 0-30 based on description quality
 */
export function calculateDescriptionQualityScore(description) {
  if (!description || isGenericWelcomeDescription(description)) {
    return 0;
  }
  
  const trimmed = description.trim();
  const length = trimmed.length;
  const wordCount = trimmed.split(/\s+/).length;
  const sentences = trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  
  let score = 0;
  
  // Length scoring (0-15 points)
  if (length < 50) {
    score += 0; // Too short to be meaningful
  } else if (length < 100) {
    score += 5; // Very brief but something
  } else if (length < 200) {
    score += 10; // Good basic description
  } else if (length < 500) {
    score += 15; // Detailed description
  } else {
    score += 15; // Very detailed (cap at 15)
  }
  
  // Word count scoring (0-8 points)
  if (wordCount >= 10 && wordCount < 20) {
    score += 2;
  } else if (wordCount >= 20 && wordCount < 50) {
    score += 5;
  } else if (wordCount >= 50) {
    score += 8;
  }
  
  // Sentence structure scoring (0-4 points)
  if (sentences >= 2) {
    score += 2;
  }
  if (sentences >= 4) {
    score += 2; // Additional points for multiple sentences
  }
  
  // Content quality indicators (0-3 points)
  const qualityIndicators = [
    /\b(goal|objective|purpose|aim)\b/i,
    /\b(feature|functionality|capability)\b/i,
    /\b(user|customer|client)\b/i,
    /\b(problem|solution|challenge)\b/i,
    /\b(technology|framework|platform)\b/i
  ];
  
  const matchedIndicators = qualityIndicators.filter(regex => regex.test(trimmed)).length;
  score += Math.min(matchedIndicators, 3); // Max 3 points for quality indicators
  
  return Math.min(score, 30); // Cap at 30 points
}

/**
 * Calculate the context quality score for a project using context rings
 * @param {Object} params
 * @param {Object} params.rings - Context rings data from getContextRings
 * @param {Object} params.metadata - Metadata from context rings
 * @returns {number} Score from 0-100
 */
export function calculateContextQualityScoreFromRings({ rings, metadata }) {
  let score = 0;
  
  console.log('🎯 Server: Calculating rings-based score for rings:', {
    global: rings?.global ? 'exists' : 'missing',
    local: rings?.local ? 'exists' : 'missing', 
    neighbors: rings?.neighbors ? 'exists' : 'missing',
    target: rings?.target ? 'exists' : 'missing'
  });
  
  // Global Ring Quality (0-30 points)
  const globalRing = rings?.global;
  if (globalRing?.content) {
    const globalLength = globalRing.content.length;
    const globalTokens = globalRing.tokens || 0;
    
    console.log('🎯 Server: Global ring - length:', globalLength, 'tokens:', globalTokens);
    
    // Length scoring (0-15 points)
    if (globalLength < 100) {
      score += 0;
    } else if (globalLength < 300) {
      score += 5;
    } else if (globalLength < 600) {
      score += 10;
    } else {
      score += 15;
    }
    
    // Token efficiency (0-15 points) - more tokens = richer context
    score += Math.min(globalTokens / 2, 15);
  } else {
    console.log('🎯 Server: No global ring content');
  }
  
  // Local Ring Quality (0-25 points)
  const localRing = rings?.local;
  if (localRing?.content) {
    const localTokens = localRing.tokens || 0;
    const localLength = localRing.content.length;
    
    console.log('🎯 Server: Local ring - length:', localLength, 'tokens:', localTokens);
    
    // Recent context richness (0-15 points)
    score += Math.min(localTokens / 1.5, 15);
    
    // Content diversity (0-10 points)
    if (localLength > 200) score += 5;
    if (localLength > 500) score += 5;
  } else {
    console.log('🎯 Server: No local ring content');
  }
  
  // Neighbors Ring Quality (0-25 points)
  const neighborsRing = rings?.neighbors;
  if (neighborsRing?.content) {
    const neighborsTokens = neighborsRing.tokens || 0;
    const neighborsLength = neighborsRing.content.length;
    
    console.log('🎯 Server: Neighbors ring - length:', neighborsLength, 'tokens:', neighborsTokens);
    
    // Semantic richness (0-15 points)
    score += Math.min(neighborsTokens / 1.5, 15);
    
    // Related content quality (0-10 points)
    if (neighborsLength > 150) score += 5;
    if (neighborsLength > 400) score += 5;
  } else {
    console.log('🎯 Server: No neighbors ring content');
  }
  
  // Target Ring Quality (0-20 points)
  const targetRing = rings?.target;
  if (targetRing?.content) {
    const targetTokens = targetRing.tokens || 0;
    const targetLength = targetRing.content.length;
    
    console.log('🎯 Server: Target ring - length:', targetLength, 'tokens:', targetTokens);
    
    // Target specificity (0-10 points)
    score += Math.min(targetTokens, 10);
    
    // Target richness (0-10 points)
    if (targetLength > 100) score += 5;
    if (targetLength > 300) score += 5;
  } else {
    console.log('🎯 Server: No target ring content');
  }
  
  // Overall Token Efficiency Bonus (0-10 points)
  const totalTokens = metadata?.tokenUsage?.totalTokens || 0;
  if (totalTokens > 1000) score += 5;
  if (totalTokens > 2000) score += 5;
  
  console.log('🎯 Server: Final calculated score:', score);
  
  return Math.min(Math.round(score), 100);
}

/**
 * Calculate the context quality score for a project (legacy method)
 * @param {Object} params
 * @param {boolean} params.hasProjectDescription - Whether the project has a meaningful description
 * @param {string} params.projectDescription - The actual project description text
 * @param {number} params.pinnedFactsCount - Number of pinned facts 
 * @param {number} params.entityCardsCount - Number of entity cards
 * @param {number} params.totalCharacters - Total character count in context
 * @returns {number} Score from 0-100
 */
export function calculateContextQualityScore({ hasProjectDescription, projectDescription, pinnedFactsCount, entityCardsCount, totalCharacters }) {
  let score = 0;
  
  // Project description (0-30 points) - based on quality, length, and detail
  score += calculateDescriptionQualityScore(projectDescription);
  
  // Pinned facts (40 points max)
  score += Math.min(pinnedFactsCount * 4, 40);
  
  // Entity cards (20 points max)
  score += Math.min(entityCardsCount * 2.5, 20);
  
  // Context richness (10 points max)
  score += Math.min(totalCharacters / 1000, 10);
  
  return Math.min(Math.round(score), 100);
}

/**
 * Refresh the context quality score for a project and cache it
 * @param {Object} supabase - Supabase client
 * @param {string} projectId - Project ID to refresh score for
 * @returns {Promise<number>} The calculated score
 */
export async function refreshContextScore(supabase, projectId) {
  try {
    console.log('🎯 Server: Starting context score refresh for project', projectId);
    
    // Import buildContextRings to get raw rings data for scoring
    const { buildContextRings } = await import('../context/contextRings.js');
    
    // Import supabaseAdmin for consistent database access
    const { supabaseAdmin } = await import('../supabaseClient.js');
    
    // Get raw context rings for scoring (not formatted for AI)
    console.log('🎯 Server: Calling buildContextRings for scoring with params:', {
      projectId,
      operation: 'create',
      targetCards: [],
      userMessage: 'Assess context quality',
      budget: 'high'
    });
    
    const contextData = await buildContextRings({
      supabase: supabaseAdmin,
      projectId,
      operation: 'create', // Use 'create' as a general context assessment
      targetCards: [],
      userMessage: 'Assess context quality',
      budget: 'high' // Use high budget to get comprehensive context
    });

    console.log('🎯 Server: Context data retrieved for scoring');
    console.log('🎯 Server: contextData.rings exists:', !!contextData.rings);
    console.log('🎯 Server: contextData.totalTokens exists:', !!contextData.totalTokens);
    console.log('🎯 Server: Context rings data:', {
      global: contextData.rings?.global?.tokens || 0,
      local: contextData.rings?.local?.tokens || 0,
      neighbors: contextData.rings?.neighbors?.tokens || 0,
      target: contextData.rings?.target?.tokens || 0,
      totalTokens: contextData.totalTokens || 0
    });

    // Calculate score using rings-based method
    console.log('🎯 Server: About to call calculateContextQualityScoreFromRings with:', {
      rings: contextData.rings,
      metadata: { tokenUsage: { totalTokens: contextData.totalTokens } }
    });
    
    const score = calculateContextQualityScoreFromRings({
      rings: contextData.rings,
      metadata: { tokenUsage: { totalTokens: contextData.totalTokens } }
    });

    console.log('🎯 Server: Calculated context score:', score);

    // Cache the score
    try {
      await supabase
        .from('projects')
        .update({ 
          context_score: score,
          context_score_updated_at: new Date().toISOString()
        })
        .eq('id', projectId);
    } catch (updateError) {
      console.log('Context score caching not yet available, returning calculated score:', score);
    }

    return score;

  } catch (error) {
    console.error('Error refreshing context score with rings:', error);
    
    // Fallback to legacy method if rings fail
    try {
      const { data: project } = await supabase
        .from('projects')
        .select('name, description, brief_text')
        .eq('id', projectId)
        .single();

      if (!project) {
        console.warn(`Project ${projectId} not found for context score refresh`);
        return 0;
      }

      const { data: pinnedCards } = await supabase
        .from('cards')
        .select('id, title, content')
        .eq('project_id', projectId)
        .eq('pinned', true)
        .limit(50);

      let totalCharacters = 0;
      if (project.description?.trim()) {
        totalCharacters += project.description.trim().length;
      }
      if (project.brief_text) {
        totalCharacters += project.brief_text.length;
      }
      if (pinnedCards?.length) {
        totalCharacters += pinnedCards.reduce((sum, card) => sum + (card.title?.length || 0) + (card.content?.length || 0), 0);
      }

      const score = calculateContextQualityScore({
        hasProjectDescription: !!project?.description?.trim(),
        projectDescription: project?.description || '',
        pinnedFactsCount: pinnedCards?.length || 0,
        entityCardsCount: 0,
        totalCharacters
      });

      try {
        await supabase
          .from('projects')
          .update({ 
            context_score: score,
            context_score_updated_at: new Date().toISOString()
          })
          .eq('id', projectId);
      } catch (updateError) {
        console.log('Context score caching not yet available, returning calculated score:', score);
      }

      return score;
    } catch (fallbackError) {
      console.error('Error with fallback context score calculation:', fallbackError);
      return 0;
    }
  }
}

/**
 * Get the cached context score for a project, or calculate it if not cached
 * @param {Object} supabase - Supabase client  
 * @param {string} projectId - Project ID
 * @returns {Promise<number>} The context quality score
 */
export async function getContextScore(supabase, projectId) {
  try {
    // Try to get cached score first
    const { data: project } = await supabase
      .from('projects')
      .select('context_score, context_score_updated_at')
      .eq('id', projectId)
      .single();

    // If we have a recent cached score (within 5 minutes), use it
    if (project?.context_score && project?.context_score_updated_at) {
      const cacheAge = Date.now() - new Date(project.context_score_updated_at).getTime();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (cacheAge < fiveMinutes) {
        return project.context_score;
      }
    }

    // Otherwise, calculate fresh score
    return await refreshContextScore(supabase, projectId);

  } catch (error) {
    console.error('Error getting context score:', error);
    // Fallback: try to refresh
    return await refreshContextScore(supabase, projectId);
  }
}
