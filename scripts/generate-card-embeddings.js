#!/usr/bin/env node

/**
 * Script to generate embeddings for existing cards that don't have them
 * Run with: node scripts/generate-card-embeddings.js
 */

import { createClient } from '@supabase/supabase-js';
import { createOpenAIClient } from '../src/lib/server/openrouter.js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateCardEmbedding(title, content) {
  if (!title && !content) {
    return null;
  }

  try {
    const openai = createOpenAIClient();
    const textToEmbed = `${title || ''}\n\n${content || ''}`.trim().slice(0, 4000);
    
    const emb = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: textToEmbed
    });
    
    return emb.data[0]?.embedding || null;
  } catch (error) {
    console.error('Embedding generation error:', error?.message || error);
    return null;
  }
}

async function main() {
  console.log('🔍 Finding cards without embeddings...');
  
  // Get all cards that don't have embeddings
  const { data: cards, error } = await supabase
    .from('cards')
    .select('id, title, content, project_id')
    .is('embedding', null)
    .not('content', 'is', null)
    .not('title', 'is', null);

  if (error) {
    console.error('Error fetching cards:', error);
    process.exit(1);
  }

  if (!cards || cards.length === 0) {
    console.log('✅ All cards already have embeddings!');
    return;
  }

  console.log(`📝 Found ${cards.length} cards without embeddings`);

  let processed = 0;
  let errors = 0;

  for (const card of cards) {
    try {
      console.log(`Processing card: ${card.title} (${card.id})`);
      
      const embedding = await generateCardEmbedding(card.title, card.content);
      
      if (embedding) {
        const { error: updateError } = await supabase
          .from('cards')
          .update({ embedding })
          .eq('id', card.id);
        
        if (updateError) {
          console.error(`❌ Error updating card ${card.id}:`, updateError);
          errors++;
        } else {
          console.log(`✅ Generated embedding for: ${card.title}`);
          processed++;
        }
      } else {
        console.log(`⚠️  Could not generate embedding for: ${card.title}`);
        errors++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Error processing card ${card.id}:`, error);
      errors++;
    }
  }

  console.log(`\n🎉 Completed! Processed: ${processed}, Errors: ${errors}`);
}

main().catch(console.error);
