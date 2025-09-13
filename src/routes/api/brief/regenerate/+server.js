// src/routes/api/brief/regenerate/+server.js
import { json } from '@sveltejs/kit';
import { getModelConfig } from '$lib/server/openrouter.js';
import { trackAIUsage } from '$lib/server/utils/usageTracker.js';

export const POST = async ({ request, locals }) => {
  const { data: { user } } = await locals.supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const { projectId } = await request.json();

  const sb = locals.supabase;
  
  // Get pinned facts and docs first (highest priority)
  const [{ data: pinnedFacts }, { data: pinnedDocs }] = await Promise.all([
    sb.from('facts').select('*').eq('project_id', projectId).eq('pinned', true).limit(50),
    sb.from('docs').select('*').eq('project_id', projectId).eq('pinned', true).limit(10)
  ]);
  
  // Get additional recent facts to fill out the context (only if we need more)
  let additionalFacts = [];
  if ((pinnedFacts?.length || 0) < 80) {
    const remainingFactLimit = 100 - (pinnedFacts?.length || 0);
    const { data: recentFacts } = await sb
      .from('facts')
      .select('*')
      .eq('project_id', projectId)
      .eq('pinned', false)  // Only get non-pinned facts to avoid duplicates
      .order('created_at', { ascending: false })
      .limit(remainingFactLimit);
    additionalFacts = recentFacts || [];
  }
  
  // Get additional recent docs to fill out the context (only if we need more)
  let additionalDocs = [];
  if ((pinnedDocs?.length || 0) < 8) {
    const remainingDocLimit = 10 - (pinnedDocs?.length || 0);
    const { data: recentDocs } = await sb
      .from('docs')
      .select('*')
      .eq('project_id', projectId)
      .eq('pinned', false)  // Only get non-pinned docs to avoid duplicates
      .order('created_at', { ascending: false })
      .limit(remainingDocLimit);
    additionalDocs = recentDocs || [];
  }
  
  // Combine pinned (priority) + recent (filler) items
  const allFacts = [...(pinnedFacts || []), ...additionalFacts];
  const allDocs = [...(pinnedDocs || []), ...additionalDocs];
  
  // Format with clear indication of what's pinned
  const pinnedFactsText = (pinnedFacts || []).map(f => `🚨 [${f.type}] ${f.key}: ${f.value}`).join('\n');
  const additionalFactsText = additionalFacts.map(f => `- [${f.type}] ${f.key}: ${f.value}`).join('\n');
  const factsText = [pinnedFactsText, additionalFactsText].filter(Boolean).join('\n\n');
  
  const pinnedDocsText = (pinnedDocs || []).map(d => `🚨 ${d.title}\n${d.content}`).join('\n\n');
  const additionalDocsText = additionalDocs.map(d => `# ${d.title}\n${d.content}`).join('\n\n');
  const docsText = [pinnedDocsText, additionalDocsText].filter(Boolean).join('\n\n');

  // Get OpenRouter client - use micro model for brief generation (cheapest)
  const { config: modelConf, client: openai } = getModelConfig('micro');
  const prompt = `
Summarize the essential, stable facts of this project for reuse by an AI assistant.
Keep 300–800 tokens. Prefer lists. No fluff.

IMPORTANT: Items marked with 🚨 are pinned as CRITICAL by the user. These MUST be prominently featured in your summary.

FACTS:
${factsText}

DOCS (excerpts):
${docsText}

Remember: Prioritize the 🚨 pinned items - they represent the user's most important information that should never be overlooked.`;

  const completion = await openai.chat.completions.create({
    model: modelConf.name,
    temperature: 0.2,
    messages: [{ role: 'system', content: 'You compress project knowledge crisply.' }, { role: 'user', content: prompt }]
  });

  const brief = completion.choices?.[0]?.message?.content?.trim() || '';
  
  // Track usage
  const inputText = JSON.stringify([
    { role: 'system', content: 'You compress project knowledge crisply.' },
    { role: 'user', content: prompt }
  ]);
  await trackAIUsage({
    userId: user.id,
    projectId,
    model: modelConf.name,
    inputText,
    outputText: brief,
    supabase: locals.supabase,
    operation: 'brief-regenerate'
  });
  
  await sb.from('projects').update({ brief_text: brief, brief_updated_at: new Date().toISOString() }).eq('id', projectId);

  return json({ ok: true });
};
