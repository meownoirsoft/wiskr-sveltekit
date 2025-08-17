// src/routes/api/chat/+server.js
import { json } from '@sveltejs/kit';
import { DateTime } from 'luxon';
import { buildContext } from '$lib/server/context/buildContext.js';
import { getModelConfig } from '$lib/server/openrouter.js';
import { DAILY_TOKEN_LIMIT } from '$env/static/private';

export const POST = async ({ request, locals }) => {
  const body = await request.json();
  const { projectId, message, modelKey = 'speed', tz = 'UTC', branchId = 'main', sessionId } = body;

  const { data: { user } } = await locals.supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  if (!projectId || !message?.trim()) return json({ message: 'Bad request' }, { status: 400 });

  // Get model configuration (OpenRouter or fallback to OpenAI)
  const { config: modelConf, client: openai } = getModelConfig(modelKey);

  // 1) Build base context
  const { messages: baseMessages } = await buildContext({ projectId, userMessage: message, branchId, supabase: locals.supabase });

  // 2) One-time overrides
  const nowISO = new Date().toISOString();
  const { data: overrides } = await locals.supabase
    .from('context_overrides')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .gt('expires_at', nowISO);

  const factIds = (overrides || []).filter(o => o.item_type === 'fact').map(o => o.item_id);
  const docIds  = (overrides || []).filter(o => o.item_type === 'doc').map(o => o.item_id);

  let oFacts = [], oDocs = [];
  if (factIds.length) {
    const { data } = await locals.supabase.from('facts').select('*').in('id', factIds);
    oFacts = data || [];
  }
  if (docIds.length) {
    const { data } = await locals.supabase.from('docs').select('*').in('id', docIds);
    oDocs = data || [];
  }

  const overrideBlocks = [];
  if (oFacts.length) {
    overrideBlocks.push(
      `OVERRIDE_FACTS (one-time):\n` + oFacts.map(f => `- [${f.type}] ${f.key}: ${f.value}`).join('\n')
    );
  }
  if (oDocs.length) {
    overrideBlocks.push(
      `OVERRIDE_DOCS (one-time):\n` + oDocs.map(d => `# ${d.title}\n${(d.content || '').slice(0, 800)}`).join('\n\n')
    );
  }

  const finalMessages = [
    ...baseMessages,
    ...overrideBlocks.map(content => ({ role: 'system', content })),
    { role: 'user', content: message }
  ];

  // 3) Soft daily cap (check BEFORE calling the model)
  const limit = Number(DAILY_TOKEN_LIMIT || 0) || 200_000;
  const startOfToday = DateTime.now().setZone(tz).startOf('day').toUTC().toISO();
  const { data: todayRows } = await locals.supabase
    .from('usage_logs')
    .select('tokens_in,tokens_out')
    .eq('user_id', user.id)
    .eq('project_id', projectId)
    .gte('created_at', startOfToday);

  const used = (todayRows ?? []).reduce((n, r) => n + (r.tokens_in || 0) + (r.tokens_out || 0), 0);
  const estThisIn = Math.round(JSON.stringify(finalMessages).length / 4);
  if (used + estThisIn >= limit) {
    return new Response(
      JSON.stringify({
        error: 'limit',
        message: `Daily cap reached. (${used.toLocaleString()}/${limit.toLocaleString()} tokens used today)`
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 4) Persist the user message once
  console.log('💾 Saving user message to DB:', { projectId, sessionId, branchId, role: 'user', content: message.slice(0,50) + '...' });
  const { data: userMsgResult, error: userMsgError } = await locals.supabase.from('messages').insert({
    project_id: projectId,
    session_id: sessionId,
    role: 'user',
    content: message,
    branch_id: branchId
  }).select();
  
  if (userMsgError) {
    console.error('❌ Error saving user message:', userMsgError);
  } else {
    console.log('✅ User message saved:', userMsgResult);
  }

  // 5) Stream from OpenRouter/OpenAI (robust async-iterator pattern)
  const stream = await openai.chat.completions.create({
    model: modelConf.name,
    temperature: 0.8,
    messages: finalMessages,
    stream: true
  });

  let full = '';
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const part of stream) {
          const delta = part?.choices?.[0]?.delta?.content || '';
          if (delta) {
            full += delta;
            controller.enqueue(encoder.encode(delta));
          }
        }

        // 6) Save assistant message
        console.log('💾 Saving assistant message to DB:', { projectId, sessionId, branchId, role: 'assistant', contentLength: full.length, modelKey });
        const { data: assistantMsgResult, error: assistantMsgError } = await locals.supabase.from('messages').insert({
          project_id: projectId,
          session_id: sessionId,
          role: 'assistant',
          content: full,
          branch_id: branchId,
          model_key: modelKey
        }).select();
        
        if (assistantMsgError) {
          console.error('❌ Error saving assistant message:', assistantMsgError);
        } else {
          console.log('✅ Assistant message saved:', assistantMsgResult);
        }

        // 7) Log usage ONCE (after you have the full reply)
        const inTok  = Math.round(JSON.stringify(finalMessages).length / 4);
        const outTok = Math.round(full.length / 4);
        const cost   = +(inTok * modelConf.inPerTok + outTok * modelConf.outPerTok).toFixed(6);

        const usagePayload = {
          user_id: user.id,
          project_id: projectId,
          model: modelConf.name,
          tokens_in: inTok,
          tokens_out: outTok,
          cost_usd: cost
        };
        
        // console.log('Inserting usage log:', usagePayload);
        const { data: usageResult, error: usageError } = await locals.supabase.from('usage_logs').insert(usagePayload).select();
        
        if (usageError) {
          console.error('Usage log insertion error:', usageError);
        } else {
          console.log('Usage log inserted successfully:', usageResult);
        }

        // 8) Clear one-time overrides
        if ((overrides || []).length) {
          await locals.supabase
            .from('context_overrides')
            .delete()
            .eq('project_id', projectId)
            .eq('user_id', user.id);
        }

        controller.enqueue(encoder.encode('[DONE]'));
        controller.close();
      } catch (err) {
        console.error('stream error', err);
        controller.error(err);
      }
    }
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
};
