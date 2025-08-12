import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export const POST = async ({ request, locals }) => {
  const { data: { user } } = await locals.supabase.auth.getUser();
  if (!user) return json({ message: 'Unauthorized' }, { status: 401 });

  const { project_id, title, content = '', tags = [], pinned = false } = await request.json();
  if (!project_id || !title?.trim()) {
    return json({ message: 'Missing required fields' }, { status: 400 });
  }

  const { data: doc, error: insErr } = await locals.supabase
    .from('docs')
    .insert({ project_id, title: title.trim(), content, tags, pinned })
    .select('*')
    .single();
  if (insErr) return json({ message: insErr.message }, { status: 500 });

  // Build text to embed
  const body = (content || '').slice(0, 4000); // keep it modest
  const text = `${title}\n\n${body}`;

  let embedding = null;
  try {
    const emb = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    });
    embedding = emb.data[0]?.embedding || null;
  } catch (e) {
    console.error('Embedding error (doc):', e?.message || e);
  }

  if (embedding) {
    const { error: upErr } = await locals.supabase
      .from('docs')
      .update({ embedding })
      .eq('id', doc.id);
    if (upErr) console.error('docs embedding update error:', upErr.message);
  }

  return json({ doc });
};
