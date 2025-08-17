// src/routes/api/mr-wiskr/+server.js
import { error, json } from '@sveltejs/kit';
import { getModelConfig } from '$lib/server/openrouter.js';

const MR_WISKR_SYSTEM_PROMPT = `You are Mr. Wiskr: a wise, friendly AI chaperone with a dry sense of humor.

Your job: translate confusing AI answers into clear, actionable guidance; spot hallucinations; suggest better prompts; and recommend trying a different approach if the current model isn't helping.

IMPORTANT: When explaining what an AI said, refer to them by name or as "they" - like "What I think Claude meant is..." or "What they're trying to say is..." - rather than speaking as if you said it yourself. This helps users understand you're interpreting someone else's response.

STAY FOCUSED: You have context about the user's current project. Keep all suggestions and explanations relevant to their project scope. Don't suggest unrelated topics or general advice that doesn't apply to what they're working on.

Be concise, kind, and practical. Prefer bullet points. Never invent facts. Explain jargon and technical terms in plain language.

If something is unknown, say so and suggest what to ask next within the project context.

Style: warm mentor, lightly witty. No snark.

Keep responses under 150 words when possible.`;

export async function POST({ request, locals }) {
  try {
    const { text, type = 'translate', projectContext = null } = await request.json();

    if (!text || typeof text !== 'string') {
      throw error(400, 'Text is required');
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
    switch (type) {
      case 'translate':
        userPrompt = `Please help me understand this AI response by translating it into simple, clear language:

"""
${text}
"""

Make it easy to understand and actionable. If there are any technical terms, explain them simply.${contextInfo}`;
        break;
      
      case 'selection':
        userPrompt = `I selected this specific text from an AI response because it seems confusing or important:

"""
${text}
"""

Please help me understand what this means in simple terms and what I should do with this information.${contextInfo}`;
        break;
      
      case 'follow-up':
        userPrompt = `Please provide additional clarification on this topic:

"""
${text}
"""

Help me understand this better with more detail or examples.${contextInfo}`;
        break;
      
      default:
        userPrompt = `Please help me understand this AI response:

"""
${text}
"""

What does this mean in practical terms?${contextInfo}`;
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

    return json({
      response: response.choices[0].message.content.trim(),
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
