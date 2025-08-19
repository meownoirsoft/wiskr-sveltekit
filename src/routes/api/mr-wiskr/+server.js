// src/routes/api/mr-wiskr/+server.js
import { error, json } from '@sveltejs/kit';
import { getModelConfig } from '$lib/server/openrouter.js';

const MR_WISKR_SYSTEM_PROMPT = `You are Mr. Wiskr: a wise, friendly mentor who genuinely cares about helping people understand confusing responses from their digital friends.

You're like that friend who's great at explaining things - you break down complex stuff, spot when something doesn't sound right, and help people figure out their next moves. You have a warm personality with just a touch of gentle humor.

IMPORTANT: When explaining what one of your friends said, refer to them by their friendly name or as "your friend" - like "What I think Claude meant here is..." or "What your friend was getting at is..." This helps people understand you're interpreting someone else's response, not claiming it as your own.

NEVER USE TECHNICAL TERMS: Don't say "AI" or "model" or "assistant" - these are your friends! Use their names (Claude, ChatGPT, etc.) or just say "your friend" or "one of my friends". Keep it warm and social.

BE FLEXIBLE: People ask about all kinds of things! Sometimes they'll ask questions related to their project, sometimes completely random stuff - cooking, relationships, random trivia, whatever's on their mind. That's totally normal and expected. Just help with whatever they're curious about at face value. If there's project context available and it seems relevant, great! If not, no worries - just be your helpful self.

- Write like you're talking to a friend who asked for help
- Use conversational language, not formal AI-speak  
- Break things into simple, digestible pieces
- Never make up facts - if you're unsure, say so
- Explain technical terms like you're talking to a smart friend, not a computer
- Keep it practical and actionable

Aim for responses that feel helpful and human, usually under 150 words.`;

export async function POST({ request, locals }) {
  try {
    const { text, type = 'translate', projectContext = null, friendName = '' } = await request.json();

    if (!text || typeof text !== 'string') {
      throw error(400, 'Text is required');
    }

    // Get user for authentication and usage tracking
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) {
      throw error(401, 'Unauthorized');
    }

    // Use fast model for Mr Wiskr since he should be quick and helpful
    const modelKey = 'speed';
    const { config: modelConf, client: openai } = getModelConfig(modelKey);

    // Build context information
    let contextInfo = '';
    if (projectContext) {
      contextInfo = `\n\nPROJECT CONTEXT:
- Project: ${projectContext.name || 'Unnamed Project'}
- Description: ${projectContext.description || 'No description provided'}
- Working on: ${projectContext.currentFocus || 'General development'}

Keep your advice relevant to this project scope.`;
    }

    // Determine the specific task for Mr Wiskr
    let userPrompt;
    const friendRef = friendName ? friendName : 'one of my friends';
    
    switch (type) {
      case 'translate':
        userPrompt = `Hey, I got this response from ${friendRef} and it's pretty confusing. Can you help me break it down into plain English?

Here's what they said:
"""
${text}
"""

I'd love your take on what they actually mean here, and if there's any jargon or technical stuff, can you explain it like I'm a regular person?${contextInfo}`;
        break;
      
      case 'selection':
        userPrompt = `I was reading a response from ${friendRef} and this specific part caught my attention because it seems really important (or confusing):

"""
${text}
"""

What do you think this actually means? And more importantly, what should I do with this information?${contextInfo}`;
        break;
      
      case 'follow-up':
        userPrompt = `I need some more clarity on this topic. ${friendRef} gave me this response but I could use your perspective:

"""
${text}
"""

Can you help me understand this better? Maybe add some more detail or examples that would make it click for me?${contextInfo}`;
        break;
      
      case 'show-examples':
        userPrompt = `I'm looking at this response from ${friendRef} and while I get the general idea, I'm having trouble picturing how this actually works in practice:

"""
${text}
"""

Could you give me some real, concrete examples that would help me see what this looks like in action? I learn better with actual scenarios.${contextInfo}`;
        break;
      
      case 'next-steps':
        userPrompt = `Okay, so I got this response from ${friendRef}, and now I'm wondering... what exactly am I supposed to do with this information?

"""
${text}
"""

Can you help me figure out the practical next steps? Like, what should I actually do now that I have this information?${contextInfo}`;
        break;
      
      case 'critique':
        userPrompt = `I got this response from ${friendRef}, but I'm a bit skeptical and want a second opinion. Can you take a look and see if anything seems off?

"""
${text}
"""

I'm wondering if there are any red flags, missing pieces, or things that don't quite add up. What should I be questioning or double-checking here?${contextInfo}`;
        break;
      
      default:
        userPrompt = `Hey, I got this response from ${friendRef} and I'm trying to make sense of it:

"""
${text}
"""

What do you think this actually means in practical terms?${contextInfo}`;
    }

    // Call the AI model
    const messages = [
      { role: 'system', content: MR_WISKR_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ];

    let response;
    try {
      response = await openai.chat.completions.create({
        model: modelConf.name,
        messages: messages,
        max_tokens: 300, // Keep Mr Wiskr concise
        temperature: 0.7, // Slightly creative but reliable
      });
    } catch (modelError) {
      console.error('Mr Wiskr model error:', modelError);
      throw error(500, "Sorry, Mr Wiskr is having trouble checking his notes right now. Please try again in a moment!");
    }

    if (!response?.choices?.[0]?.message?.content) {
      throw error(500, "Mr Wiskr seems to be at a loss for words right now. Please try again!");
    }

    const responseContent = response.choices[0].message.content.trim();

    // Calculate tokens and cost for usage tracking (similar to chat API)
    const inTok = Math.round(JSON.stringify(messages).length / 4);
    const outTok = Math.round(responseContent.length / 4);
    const cost = +(inTok * modelConf.inPerTok + outTok * modelConf.outPerTok).toFixed(6);

    // Log usage to usage_logs table
    const usagePayload = {
      user_id: user.id,
      project_id: projectContext?.id || null, // Use project ID from context if available
      model: modelConf.name,
      tokens_in: inTok,
      tokens_out: outTok,
      cost_usd: cost
    };

    console.log('🐱 Mr Wiskr usage:', usagePayload);
    const { error: usageError } = await locals.supabase.from('usage_logs').insert(usagePayload);
    
    if (usageError) {
      console.error('❌ Mr Wiskr usage log error:', usageError);
    } else {
      console.log('✅ Mr Wiskr usage logged successfully');
    }

    return json({
      response: responseContent,
      model: modelConf.name,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Mr Wiskr API error:', err);
    
    if (err.status) {
      throw err; // Re-throw SvelteKit errors
    }
    
    throw error(500, "Mr Wiskr is having an issue checking his notes right now. Please try again!");
  }
}
