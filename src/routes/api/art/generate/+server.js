import { json } from '@sveltejs/kit';
import { OPENAI_API_KEY } from '$env/static/private';

export async function POST({ request }) {
  try {
    const { cardTitle, cardContent, cardTags, rarity } = await request.json();

    if (!OPENAI_API_KEY) {
      return json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Create a detailed prompt based on card content and rarity
    const rarityPrompts = {
      common: 'simple, everyday, practical, straightforward',
      special: 'unique, interesting, creative, distinctive',
      rare: 'exceptional, remarkable, sophisticated, valuable',
      legendary: 'extraordinary, mythical, legendary, transformative'
    };

    const rarityPrompt = rarityPrompts[rarity] || rarityPrompts.common;

    const prompt = `Create a card art illustration for a creative idea card with the following details:

Title: ${cardTitle}
Content: ${cardContent}
Tags: ${cardTags?.join(', ') || 'none'}
Rarity: ${rarity} (${rarityPrompt})

Style requirements:
- Card art style, suitable for a creative idea card
- 16:10 aspect ratio (landscape)
- High contrast, vibrant colors
- Clean, professional illustration
- Avoid text or words in the image
- Match the ${rarity} rarity level with appropriate visual complexity and grandeur

The art should visually represent the concept described in the card content while feeling appropriate for a ${rarity} rarity card.`;

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        style: 'natural'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      return json({ error: 'Failed to generate art' }, { status: 500 });
    }

    const data = await response.json();
    const artUrl = data.data[0].url;

    return json({ 
      artUrl,
      prompt: prompt,
      success: true 
    });

  } catch (error) {
    console.error('Art generation error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
