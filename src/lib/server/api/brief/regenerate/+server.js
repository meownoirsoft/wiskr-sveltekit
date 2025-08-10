// src/routes/api/brief/regenerate/+server.js
import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import { supabaseAdmin } from '$lib/server/supabaseAdmin.js';

export const POST = async ({ request, locals }) => {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });
  const { projectId } = await request.json();

  const sb = supabaseAdmin();
  const { data: facts } = await sb.from('facts').select('*').eq('project_id', projectId).limit(100);
  const { data: docs } = await sb.from('docs').select('*').eq('project_id', projectId).limit(10);

  const factsText = (facts || []).map(f => `- [${f.type}] ${f.key}: ${f.value}`).join('\n');
  const docsText = (docs || []).map(d => `# ${d.title}\n${d.content}`).join('\n\n');

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = `
Summarize the essential, stable facts of this project for reuse by an AI assistant.
Keep 300–800 tokens. Prefer lists. No fluff.

FACTS:
${factsText}

DOCS (excerpts):
${docsText}
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    messages: [{ role: 'system', content: 'You compress project knowledge crisply.' }, { role: 'user', content: prompt }]
  });

  const brief = completion.choices?.[0]?.message?.content?.trim() || '';
  await sb.from('projects').update({ brief_text: brief, brief_updated_at: new Date().toISOString() }).eq('id', projectId);

  return json({ ok: true });
};
