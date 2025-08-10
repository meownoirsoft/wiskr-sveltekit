import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import { buildContext } from '$lib/server/context/buildContext.js';
import { supabaseAdmin } from '$lib/server/supabaseAdmin.js';

export const POST = async ({ request, locals }) => {
  const { projectId, message } = await request.json();
  if (!locals.user) return new Response('Unauthorized', { status: 401 });

  const { messages } = await buildContext({ projectId, userMessage: message });

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Save the user message immediately
  const sb = supabaseAdmin();
  await sb.from('messages').insert({ project_id: projectId, role: 'user', content: message });

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.8,
    stream: true,
    messages: [...messages, { role: 'user', content: message }]
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let full = '';

  const readable = new ReadableStream({
    async pull(controller) {
      const { value, done } = await stream.next();
      if (done) {
        // persist assistant message at end
        await sb.from('messages').insert({ project_id: projectId, role: 'assistant', content: full });
        controller.enqueue(encoder.encode('[DONE]'));
        controller.close();
        return;
      }
      const chunk = value?.choices?.[0]?.delta?.content || '';
      full += chunk;
      controller.enqueue(encoder.encode(chunk));
    }
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
};
