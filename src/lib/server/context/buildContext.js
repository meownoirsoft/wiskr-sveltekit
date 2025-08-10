// src/lib/server/context/buildContext.js

export async function buildContext({ projectId, userMessage, includeMessageCount = 8, tagHints = [], supabase }) {
  const sb = supabase;

  const { data: project, error: pErr } = await sb.from('projects').select('*').eq('id', projectId).single();
  if (pErr || !project) throw new Error('Project not found');

  const { data: persona } = await sb.from('personas').select('*').eq('id', project.persona_id).single();

  const { data: recentMsgs } = await sb
    .from('messages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(includeMessageCount);

  const tagCandidates = (userMessage.match(/\b[A-Za-z][\w-]{2,}\b/g) || []);
  const tagQuery = Array.from(new Set([...tagHints, ...tagCandidates])).slice(0, 12);

  const { data: facts } = await sb
    .from('facts')
    .select('*')
    .eq('project_id', projectId)
    .overlaps('tags', tagQuery.length ? tagQuery : ['__none__'])
    .limit(12);

  const { data: docs } = await sb
    .from('docs')
    .select('*')
    .eq('project_id', projectId)
    .overlaps('tags', tagQuery.length ? tagQuery : ['__none__'])
    .limit(4);


// Fetch pinned first (always include), then relevant by tags
const { data: pinnedFacts } = await sb
  .from('facts')
  .select('*')
  .eq('project_id', projectId)
  .eq('pinned', true)
  .limit(12);

// fetch overrides
const { data: overrides } = await sb
  .from('context_overrides')
  .select('*')
  .eq('project_id', projectId)
  .gt('expires_at', new Date().toISOString());

const oFactIds = overrides?.filter(o => o.item_type==='fact').map(o => o.item_id) ?? [];
const oDocIds  = overrides?.filter(o => o.item_type==='doc').map(o => o.item_id) ?? [];

const { data: oFacts } = oFactIds.length
  ? await sb.from('facts').select('*').in('id', oFactIds)
  : { data: [] };

const { data: oDocs } = oDocIds.length
  ? await sb.from('docs').select('*').in('id', oDocIds)
  : { data: [] };

// merge with pinned+relevant (no dups)
const factMap = new Map();
(oFacts||[]).forEach(f => factMap.set(f.id, { ...f, _override: true }));
(pinnedFacts||[]).forEach(f => factMap.set(f.id, f));
(facts||[]).forEach(f => factMap.set(f.id, f));
const combinedFacts = Array.from(factMap.values()).slice(0, 12);

const style = (persona && persona.style_json) || {};
const brief = (project.brief_text || '').slice(0, 6000);

const { data: pinnedDocs } = await sb
  .from('docs')
  .select('*')
  .eq('project_id', projectId)
  .eq('pinned', true)
  .limit(6);

const docMap = new Map();
(oDocs||[]).forEach(d => docMap.set(d.id, { ...d, _override: true }));
(pinnedDocs||[]).forEach(d => docMap.set(d.id, d));
(docs||[]).forEach(d => docMap.set(d.id, d));
const combinedDocs = Array.from(docMap.values()).slice(0, 6);
// use combinedFacts / combinedDocs when building blocks
const blocks = [
  brief && `PROJECT_BRIEF:\n${brief}`,
  (combinedFacts && combinedFacts.length)
    ? `FACTS:\n${combinedFacts.map(f => `- [${f.type}] ${f.key}: ${f.value}${f.pinned ? ' (pinned)' : ''}`).join('\n')}`
    : '',
  (combinedDocs && combinedDocs.length)
    ? `DOC SNIPPETS:\n${combinedDocs.map(d => `# ${d.title}${d.pinned ? ' (pinned)' : ''}\n${d.content.slice(0, 800)}`).join('\n\n')}`
    : ''
].filter(Boolean);

  const system = [
    'You are MrWiskr, an ADHD-friendly assistant.',
    `Tone: ${style.tone || 'chaotic-hype'}. Emoji: ${style.emoji_level || 'med'}. Sentences: ${style.sentence_length || 'short'}.`,
    style.do && style.do.length ? `Always: ${style.do.join('; ')}` : '',
    style.dont && style.dont.length ? `Avoid: ${style.dont.join('; ')}` : '',
    'Be concise, celebratory, and never guilt. Offer small next steps.'
  ].filter(Boolean).join('\n');

  const messages = [
    { role: 'system', content: system },
    ...blocks.map(b => ({ role: 'system', content: b })),
    ...((recentMsgs || []).reverse().map(m => ({ role: m.role, content: m.content })))
  ];

  return { messages, meta: { project, persona, facts, docs, tagQuery } };
}
