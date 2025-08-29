// src/routes/api/sayless/+server.js
import { json } from '@sveltejs/kit';
import { getModelConfig } from '$lib/server/openrouter.js';

export async function POST({ request }) {
  try {
    const { text, projectContext, fieldType } = await request.json();

    if (!text || !text.trim()) {
      return json({ error: 'No text provided' }, { status: 400 });
    }

    // Get the speed model for summarization (fast and cost-effective)
    const { config, client } = getModelConfig('speed');

    // Build context-aware prompt
    let systemPrompt = `You are a professional editor specializing in concise, impactful writing. Your task is to create a SayLess version that:

1. Preserves ALL key information and meaning from the original text
2. Removes unnecessary words, redundancies, and fluff
3. Uses clear, direct language
4. Maintains any important formatting (lists, structure) when possible
5. Makes the content more actionable and focused

Guidelines:
- Keep essential details, remove verbose explanations
- Use active voice over passive voice
- Replace wordy phrases with concise alternatives
- Maintain the original tone and intent
- If the original is already concise, make minimal changes

CRITICAL RULES:
- Your output must ONLY contain the concise version of the input text
- Do NOT add any context information, project details, explanations, or external information
- Do NOT reference or mention the project context in your response
- The context is provided solely to help you interpret ambiguous terms or references in the input text
- If context helps clarify meaning, use that understanding to create a better summary, but do not include the context itself

Your response should contain nothing except the shortened version of the provided text.`;

    // Add context-specific instructions for interpretation only
    if (projectContext) {
      systemPrompt += `\n\nProject Context (REFERENCE ONLY for interpreting the input text - NEVER include any of this context information in your output):\nProject: "${projectContext.name}"\nDescription: ${projectContext.description || 'No description provided'}\n\nUse this context ONLY if needed to understand unclear references, technical terms, or ambiguous phrases in the input text. The context should help you interpret meaning but must never appear in your response.`;
    }

    switch (fieldType) {
      case 'project-description':
        systemPrompt += `\n\nThis is a project description. Focus on the core objectives, key goals, and essential requirements. Remove marketing language and keep it practical.`;
        break;
      case 'fact':
        systemPrompt += `\n\nThis is a project fact/knowledge item. Keep it informative but concise. Focus on the key information that will be most useful for AI assistance.`;
        break;
      case 'doc':
        systemPrompt += `\n\nThis is a project document/resource. Summarize the main points while keeping enough detail to be useful for reference.`;
        break;
      case 'ask-prompt':
        systemPrompt += `\n\nThis is a question/prompt for an AI. Make it clear and direct while preserving all necessary context and specificity.`;
        break;
      default:
        systemPrompt += `\n\nThis is general text content. Make it more concise while preserving meaning and clarity.`;
    }

    const userPrompt = `Please create a SayLess version of the following text:

${text}`;

    // Call the AI service
    const completion = await client.chat.completions.create({
      model: config.name,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3, // Lower temperature for more consistent, focused output
      max_tokens: Math.min(Math.ceil(text.length * 0.8), 1000) // Reasonable limit based on input
    });

    const saylessText = completion.choices[0]?.message?.content?.trim();

    if (!saylessText) {
      return json({ error: 'Failed to generate SayLess' }, { status: 500 });
    }

    // Basic validation - ensure we actually made it more concise
    const originalLength = text.length;
    const saylessLength = saylessText.length;
    const reductionPercentage = ((originalLength - saylessLength) / originalLength) * 100;

    return json({
      sayless: saylessText,
      stats: {
        originalLength,
        saylessLength,
        reductionPercentage: Math.round(reductionPercentage),
        tokensUsed: completion.usage?.total_tokens || 0
      }
    });

  } catch (error) {
    console.error('SayLess API error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
