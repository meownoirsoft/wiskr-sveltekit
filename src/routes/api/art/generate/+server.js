import { json } from '@sveltejs/kit';
import { OPENAI_API_KEY, BUNNY_STORAGE_ZONE, BUNNY_PASSWORD, BUNNY_PULL_ZONE } from '$env/static/private';

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

    const prompt = `Create MTG-style fantasy card art illustration for a creative idea card:

Title: ${cardTitle}
Content: ${cardContent}
Tags: ${cardTags?.join(', ') || 'none'}
Rarity: ${rarity} (${rarityPrompt})

CRITICAL STYLE REQUIREMENTS:
- Magic: The Gathering card art style - epic fantasy illustration
- 16:10 aspect ratio (landscape orientation)
- NO text, words, letters, or written content anywhere in the image
- NO card borders, frames, or UI elements
- NO card game symbols, mana symbols, or game elements
- High contrast, vibrant colors with dramatic lighting
- Professional fantasy art quality
- Focus on the main subject/creature/concept, not card design elements
- Epic, cinematic composition suitable for a collectible card
- Match the ${rarity} rarity level with appropriate visual complexity and grandeur

The art should be a pure illustration that represents the concept described in the card content, designed to fit within a card frame but without any card design elements visible.`;

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
    const dallEUrl = data.data[0].url;
    
    console.log('🔍 DALL-E generated image URL:', dallEUrl);
    
    // Download the DALL-E image and upload to BunnyCDN for permanent storage
    try {
      const imageResponse = await fetch(dallEUrl);
      if (!imageResponse.ok) {
        throw new Error('Failed to download DALL-E image');
      }
      
      const imageBlob = await imageResponse.blob();
      console.log('🔍 Downloaded DALL-E image, size:', imageBlob.size, 'type:', imageBlob.type);
      
      // Generate filename for BunnyCDN
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const filename = `ai-art-${timestamp}-${randomId}.jpg`;
      
      // Upload to BunnyCDN
      const bunnyUrl = await uploadToBunnyCDN(imageBlob, filename);
      console.log('🔍 Uploaded to BunnyCDN:', bunnyUrl);
      
      return json({ 
        artUrl: bunnyUrl,
        originalDallEUrl: dallEUrl,
        prompt: prompt,
        model: 'DALL-E 3',
        success: true 
      });
      
    } catch (uploadError) {
      console.error('❌ Failed to upload DALL-E image to BunnyCDN:', uploadError);
      // Fallback to original DALL-E URL if BunnyCDN upload fails
      return json({ 
        artUrl: dallEUrl,
        prompt: prompt,
        model: 'DALL-E 3',
        success: true,
        warning: 'Using temporary DALL-E URL - BunnyCDN upload failed'
      });
    }

  } catch (error) {
    console.error('Art generation error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function uploadToBunnyCDN(blob, filename) {
  const uploadUrl = `https://la.storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${filename}`;
  
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'AccessKey': BUNNY_PASSWORD,
      'Content-Type': 'image/jpeg'
    },
    body: blob
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`BunnyCDN upload failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  // Return the CDN URL
  if (BUNNY_PULL_ZONE.startsWith('http')) {
    return `${BUNNY_PULL_ZONE}/${filename}`;
  } else {
    return `https://${BUNNY_PULL_ZONE}.b-cdn.net/${filename}`;
  }
}
