// src/routes/api/format-content/+server.js
import { json } from '@sveltejs/kit';
import { getModelConfig } from '$lib/server/openrouter.js';

// Platform-specific formatting rules
const PLATFORM_RULES = {
  tiktok: {
    name: "TikTok",
    maxLength: 2200,
    supportsMarkdown: false,
    rules: [
      "Use catchy, trend-aware language",
      "Include relevant hashtags (#ForYou #Viral)",
      "Keep it engaging and visual",
      "Use short, punchy sentences",
      "Add emojis strategically",
      "Create hook in first 3 seconds worth of text",
      "Use plain text formatting - NO markdown syntax like **bold** or *italic*",
      "Use CAPS or emojis for emphasis instead of markdown"
    ]
  },
  instagram: {
    name: "Instagram",
    maxLength: 2200,
    supportsMarkdown: false,
    rules: [
      "Use Instagram-style hashtags",
      "Include call-to-action (like, share, comment)",
      "Format for visual storytelling",
      "Use line breaks for readability",
      "Add relevant emojis",
      "Optimize for engagement",
      "Use plain text formatting - NO markdown syntax like **bold** or *italic*",
      "Use CAPS or emojis for emphasis instead of markdown"
    ]
  },
  youtube: {
    name: "YouTube",
    maxLength: 5000,
    supportsMarkdown: false,
    rules: [
      "Create compelling title and description",
      "Include keywords for SEO",
      "Add timestamps if applicable",
      "Include subscribe call-to-action",
      "Use YouTube-specific formatting",
      "Optimize for search discovery",
      "Use plain text formatting - NO markdown syntax like **bold** or *italic*",
      "Use CAPS or line breaks for emphasis"
    ]
  },
  etsy: {
    name: "Etsy",
    maxLength: 1000,
    supportsMarkdown: false,
    rules: [
      "Focus on product benefits",
      "Use seller-friendly language",
      "Include materials and dimensions",
      "Add care instructions if relevant",
      "Use Etsy SEO keywords",
      "Create compelling product story",
      "Use plain text formatting - NO markdown syntax like **bold** or *italic*",
      "Use CAPS or bullet points for emphasis"
    ]
  },
  twitter: {
    name: "X/Twitter",
    maxLength: 280,
    supportsMarkdown: false,
    rules: [
      "Stay under 280 characters",
      "Use relevant hashtags sparingly",
      "Make it tweetable and shareable",
      "Include call-to-action",
      "Use thread format if content is long",
      "Use plain text formatting - NO markdown syntax like **bold** or *italic*",
      "Use CAPS or emojis for emphasis instead of markdown"
    ]
  },
  linkedin: {
    name: "LinkedIn",
    maxLength: 3000,
    supportsMarkdown: true,
    rules: [
      "Use professional tone",
      "Add industry insights",
      "Include relevant professional hashtags",
      "Format for business audience",
      "Add call-to-action for networking",
      "Structure for professional engagement",
      "LinkedIn supports some formatting - you can use **bold** and *italic* sparingly",
      "Use bullet points and line breaks for readability"
    ]
  },
  teepublic: {
    name: "TeePublic",
    maxLength: 500,
    supportsMarkdown: false,
    rules: [
      "Focus on design concept",
      "Use product-focused language",
      "Include style and fit information",
      "Add relevant design tags",
      "Create compelling product description",
      "Optimize for t-shirt buyers",
      "Use plain text formatting - NO markdown syntax like **bold** or *italic*",
      "Use CAPS for key product features"
    ]
  },
  pinterest: {
    name: "Pinterest",
    maxLength: 500,
    supportsMarkdown: false,
    rules: [
      "Create pin-worthy descriptions",
      "Use Pinterest SEO keywords",
      "Include seasonal/trending terms",
      "Format for visual discovery",
      "Add relevant board categories",
      "Optimize for saving and sharing",
      "Use plain text formatting - NO markdown syntax like **bold** or *italic*",
      "Use CAPS or emojis for emphasis"
    ]
  },
  facebook: {
    name: "Facebook",
    maxLength: 8000,
    supportsMarkdown: false,
    rules: [
      "Use conversational, friendly tone",
      "Include engaging questions to encourage comments",
      "Add relevant hashtags (sparingly - 2-5 max)",
      "Use line breaks for readability",
      "Include call-to-action for shares/likes",
      "Optimize for Facebook's audience (broader demographics)",
      "Use plain text formatting - NO markdown syntax like **bold** or *italic*",
      "Use emojis strategically but don't overdo it",
      "Focus on community engagement and discussion"
    ]
  },
  reddit: {
    name: "Reddit",
    maxLength: 40000,
    supportsMarkdown: true,
    rules: [
      "Follow Reddit etiquette and community guidelines",
      "Be authentic and avoid overly promotional language",
      "Use markdown formatting: **bold**, *italic*, `code`, > quotes",
      "Structure with proper headings (# ## ###) if long-form",
      "Include relevant context and background",
      "Add edit notes if making changes",
      "Use bullet points and numbered lists for clarity",
      "Engage genuinely with the community",
      "Avoid excessive self-promotion"
    ]
  },
  plaintext: {
    name: "Plain Text",
    maxLength: 2000,
    supportsMarkdown: false,
    rules: [
      "Clean, readable plain text format",
      "Use line breaks for paragraph separation",
      "Use CAPS for emphasis instead of formatting",
      "Organize with bullet points using - or *",
      "Keep it simple and universal",
      "No special formatting or markdown syntax",
      "Focus on clarity and readability",
      "Works well for copy-pasting anywhere"
    ]
  },
  markdown: {
    name: "Markdown",
    maxLength: 5000,
    supportsMarkdown: true,
    rules: [
      "Use proper markdown formatting: **bold**, *italic*, `code`",
      "Structure with headers: # ## ### for hierarchy",
      "Use bullet points with - or * and numbered lists",
      "Include > blockquotes for emphasis",
      "Use ```code blocks``` for technical content",
      "Add [links](url) where relevant",
      "Keep formatting clean and readable",
      "Perfect for documentation, GitHub, Discord, etc."
    ]
  }
};

