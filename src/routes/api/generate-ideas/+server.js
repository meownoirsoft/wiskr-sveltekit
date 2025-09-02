// src/routes/api/generate-ideas/+server.js
import { json } from '@sveltejs/kit';
import { DateTime } from 'luxon';
import { getModelConfig } from '$lib/server/openrouter.js';
import { DAILY_TOKEN_LIMIT } from '$env/static/private';
import { getRelatedIdeasLimit, canGenerateIdeas } from '$lib/config/tiers.js';
import { getUserTier } from '$lib/utils/tiers.js';

export const POST = async ({ request, locals }) => {
  const body = await request.json();
  const { projectId, facts = [], docs = [], recentMessages = [], likedIdeasCount = 0, dismissedIdeas = [], tz = 'UTC' } = body;

  const { data: { user } } = await locals.supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  if (!projectId) return json({ message: 'Bad request' }, { status: 400 });

  // Get user tier for rate limiting
  const userTier = getUserTier({
    tier: locals.userTier || 0,
    trial_ends_at: locals.trialEndsAt
  });
  const ideasLimit = getRelatedIdeasLimit(userTier);
  
  // Check daily Related Ideas usage - use user's timezone for proper day boundary
  const startOfToday = DateTime.now().setZone(tz).startOf('day').toUTC().toISO();
  const { data: todayIdeas } = await locals.supabase
    .from('usage_logs')
    .select('id')
    .eq('user_id', user.id)
    .eq('model', 'related-ideas')
    .gte('created_at', startOfToday);
    
  const ideasUsedToday = todayIdeas?.length || 0;
  
  if (!canGenerateIdeas(userTier, ideasUsedToday)) {
    return json({
      error: 'ideas_limit_reached',
      message: `Daily Related Ideas limit reached (${ideasUsedToday}/${ideasLimit}). Upgrade to Pro for more generations per day.`,
      used: ideasUsedToday,
      limit: ideasLimit,
      tier: userTier
    }, { status: 429 });
  }

  // Get model configuration - use micro model for idea generation (cheapest)
  const { config: modelConf, client: openai } = getModelConfig('micro');

  // Build context from project data
  const contextParts = [];
  
  // Add facts to context
  if (facts.length > 0) {
    contextParts.push(
      `PROJECT FACTS:\n` + 
      facts.map(f => `- [${f.type || 'note'}] ${f.key}: ${f.value}`).join('\n')
    );
  }
  
  // Add docs to context  
  if (docs.length > 0) {
    contextParts.push(
      `PROJECT DOCUMENTS:\n` + 
      docs.map(d => `# ${d.title}\n${(d.content || '').slice(0, 500)}`).join('\n\n')
    );
  }
  
  // Add recent conversation context
  if (recentMessages.length > 0) {
    contextParts.push(
      `RECENT CONVERSATION:\n` + 
      recentMessages.map(m => `${m.role}: ${(m.content || '').slice(0, 200)}`).join('\n')
    );
  }

  const contextString = contextParts.join('\n\n');
  
  // Get user's preferred max ideas setting (default to 8 if not found)
  let maxIdeas = 8;
  try {
    const { data: preferences } = await locals.supabase
      .from('user_preferences')
      .select('max_related_ideas')
      .eq('user_id', user.id)
      .single();
    
    if (preferences && preferences.max_related_ideas) {
      maxIdeas = preferences.max_related_ideas;
    }
  } catch (error) {
    // If there's an error fetching preferences, use default
    console.log('Using default maxIdeas due to preferences error:', error.message);
  }
  
  // Calculate how many new ideas to generate (total target based on user preference, minus already liked ideas)
  const newIdeasToGenerate = Math.max(1, maxIdeas - likedIdeasCount);

  // Build system prompt with dismissed ideas context
  let systemPrompt = `You are an AI assistant that generates related ideas for creative projects. Based on the provided project context, generate ${newIdeasToGenerate} concise, actionable ideas that could help expand or explore the project further.

Each idea should be:
- Specific and actionable
- Related to the project context
- Designed to spark curiosity or provide new directions
- 1-2 sentences max

Focus on practical next steps, interesting questions to explore, related concepts to investigate, or creative angles to consider.`;

  // Add dismissed ideas context if any exist
  if (dismissedIdeas.length > 0) {
    systemPrompt += `\n\nIMPORTANT: The user has previously dismissed these ideas, so avoid generating anything similar in concept or approach:\n${dismissedIdeas.map((idea, i) => `${i+1}. ${idea}`).join('\n')}`;
  }

  const userPrompt = contextString.trim() 
    ? `Based on this project context, suggest related ideas to explore:\n\n${contextString}`
    : `Generate some general creative project ideas for exploration.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  // Check daily token usage limit - also use user's timezone for consistency
  const limit = Number(DAILY_TOKEN_LIMIT || 0) || 200_000;
  const startOfTodayForTokens = DateTime.now().setZone(tz).startOf('day').toUTC().toISO();
  const { data: todayRows } = await locals.supabase
    .from('usage_logs')
    .select('tokens_in,tokens_out')
    .eq('user_id', user.id)
    .eq('project_id', projectId)
    .gte('created_at', startOfTodayForTokens);

  const used = (todayRows ?? []).reduce((n, r) => n + (r.tokens_in || 0) + (r.tokens_out || 0), 0);
  const estThisIn = Math.round(JSON.stringify(messages).length / 4);
  if (used + estThisIn >= limit) {
    return json({
      error: 'limit',
      message: `Daily cap reached. (${used.toLocaleString()}/${limit.toLocaleString()} tokens used today)`
    }, { status: 429 });
  }

  try {
    // Call OpenRouter/OpenAI API
    const response = await openai.chat.completions.create({
      model: modelConf.name,
      temperature: 0.9, // Higher creativity for idea generation
      messages: messages,
      max_tokens: 800 // Reasonable limit for ideas list
    });

    const content = response.choices[0]?.message?.content || '';
    
    // Parse the response into individual ideas
    const ideas = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.match(/^#+\s/)) // Remove headers
      .map(line => line.replace(/^[-*]\s*/, '')) // Remove bullet points
      .filter(line => line.length > 10) // Filter out very short lines
      .slice(0, newIdeasToGenerate); // Limit to requested number of new ideas

    // Log usage
    const inTok = Math.round(JSON.stringify(messages).length / 4);
    const outTok = Math.round(content.length / 4);
    const cost = +(inTok * modelConf.inPerTok + outTok * modelConf.outPerTok).toFixed(6);

    const usagePayload = {
      user_id: user.id,
      project_id: projectId,
      model: modelConf.name,
      tokens_in: inTok,
      tokens_out: outTok,
      cost_usd: cost
    };

    // Log the AI model usage
    await locals.supabase.from('usage_logs').insert(usagePayload);
    
    // Also log the Related Ideas generation for rate limiting
    const ideasUsagePayload = {
      user_id: user.id,
      project_id: projectId,
      model: 'related-ideas',
      tokens_in: 1, // Count as 1 generation
      tokens_out: 0,
      cost_usd: 0
    };
    
    await locals.supabase.from('usage_logs').insert(ideasUsagePayload);

    // Save generated ideas to the database for searchability
    try {
      const ideasToSave = ideas.map(idea => ({
        title: idea,
        text: idea,
        description: idea
      }));

      const { error: saveError } = await locals.supabase
        .from('ideas')
        .insert(
          ideasToSave.map(idea => ({
            project_id: projectId,
            title: idea.title,
            description: idea.description,
            text: idea.text,
            user_id: user.id,
            created_at: new Date().toISOString()
          }))
        );

      if (saveError) {
        console.error('Failed to save ideas to database:', saveError);
        // Don't fail the request - ideas were generated successfully
      } else {
        console.log(`🔍 Ideas API: Saved ${ideas.length} generated ideas to database`);
      }
    } catch (saveError) {
      console.error('Error saving ideas to database:', saveError);
      // Don't fail the request - ideas were generated successfully
    }

    return json({
      ideas: ideas,
      usage: {
        tokens_in: inTok,
        tokens_out: outTok,
        cost_usd: cost
      },
      rateLimit: {
        used: ideasUsedToday + 1, // Include this generation
        remaining: Math.max(0, ideasLimit - ideasUsedToday - 1)
      }
    });

  } catch (error) {
    console.error('Error generating ideas:', error);
    return json({
      error: 'generation_failed',
      message: 'Failed to generate ideas. Please try again.'
    }, { status: 500 });
  }
};
