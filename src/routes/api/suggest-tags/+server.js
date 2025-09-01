// src/routes/api/suggest-tags/+server.js
import { json } from '@sveltejs/kit';
import { DateTime } from 'luxon';
import { getModelConfig } from '$lib/server/openrouter.js';
import { DAILY_TOKEN_LIMIT } from '$env/static/private';

export const POST = async ({ request, locals }) => {
  const body = await request.json();
  const { content, title, type, existingTags = [], projectId } = body;

  const { data: { user } } = await locals.supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  if (!content && !title) return json({ message: 'Bad request: content or title required' }, { status: 400 });

  // Get model configuration - use micro model for tag suggestions (cheapest)
  const { config: modelConf, client: openai } = getModelConfig('micro');

  // Get existing tags from the project for context
  let contextTags = [];
  try {
    if (projectId) {
      // Get existing tags from facts and docs for context
      const { data: facts } = await locals.supabase
        .from('project_facts')
        .select('tags')
        .eq('project_id', projectId)
        .eq('user_id', user.id);
      
      const { data: docs } = await locals.supabase
        .from('project_docs')
        .select('tags')
        .eq('project_id', projectId)
        .eq('user_id', user.id);

      // Collect all unique tags from existing items
      const allTags = [
        ...(facts || []).flatMap(f => f.tags || []),
        ...(docs || []).flatMap(d => d.tags || [])
      ];
      contextTags = [...new Set(allTags)].filter(tag => tag && tag.trim());
    }
  } catch (error) {
    console.log('Could not fetch existing tags for context:', error.message);
  }

  // Build the text to analyze
  const textToAnalyze = [title, content].filter(Boolean).join('\n\n');
  
  // Create system prompt
  const systemPrompt = `You are a tag suggestion assistant. Analyze the provided text and suggest 3-6 relevant, concise tags that would help categorize and organize this content.

Guidelines:
- Generate short, descriptive tags (1-3 words each)
- Focus on key topics, themes, and categories
- Make tags specific enough to be useful but general enough to be reusable
- Use lowercase with hyphens for multi-word tags (e.g., "user-interface", "data-analysis")
- Avoid overly generic tags like "important" or "note"
${type ? `- Consider that this is a ${type} when suggesting tags` : ''}
${existingTags.length > 0 ? `- Current tags: ${existingTags.join(', ')}` : ''}
${contextTags.length > 0 ? `\n\nExisting project tags for reference (suggest similar ones if relevant): ${contextTags.slice(0, 20).join(', ')}` : ''}

Return ONLY the suggested tags as a comma-separated list. Example: "authentication, security, api, database"`;

  const userPrompt = `Analyze this content and suggest relevant tags:\n\n${textToAnalyze}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  // Check daily usage limit
  const limit = Number(DAILY_TOKEN_LIMIT || 0) || 200_000;
  const tz = 'UTC';
  const startOfToday = DateTime.now().setZone(tz).startOf('day').toUTC().toISO();
  const { data: todayRows } = await locals.supabase
    .from('usage_logs')
    .select('tokens_in,tokens_out')
    .eq('user_id', user.id)
    .gte('created_at', startOfToday);

  const used = (todayRows ?? []).reduce((n, r) => n + (r.tokens_in || 0) + (r.tokens_out || 0), 0);
  const estThisIn = Math.round(JSON.stringify(messages).length / 4);
  if (used + estThisIn >= limit) {
    return json({
      error: 'limit',
      message: `Daily cap reached. (${used.toLocaleString()}/${limit.toLocaleString()} tokens used today)`
    }, { status: 429 });
  }

  try {
    // Call AI API
    const response = await openai.chat.completions.create({
      model: modelConf.name,
      temperature: 0.3, // Lower temperature for more consistent tag suggestions
      messages: messages,
      max_tokens: 100 // Keep it short for tag suggestions
    });

    const content_response = response.choices[0]?.message?.content || '';
    
    // Parse the response into individual tags
    const suggestedTags = content_response
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag && tag.length > 0 && tag.length <= 30) // Filter reasonable tags
      .filter(tag => !existingTags.map(t => t.toLowerCase()).includes(tag)) // Remove already selected tags
      .slice(0, 6); // Limit to 6 suggestions max

    // Log usage
    const inTok = Math.round(JSON.stringify(messages).length / 4);
    const outTok = Math.round(content_response.length / 4);
    const cost = +(inTok * modelConf.inPerTok + outTok * modelConf.outPerTok).toFixed(6);

    if (projectId) {
      const usagePayload = {
        user_id: user.id,
        project_id: projectId,
        model: modelConf.name,
        tokens_in: inTok,
        tokens_out: outTok,
        cost_usd: cost
      };

      await locals.supabase.from('usage_logs').insert(usagePayload);
    }

    return json({
      suggestedTags,
      usage: {
        tokens_in: inTok,
        tokens_out: outTok,
        cost_usd: cost
      }
    });

  } catch (error) {
    console.error('Error generating tag suggestions:', error);
    return json({
      error: 'generation_failed',
      message: 'Failed to generate tag suggestions. Please try again.'
    }, { status: 500 });
  }
};
