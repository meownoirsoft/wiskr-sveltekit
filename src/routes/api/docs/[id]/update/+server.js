import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export const POST = async ({ params, request, locals }) => {
  const { id } = params;
  const { data: { user } } = await locals.supabase.auth.getUser();
  if (!user) return json({ message: 'Unauthorized' }, { status: 401 });

  const {
    title,        // optional
    content,      // optional
    tags,         // optional
    pinned,       // optional
    reembed       // optional: 'auto' | 'force' | 'skip'
  } = await request.json();

  // Load current
  const { data: current, error: curErr } = await locals.supabase
    .from('docs')
    .select('id, project_id, title, content, tags, pinned')
    .eq('id', id)
    .single();
  if (curErr) return json({ message: curErr.message }, { status: 404 });

  // Patch with validation
  const patch = {};
  if (typeof title   !== 'undefined') {
    if (!title?.trim()) {
      return json({ message: 'Document title cannot be empty' }, { status: 400 });
    }
    patch.title = title.trim();
  }
  if (typeof content !== 'undefined') {
    if (!content?.trim()) {
      return json({ message: 'Document content cannot be empty' }, { status: 400 });
    }
    patch.content = content.trim();
  }
  if (typeof tags    !== 'undefined') patch.tags    = tags;
  if (typeof pinned  !== 'undefined') patch.pinned  = !!pinned;

  const { data: updated, error: upErr } = await locals.supabase
    .from('docs')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (upErr) return json({ message: upErr.message }, { status: 500 });

  // Re-embed decision
  const autoChanged =
    (typeof title   !== 'undefined' && title?.trim()   !== current.title) ||
    (typeof content !== 'undefined' && (content ?? '') !== current.content);

  const want =
    reembed === 'force' ? 'force' :
    reembed === 'skip'  ? 'skip'  :
    (autoChanged ? 'force' : 'skip');

  if (want === 'skip') {
    return json({ doc: updated, reembedded: false });
  }

  // Build text and embed
  const body = (updated.content || '').slice(0, 4000);
  const text = `${updated.title}\n\n${body}`;

  try {
    const emb = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    });
    const embedding = emb.data[0]?.embedding || null;
    if (embedding) {
      const { error: embErr } = await locals.supabase
        .from('docs')
        .update({ embedding })
        .eq('id', id);
      if (embErr) console.error('docs embedding update error:', embErr.message);
    }
    return json({ doc: updated, reembedded: !!embedding });
  } catch (e) {
    console.error('Embedding error (doc update):', e?.message || e);
    return json({ doc: updated, reembedded: false, warn: 'embedding_failed' });
  }
};
