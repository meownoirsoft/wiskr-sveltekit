// src/routes/api/context/analyze/+server.js
import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { isAdmin } from '$lib/auth/admin';
import { calculateContextQualityScore } from '$lib/server/utils/contextScore.js';

export const POST = async ({ request, locals }) => {
  try {
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) {
      console.log('❌ Context analysis: No authenticated user');
      return new Response(JSON.stringify({ error: 'Authentication required' }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    console.log('✅ Context analysis: User authenticated:', user.email);
    
    const { projectId, userMessage = 'Tell me about this project', branchId = 'main' } = await request.json();
    
    if (!projectId) {
      return json({ error: 'Missing projectId' }, { status: 400 });
    }

    // Check if user is admin - if so, use admin client for broader access
    const adminCheck = await isAdmin(locals.supabase, user);
    let supabaseClient = locals.supabase;
    
    if (adminCheck.isAdmin) {
      console.log('🔑 Admin user detected - using service role client for broader access');
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    } else {
      console.log('👤 Regular user - using normal client with RLS');
    }

    // Enhanced buildContext that captures detailed analytics
    const analysis = await analyzeContext({ 
      supabase: supabaseClient, 
      projectId, 
      userMessage, 
      branchId 
    });
    
    console.log('📊 Final analysis data:', {
      metrics: analysis.metrics,
      summary: analysis.summary,
      sectionsCount: analysis.sections.length
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
  console.log('📁 Querying project info for ID:', projectId);
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('name, description, brief_text')
    .eq('id', projectId)
    .single();

  console.log('📁 Project query result:', { 
    name: project?.name, 
    hasDescription: !!project?.description?.trim(),
    hasBrief: !!project?.brief_text?.trim(),
    error: projectError?.message
  });
  
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
  console.log('🔍 Querying facts and docs for project:', projectId);
  const [{ data: pinnedFacts, error: factsError }, { data: pinnedDocs, error: docsError }] = await Promise.all([
    supabase.from('facts').select('id,type,key,value,pinned').eq('project_id', projectId).eq('pinned', true).limit(50),
    supabase.from('docs').select('id,title,content,pinned').eq('project_id', projectId).eq('pinned', true).limit(25)
  ]);
  
  console.log('📊 Pinned facts query result:', { 
    count: pinnedFacts?.length || 0, 
    error: factsError?.message,
    facts: pinnedFacts?.map(f => ({ key: f.key, type: f.type })) || []
  });
  console.log('📊 Pinned docs query result:', { 
    count: pinnedDocs?.length || 0, 
    error: docsError?.message,
    docs: pinnedDocs?.map(d => ({ title: d.title })) || []
  });

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
  console.log('🎭 Querying entity cards...');
  const { data: entityCards, error: entityCardsError } = await supabase
    .from('entity_cards')
    .select('id, entity_name, entity_type, summary, confidence_score, fact_count')
    .eq('project_id', projectId)
    .order('confidence_score', { ascending: false })
    .limit(15);
    
  console.log('🎭 Entity cards query result:', { 
    count: entityCards?.length || 0, 
    error: entityCardsError?.message,
    cards: entityCards?.map(c => ({ name: c.entity_name, type: c.entity_type, confidence: c.confidence_score })) || []
  });

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
  console.log('📊 Counting total facts and docs...');
  const [{ count: totalFactsCount, error: factsCountError }, { count: totalDocsCount, error: docsCountError }] = await Promise.all([
    supabase.from('facts').select('*', { count: 'exact', head: true }).eq('project_id', projectId),
    supabase.from('docs').select('*', { count: 'exact', head: true }).eq('project_id', projectId)
  ]);
  
  console.log('📊 Total counts result:', { 
    totalFacts: totalFactsCount, 
    totalDocs: totalDocsCount,
    factsError: factsCountError?.message,
    docsError: docsCountError?.message
  });

  // Calculate metrics using same logic as main app
  const sectionTotalCharacters = analysis.sections.reduce((sum, section) => sum + section.charCount, 0);
  const estimatedTokens = Math.round(sectionTotalCharacters / 4); // Rough token estimation
  
  // Calculate totalCharacters using SAME logic as main app for consistent scoring
  let consistentTotalCharacters = 0;
  if (project?.description?.trim()) {
    consistentTotalCharacters += project.description.trim().length;
  }
  if (project?.brief_text) {
    consistentTotalCharacters += project.brief_text.length;
  }
  if (pinnedFacts?.length) {
    consistentTotalCharacters += pinnedFacts.reduce((sum, fact) => sum + fact.value.length, 0);
  }
  
  console.log('🧮 Character calculation comparison:', {
    sectionMethod: sectionTotalCharacters,
    consistentMethod: consistentTotalCharacters,
    difference: Math.abs(sectionTotalCharacters - consistentTotalCharacters)
  });

  analysis.metrics = {
    totalSections: analysis.sections.length,
    totalCharacters: sectionTotalCharacters, // For display purposes
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
    pinnedFactsCount: pinnedFacts?.length || 0,
    entityCardsCount: entityCards?.length || 0,
    pinnedFactsPercentage: totalFactsCount ? Math.round((pinnedFacts?.length || 0) / totalFactsCount * 100) : 0,
    contextQualityScore: calculateContextQualityScore({
      hasProjectDescription: !!project?.description?.trim(),
      pinnedFactsCount: pinnedFacts?.length || 0,
      entityCardsCount: entityCards?.length || 0,
      totalCharacters: consistentTotalCharacters // Use consistent calculation method
    })
  };

  return analysis;
}

// Removed duplicate function - now using the one from contextScore.js
