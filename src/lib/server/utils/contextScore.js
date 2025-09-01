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
function calculateDescriptionQualityScore(description) {
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
 * Calculate the context quality score for a project
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
    // Get project info
    const { data: project } = await supabase
      .from('projects')
      .select('name, description, brief_text')
      .eq('id', projectId)
      .single();

    if (!project) {
      console.warn(`Project ${projectId} not found for context score refresh`);
      return 0;
    }

    // Get pinned facts and docs counts
    const [{ data: pinnedFacts }, { data: entityCards }] = await Promise.all([
      supabase.from('facts').select('id,value').eq('project_id', projectId).eq('pinned', true).limit(50),
      supabase.from('entity_cards').select('id').eq('project_id', projectId).limit(15)
    ]);

    // Calculate total characters from project description and pinned content
    let totalCharacters = 0;
    if (project.description?.trim()) {
      totalCharacters += project.description.trim().length;
    }
    if (project.brief_text) {
      totalCharacters += project.brief_text.length;
    }
    if (pinnedFacts?.length) {
      totalCharacters += pinnedFacts.reduce((sum, fact) => sum + fact.value.length, 0);
    }

    // Calculate the score
    const score = calculateContextQualityScore({
      hasProjectDescription: !!project?.description?.trim(),
      projectDescription: project?.description || '',
      pinnedFactsCount: pinnedFacts?.length || 0,
      entityCardsCount: entityCards?.length || 0,
      totalCharacters
    });

    // Cache the score in a project metadata table (we'll create this)
    // For now, we'll store it as a computed field or return it for UI use
    try {
      await supabase
        .from('projects')
        .update({ 
          context_score: score,
          context_score_updated_at: new Date().toISOString()
        })
        .eq('id', projectId);
    } catch (updateError) {
      // If the columns don't exist yet, we'll still return the score
      console.log('Context score caching not yet available, returning calculated score:', score);
    }

    //console.log(`📊 Context score refreshed for project ${projectId}: ${score}/100`);
    return score;

  } catch (error) {
    console.error('Error refreshing context score:', error);
    return 0;
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