export async function POST({ request }) {
  try {
    const { content, platform } = await request.json();
    
    if (!content || !platform) {
      return json({ error: 'Content and platform are required' }, { status: 400 });
    }
    
    const platformConfig = PLATFORM_RULES[platform];
    if (!platformConfig) {
      return json({ error: 'Unsupported platform' }, { status: 400 });
    }
    
    // Get OpenRouter client - use micro model for formatting (cheapest)
    const { config: modelConf, client: openai } = getModelConfig('micro');
    
    const systemPrompt = `You are a social media content formatter specializing in ${platformConfig.name}. 

Your task is to reformat the given content to be optimized for ${platformConfig.name} while maintaining the core message and value.

Platform-specific rules for ${platformConfig.name}:
${platformConfig.rules.map(rule => `- ${rule}`).join('\n')}

Character/length limit: ${platformConfig.maxLength} characters maximum.

Important guidelines:
- Preserve the core information and value of the original content
- Adapt the tone and style to fit the platform's audience
- Add platform-appropriate formatting, hashtags, and calls-to-action
- Keep it authentic and engaging
- If content is too long, prioritize the most important points
- Use emojis strategically but don't overdo it

Format the content to be ready to post on ${platformConfig.name}.`;

    const completion = await openai.chat.completions.create({
      model: modelConf.name,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Please format this content for ${platformConfig.name}:\n\n${content}` }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });

    const formatted = completion.choices[0]?.message?.content?.trim() || '';
    
    // Check if formatted content exceeds platform limits
    if (formatted.length > platformConfig.maxLength) {
      // Try to get a shorter version
      const shortenCompletion = await openai.chat.completions.create({
        model: modelConf.name,
        messages: [
          { role: 'system', content: systemPrompt + `\n\nIMPORTANT: The content MUST be under ${platformConfig.maxLength} characters. The previous attempt was too long.` },
          { role: 'user', content: `Please format this content for ${platformConfig.name}, keeping it under ${platformConfig.maxLength} characters:\n\n${content}` }
        ],
        max_tokens: 800,
        temperature: 0.7
      });
      
      const shorterFormatted = shortenCompletion.choices[0]?.message?.content?.trim() || '';
      return json({ formatted: shorterFormatted });
    }
    
    return json({ formatted });
    
  } catch (error) {
    console.error('Format content error:', error);
    return json({ error: 'Failed to format content' }, { status: 500 });
  }
}
