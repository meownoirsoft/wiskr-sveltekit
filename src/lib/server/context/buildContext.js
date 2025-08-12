// Build chat system context: pinned + top-k semantic matches via pgvector.
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Context limits - tuned for optimal coverage while respecting token limits
const MAX_PINNED_FACTS = 50;     // Increased to ensure all pinned facts are included
const MAX_PINNED_DOCS = 25;      // Increased to ensure all pinned docs are included
const K_FACTS = 12;              // More related facts for better coverage
const K_DOCS = 6;                // More related docs for better coverage
const FALLBACK_FACTS = 15;       // More fallback facts when vector search fails
const FALLBACK_DOCS = 8;         // More fallback docs when vector search fails

// Character limits optimized for token efficiency
const MAX_FACT_CHARS = 500;      // Increased from 400 for better context
const MAX_DOC_CHARS = 1000;      // Increased from 800 for better context
const MAX_BRIEF_CHARS = 2000;    // Increased from 1500 for project context

function clip(str, max) { return (str || '').length > max ? str.slice(0, max) : (str || ''); }
export async function buildContext({ supabase, projectId, userMessage, branchId = 'main' }) {
  if (!supabase) throw new Error('buildContext: missing `supabase`');
  if (!projectId) throw new Error('buildContext: missing `projectId`');

  console.log('🏗️  buildContext: Starting context build for project:', projectId, 'branch:', branchId);
  console.log('📝 User message:', userMessage?.substring(0, 100) + (userMessage?.length > 100 ? '...' : ''));

  const blocks = [];

  // 1) PINNED FACTS FIRST - HIGHEST PRIORITY
  // Get ALL pinned facts/docs - they're critical and must never be missed
  const [{ data: pFacts }, { data: pDocs }] = await Promise.all([
    supabase.from('facts').select('id,type,key,value').eq('project_id', projectId).eq('pinned', true).limit(MAX_PINNED_FACTS),
    supabase.from('docs').select('id,title,content').eq('project_id', projectId).eq('pinned', true).limit(MAX_PINNED_DOCS)
  ]);

  if (pFacts?.length) {
    blocks.push(
      '🚨 MANDATORY INFORMATION - MUST USE IN ALL RESPONSES:\n\n' +
      pFacts.map(f => `⭐ [${f.type}] ${f.key}: ${clip(f.value, MAX_FACT_CHARS)}`).join('\n\n') +
      '\n\n🔥 CRITICAL: These pinned characters/facts MUST be included in every relevant response. Do not ignore them.'
    );
    console.log('📌 Added pinned facts:', pFacts.length, 'facts -', pFacts.map(f => f.key));
    if (pFacts.length >= MAX_PINNED_FACTS * 0.8) {
      console.log('⚠️  WARNING: Approaching max pinned facts limit. Consider reviewing pinned items.');
    }
  } else {
    console.log('📌 No pinned facts found');
  }
  
  if (pDocs?.length) {
    blocks.push(
      '🚨 MANDATORY DOCUMENTS - MUST USE IN ALL RESPONSES:\n\n' +
      pDocs.map(d => `⭐ ${d.title}\n${clip(d.content, MAX_DOC_CHARS)}`).join('\n\n') +
      '\n\n🔥 CRITICAL: These pinned documents MUST be referenced in every relevant response. Do not ignore them.'
    );
    console.log('📌 Added pinned docs:', pDocs.length, 'docs -', pDocs.map(d => d.title));
    if (pDocs.length >= MAX_PINNED_DOCS * 0.8) {
      console.log('⚠️  WARNING: Approaching max pinned docs limit. Consider reviewing pinned items.');
    }
  } else {
    console.log('📌 No pinned docs found');
  }

  // 2) Project brief (lower priority)
  const { data: proj } = await supabase
    .from('projects')
    .select('name, brief_text')
    .eq('id', projectId)
    .single();
  if (proj?.brief_text) {
    blocks.push(`PROJECT_BRIEF:\n${clip(proj.brief_text, MAX_BRIEF_CHARS)}`);
    console.log('📋 Added project brief:', proj.name);
  } else {
    console.log('📋 No project brief found');
  }

  // 3) Query embedding for the user's message (to find top-k)
  let qvec = null;
  if (userMessage?.trim()) {
    console.log('🔍 Generating embedding for user message...');
    try {
      const emb = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: userMessage
      });
      qvec = emb.data[0]?.embedding || null;
      console.log('✅ Embedding generated successfully, vector length:', qvec?.length || 0);
    } catch (e) {
      console.error('❌ Query embedding error:', e?.message || e);
    }
  } else {
    console.log('⚠️  No user message provided, skipping embedding');
  }

  if (qvec) {
    // 4) Top-K semantic matches (pgvector)
    console.log('🎯 Attempting vector similarity search...');
    try {
      const [{ data: simFacts }, { data: simDocs }] = await Promise.all([
        supabase.rpc('match_facts', { p_project_id: projectId, p_query: qvec, p_limit: K_FACTS }),
        supabase.rpc('match_docs',  { p_project_id: projectId, p_query: qvec, p_limit: K_DOCS  })
      ]);

      console.log('✅ Vector search successful!');
      console.log('🔬 Vector-matched facts:', simFacts?.length || 0, 'found -', simFacts?.map(f => `${f.key} (${f.similarity?.toFixed(3)})`) || []);
      console.log('🔬 Vector-matched docs:', simDocs?.length || 0, 'found -', simDocs?.map(d => `${d.title} (${d.similarity?.toFixed(3)})`) || []);

      if (simFacts?.length) {
        blocks.push(
          'RELATED_FACTS:\n' +
          simFacts.map(f => `- [${f.type}] ${f.key}: ${clip(f.value, MAX_FACT_CHARS)}`).join('\n')
        );
      }
      if (simDocs?.length) {
        blocks.push(
          'RELATED_DOCS:\n' +
          simDocs.map(d => `# ${d.title}\n${clip(d.content, MAX_DOC_CHARS)}`).join('\n\n')
        );
      }
    } catch (e) {
      console.warn('❌ Vector search failed, falling back to recent items:', e.message);
      console.log('🔄 Switching to fallback mode...');
      // Fall through to the else block logic
      qvec = null;
    }
  }
  
  if (!qvec) {
    console.log('📅 Using FALLBACK mode - fetching recent items...');
    // 5) Fallback if no embeddings yet or API hiccup:
    // Increased limits for better fallback coverage
    const [{ data: rFacts }, { data: rDocs }] = await Promise.all([
      supabase.from('facts').select('type,key,value').eq('project_id', projectId).order('created_at', { ascending: false }).limit(FALLBACK_FACTS),
      supabase.from('docs').select('title,content').eq('project_id', projectId).order('created_at', { ascending: false }).limit(FALLBACK_DOCS)
    ]);
    
    console.log('📅 Fallback facts:', rFacts?.length || 0, 'found -', rFacts?.map(f => f.key) || []);
    console.log('📅 Fallback docs:', rDocs?.length || 0, 'found -', rDocs?.map(d => d.title) || []);
    
    if (rFacts?.length) {
      blocks.push('RECENT_FACTS:\n' + rFacts.map(f => `- [${f.type}] ${f.key}: ${clip(f.value, MAX_FACT_CHARS * 0.6)}`).join('\n'));
    }
    if (rDocs?.length) {
      blocks.push('RECENT_DOCS:\n' + rDocs.map(d => `# ${d.title}\n${clip(d.content, MAX_DOC_CHARS * 0.6)}`).join('\n\n'));
    }
  }

  // 6) Add recent conversation history from this branch (last 10 messages)
  console.log('💬 Fetching conversation history for branch:', branchId);
  const { data: recentMessages } = await supabase
    .from('messages')
    .select('role, content')
    .eq('project_id', projectId)
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false })
    .limit(10);

  const conversationHistory = [];
  if (recentMessages?.length) {
    console.log('💬 Found', recentMessages.length, 'recent messages in branch');
    // Reverse to get chronological order
    recentMessages.reverse().forEach(msg => {
      conversationHistory.push({ role: msg.role, content: msg.content });
    });
  } else {
    console.log('💬 No conversation history found for this branch');
  }

  const finalMessages = [
    ...blocks.map(content => ({ role: 'system', content })),
    ...conversationHistory
  ];
  
  console.log('📦 Context build complete!');
  console.log('📊 Final context summary:');
  console.log('   - Total blocks:', blocks.length);
  console.log('   - Block types:', blocks.map(block => block.split(':\n')[0]));
  console.log('   - Total context length:', blocks.join('\n').length, 'characters');
  console.log('   - Mode used:', qvec ? '🎯 VECTOR SEARCH' : '📅 FALLBACK (Recent Items)');
  console.log('🏁 buildContext finished\n');
  
  return { messages: finalMessages };
}
