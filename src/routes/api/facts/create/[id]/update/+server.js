import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';
import { refreshContextScore } from '$lib/server/utils/contextScore.js';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export const POST = async ({ params, request, locals }) => {
  const { id } = params;
  const { data: { user } } = await locals.supabase.auth.getUser();
  if (!user) return json({ message: 'Unauthorized' }, { status: 401 });

  // Incoming partial updates
  const {
    type,          // optional
    key,           // optional
    value,         // optional
    tags,          // optional (array)
    pinned,        // optional (boolean)
    reembed        // optional: 'auto' | 'force' | 'skip'
  } = await request.json();

  // Fetch current row (so we can detect changes)
  const { data: current, error: curErr } = await locals.supabase
    .from('facts')
    .select('id, project_id, type, key, value, tags, pinned')
    .eq('id', id)
    .single();
  if (curErr) return json({ message: curErr.message }, { status: 404 });

  // Apply updates
  const patch = {};
  if (typeof type   !== 'undefined') patch.type   = type;
  if (typeof key    !== 'undefined') patch.key    = key?.trim();
  if (typeof value  !== 'undefined') patch.value  = value?.trim();
  if (typeof tags   !== 'undefined') patch.tags   = tags;
  if (typeof pinned !== 'undefined') patch.pinned = !!pinned;

  // Detect if pinned status is changing (affects context score)
  const pinnedStatusChanged = typeof pinned !== 'undefined' && !!pinned !== current.pinned;

  // Save updates first (RLS enforced)
  const { data: updated, error: upErr } = await locals.supabase
    .from('facts')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (upErr) return json({ message: upErr.message }, { status: 500 });

  // Decide if we should re-embed
  const autoChanged =
    (typeof type   !== 'undefined' && type   !== current.type) ||
    (typeof key    !== 'undefined' && key?.trim()    !== current.key) ||
    (typeof value  !== 'undefined' && value?.trim()  !== current.value);

  const want =
    reembed === 'force' ? 'force' :
    reembed === 'skip'  ? 'skip'  :
    (autoChanged ? 'force' : 'skip');

  if (want === 'skip') {
    // Refresh context score if pinned status changed
    if (pinnedStatusChanged) {
      refreshContextScore(locals.supabase, current.project_id).catch(error => {
        console.error('❌ Context score refresh error (no reembed):', error);
      });
    }
    return json({ fact: updated, reembedded: false });
  }

  // Build text and create embedding
  const text = `[${updated.type}] ${updated.key}: ${updated.value}`;
  try {
    const emb = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    });
    const embedding = emb.data[0]?.embedding || null;
    if (embedding) {
      const { error: embErr } = await locals.supabase
        .from('facts')
        .update({ embedding })
        .eq('id', id);
      if (embErr) console.error('facts embedding update error:', embErr.message);
    }
    
    // Refresh context score if pinned status changed
    if (pinnedStatusChanged) {
      refreshContextScore(locals.supabase, current.project_id).catch(error => {
        console.error('❌ Context score refresh error (with reembed):', error);
      });
    }
    
    return json({ fact: updated, reembedded: !!embedding });
  } catch (e) {
    console.error('Embedding error (fact update):', e?.message || e);
    
    // Still refresh context score if pinned status changed, even on embedding error
    if (pinnedStatusChanged) {
      refreshContextScore(locals.supabase, current.project_id).catch(error => {
        console.error('❌ Context score refresh error (embedding failed):', error);
      });
    }
    
    return json({ fact: updated, reembedded: false, warn: 'embedding_failed' });
  }
};
