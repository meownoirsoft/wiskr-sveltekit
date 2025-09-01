// src/routes/api/facts/create
import { json } from '@sveltejs/kit';
import { createOpenAIClient } from '$lib/server/openrouter.js';
import { refreshContextScore } from '$lib/server/utils/contextScore.js';

export const POST = async ({ request, locals }) => {
  const { data: { user } } = await locals.supabase.auth.getUser();
  if (!user) return json({ message: 'Unauthorized' }, { status: 401 });

  const { project_id, type = 'note', key, value, tags = [], pinned = false } = await request.json();
  if (!project_id || !key?.trim() || !value?.trim()) {
    return json({ message: 'Missing required fields' }, { status: 400 });
  }

  // 1) Insert fact (RLS via user client)
  const { data: fact, error: insErr } = await locals.supabase
    .from('facts')
    .insert({ project_id, type, key: key.trim(), value: value.trim(), tags, pinned })
    .select('*')
    .single();

  if (insErr) return json({ message: insErr.message }, { status: 500 });

  // 2) Create embedding (text to embed = a compact concatenation)
  const text = `[${type}] ${key}: ${value}`;
  // For embeddings, we need to use OpenAI directly (OpenRouter doesn't support embeddings yet)
  const openai = createOpenAIClient();
  let embedding = null;
  try {
    const emb = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    });
    embedding = emb.data[0]?.embedding || null;
  } catch (e) {
    // If embeddings fail, we still return 200; just no vector
    console.error('Embedding error (fact):', e?.message || e);
  }

  // 3) Update row with embedding (if we have one)
  if (embedding) {
    const { error: upErr } = await locals.supabase
      .from('facts')
      .update({ embedding })
      .eq('id', fact.id);
    if (upErr) console.error('facts embedding update error:', upErr.message);
  }

  // Auto-refresh entity cards based on the new fact
  try {
    const { handleNewFact } = await import('$lib/server/services/entityCardRefresh.js');
    handleNewFact(locals.supabase, fact).catch(error => {
      console.error('❌ EntityCardRefresh: Error in background processing:', error);
    });
  } catch (refreshError) {
    console.warn('⚠️ EntityCardRefresh: Failed to import refresh service:', refreshError);
  }

  // Refresh context score in background (especially important for pinned facts)
  if (pinned) {
    refreshContextScore(locals.supabase, project_id).catch(error => {
      console.error('❌ Context score refresh error:', error);
    });
  }

  return json({ fact });
};
