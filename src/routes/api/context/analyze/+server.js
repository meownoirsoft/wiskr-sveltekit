// src/routes/api/context/analyze/+server.js
import { json } from '@sveltejs/kit';
import { buildContext } from '$lib/server/context/buildContext.js';

export const POST = async ({ request, locals }) => {
  const { data: { user } } = await locals.supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  
  const { projectId, userMessage = 'Tell me about this project', branchId = 'main' } = await request.json();
  
  if (!projectId) {
    return json({ error: 'Missing projectId' }, { status: 400 });
  }

  try {
    // Enhanced buildContext that captures detailed analytics
    const analysis = await analyzeContext({ 
      supabase: locals.supabase, 
      projectId, 
      userMessage, 
      branchId 
    });
    
    return json(analysis);
  } catch (error) {
    console.error('Context analysis error:', error);
    return json({ error: error.message }, { status: 500 });
  }
};

async function analyzeContext({ supabase, projectId, userMessage, branchId }) {
  const startTime = Date.now();
  const analysis = {
    projectId,
    userMessage: userMessage.substring(0, 100) + (userMessage.length > 100 ? '...' : ''),
    branchId,
    timestamp: new Date().toISOString(),
    sections: [],
    metrics: {},
    summary: {}
  };

  // Get project info
  const { data: project } = await supabase
    .from('projects')
    .select('name, description, brief_text')
    .eq('id', projectId)
    .single();

  analysis.projectName = project?.name || 'Unknown Project';

  // 1) PROJECT DESCRIPTION
  if (project?.description?.trim()) {
    analysis.sections.push({
      name: 'Project Description',
      priority: 1,
      type: 'project_description',
      content: project.description.trim(),
      charCount: project.description.trim().length,
      included: true,
      reason: 'Ultimate highest priority - defines core objectives'
    });
  }

  // 2) PINNED FACTS & DOCS
  const [{ data: pinnedFacts }, { data: pinnedDocs }] = await Promise.all([
    supabase.from('facts').select('id,type,key,value,pinned').eq('project_id', projectId).eq('pinned', true).limit(50),
    supabase.from('docs').select('id,title,content,pinned').eq('project_id', projectId).eq('pinned', true).limit(25)
  ]);

  if (pinnedFacts?.length) {
    const pinnedFactsContent = pinnedFacts.map(f => `⭐ [${f.type}] ${f.key}: ${f.value}`).join('\n\n');
    analysis.sections.push({
      name: 'Pinned Facts',
      priority: 2,
      type: 'pinned_facts',
      content: pinnedFactsContent,
      charCount: pinnedFactsContent.length,
      itemCount: pinnedFacts.length,
      included: true,
      reason: 'MANDATORY - User-selected critical information',
      items: pinnedFacts.map(f => ({ type: f.type, key: f.key, preview: f.value.substring(0, 50) + '...' }))
    });
  }

  if (pinnedDocs?.length) {
    const pinnedDocsContent = pinnedDocs.map(d => `⭐ ${d.title}\n${d.content}`).join('\n\n');
    analysis.sections.push({
      name: 'Pinned Documents',
      priority: 2,
      type: 'pinned_docs',
      content: pinnedDocsContent,
      charCount: pinnedDocsContent.length,
      itemCount: pinnedDocs.length,
      included: true,
      reason: 'MANDATORY - User-selected critical documents',
      items: pinnedDocs.map(d => ({ title: d.title, preview: d.content.substring(0, 100) + '...' }))
    });
  }

  // 3) ENTITY CARDS
  const { data: entityCards } = await supabase
    .from('entity_cards')
    .select('id, entity_name, entity_type, summary, confidence_score, fact_count')
    .eq('project_id', projectId)
    .order('confidence_score', { ascending: false })
    .limit(15);

  if (entityCards?.length) {
    const selectedCards = entityCards.slice(0, 8); // Simplified selection for analysis
    const entityCardsContent = selectedCards.map(card => {
      const confidenceText = card.confidence_score > 0.8 ? ' (high confidence)' : '';
      return `⚡ ${card.entity_name} (${card.entity_type})${confidenceText}:\n${card.summary}`;
    }).join('\n\n');

    analysis.sections.push({
      name: 'Entity Cards',
      priority: 3,
      type: 'entity_cards',
      content: entityCardsContent,
      charCount: entityCardsContent.length,
      itemCount: selectedCards.length,
      included: true,
      reason: 'AI-generated coherent summaries of related facts',
      items: selectedCards.map(card => ({
        name: card.entity_name,
        type: card.entity_type,
        confidence: card.confidence_score,
        factCount: card.fact_count,
        preview: card.summary.substring(0, 100) + '...'
      }))
    });
  }

  // 4) PROJECT BRIEF
  if (project?.brief_text) {
    analysis.sections.push({
      name: 'Project Brief',
      priority: 4,
      type: 'project_brief',
      content: project.brief_text,
      charCount: project.brief_text.length,
      included: true,
      reason: 'Compressed overview of project knowledge'
    });
  }

  // 5) Get total fact/doc counts for coverage metrics
  const [{ count: totalFactsCount }, { count: totalDocsCount }] = await Promise.all([
    supabase.from('facts').select('*', { count: 'exact', head: true }).eq('project_id', projectId),
    supabase.from('docs').select('*', { count: 'exact', head: true }).eq('project_id', projectId)
  ]);

  // Calculate metrics
  const totalCharacters = analysis.sections.reduce((sum, section) => sum + section.charCount, 0);
  const estimatedTokens = Math.round(totalCharacters / 4); // Rough token estimation

  analysis.metrics = {
    totalSections: analysis.sections.length,
    totalCharacters,
    estimatedTokens,
    pinnedFactsCoverage: pinnedFacts?.length || 0,
    totalFactsInProject: totalFactsCount || 0,
    pinnedDocsCoverage: pinnedDocs?.length || 0,
    totalDocsInProject: totalDocsCount || 0,
    entityCardsCount: entityCards?.length || 0,
    processingTimeMs: Date.now() - startTime
  };

  analysis.summary = {
    hasProjectDescription: !!project?.description?.trim(),
    hasPinnedFacts: (pinnedFacts?.length || 0) > 0,
    hasPinnedDocs: (pinnedDocs?.length || 0) > 0,
    hasEntityCards: (entityCards?.length || 0) > 0,
    hasProjectBrief: !!project?.brief_text,
    pinnedFactsCount: pinnedFacts?.length || 0,  // Add this missing field!
    entityCardsCount: entityCards?.length || 0,  // Add this missing field!
    pinnedFactsPercentage: totalFactsCount ? Math.round((pinnedFacts?.length || 0) / totalFactsCount * 100) : 0,
    contextQualityScore: calculateContextQualityScore({
      hasProjectDescription: !!project?.description?.trim(),
      pinnedFactsCount: pinnedFacts?.length || 0,
      entityCardsCount: entityCards?.length || 0,
      totalCharacters
    })
  };

  return analysis;
}

function calculateContextQualityScore({ hasProjectDescription, pinnedFactsCount, entityCardsCount, totalCharacters }) {
  let score = 0;
  
  // Project description (30 points)
  if (hasProjectDescription) score += 30;
  
  // Pinned facts (40 points max)
  score += Math.min(pinnedFactsCount * 4, 40);
  
  // Entity cards (20 points max)
  score += Math.min(entityCardsCount * 2.5, 20);
  
  // Context richness (10 points max)
  score += Math.min(totalCharacters / 1000, 10);
  
  return Math.min(Math.round(score), 100);
}
