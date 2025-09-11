import { createClient } from '@supabase/supabase-js';
import { createOpenAIClient } from '../openrouter.js';
import { generateEmbedding } from './embeddings.js';

// Create a server-side Supabase client with service role key for admin operations
const createServerSupabaseClient = () => {
	return createClient(
		process.env.SUPABASE_URL,
		process.env.SUPABASE_SERVICE_ROLE_KEY
	);
};

/**
 * Extract tags from deck/section content
 */
export async function extractTags(content, type = 'deck') {
	try {
		if (!content || content.trim().length === 0) {
			return [];
		}

		// Use OpenAI to extract relevant tags
		const openai = createOpenAIClient();
		const response = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
			messages: [
				{
					role: 'system',
					content: `Extract 3-8 relevant topic tags from the following ${type} content. Return only a JSON array of tag strings, each being 1-3 words. Focus on the main themes, concepts, and topics.`
				},
				{
					role: 'user',
					content: content
				}
			],
			temperature: 0.3,
			max_tokens: 100
		});

		const tagsText = response.choices[0].message.content;
		try {
			return JSON.parse(tagsText);
		} catch (parseError) {
			// Fallback: extract tags from text response
			return tagsText
				.split('\n')
				.map(line => line.replace(/^[-*]\s*/, '').trim())
				.filter(line => line.length > 0)
				.slice(0, 8);
		}
	} catch (error) {
		console.error('Error extracting tags:', error);
		return [];
	}
}

/**
 * Extract named entities from deck/section content
 */
export async function extractEntities(content, type = 'deck') {
	try {
		if (!content || content.trim().length === 0) {
			return [];
		}

		// Use OpenAI for NER extraction
		const openai = createOpenAIClient();
		const response = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
			messages: [
				{
					role: 'system',
					content: `Extract named entities (people, places, organizations, concepts, etc.) from the following ${type} content. Return only a JSON array of entity strings. Focus on important names, locations, and concepts that would be useful for context.`
				},
				{
					role: 'user',
					content: content
				}
			],
			temperature: 0.3,
			max_tokens: 150
		});

		const entitiesText = response.choices[0].message.content;
		try {
			return JSON.parse(entitiesText);
		} catch (parseError) {
			// Fallback: extract entities from text response
			return entitiesText
				.split('\n')
				.map(line => line.replace(/^[-*]\s*/, '').trim())
				.filter(line => line.length > 0)
				.slice(0, 15);
		}
	} catch (error) {
		console.error('Error extracting entities:', error);
		return [];
	}
}

/**
 * Extract mechanics from deck/section content
 */
export async function extractMechanics(content, type = 'deck') {
	try {
		if (!content || content.trim().length === 0) {
			return [];
		}

		// Use OpenAI to identify game/system mechanics
		const openai = createOpenAIClient();
		const response = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
			messages: [
				{
					role: 'system',
					content: `Identify game mechanics, system mechanics, or procedural elements from the following ${type} content. Return only a JSON array of mechanic strings. Focus on rules, systems, processes, or interactive elements.`
				},
				{
					role: 'user',
					content: content
				}
			],
			temperature: 0.3,
			max_tokens: 100
		});

		const mechanicsText = response.choices[0].message.content;
		try {
			return JSON.parse(mechanicsText);
		} catch (parseError) {
			// Fallback: extract mechanics from text response
			return mechanicsText
				.split('\n')
				.map(line => line.replace(/^[-*]\s*/, '').trim())
				.filter(line => line.length > 0)
				.slice(0, 10);
		}
	} catch (error) {
		console.error('Error extracting mechanics:', error);
		return [];
	}
}

/**
 * Generate summary for deck/section content
 */
export async function generateSummary(content, type = 'deck') {
	try {
		if (!content || content.trim().length === 0) {
			return '';
		}

		// Use OpenAI to generate a 150-300 token summary
		const openai = createOpenAIClient();
		const response = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
			messages: [
				{
					role: 'system',
					content: `Generate a concise summary (150-300 tokens) of the following ${type} content. Focus on the main themes, key elements, and overall purpose. Make it informative and useful for understanding the content at a glance.`
				},
				{
					role: 'user',
					content: content
				}
			],
			temperature: 0.3,
			max_tokens: 300
		});

		return response.choices[0].message.content.trim();
	} catch (error) {
		console.error('Error generating summary:', error);
		return '';
	}
}

/**
 * Generate context for a deck
 */
export async function generateDeckContext(deckId, supabaseClient) {
	try {
		console.log(`Generating context for deck ${deckId}`);

		// Get deck with all its sections and cards
		const { data: deck, error: deckError } = await supabaseClient
			.from('decks')
			.select(`
				id,
				name,
				description,
				deck_sections (
					id,
					name,
					deck_cards (
						cards (
							title,
							content,
							tags
						)
					)
				)
			`)
			.eq('id', deckId)
			.single();

		if (deckError) throw deckError;

		// Combine all content from deck and its sections
		let allContent = '';
		if (deck.description) {
			allContent += `Deck: ${deck.name}\nDescription: ${deck.description}\n\n`;
		}

		// Add section content
		deck.deck_sections.forEach(section => {
			allContent += `Section: ${section.name}\n`;
			section.deck_cards.forEach(deckCard => {
				const card = deckCard.cards;
				allContent += `- ${card.title}: ${card.content}\n`;
				if (card.tags && card.tags.length > 0) {
					allContent += `  Tags: ${card.tags.join(', ')}\n`;
				}
			});
			allContent += '\n';
		});

		if (allContent.trim().length === 0) {
			console.log(`No content found for deck ${deckId}`);
			return { success: false, reason: 'No content' };
		}

		// Generate all context elements in parallel
		const [summary, tags, entities, mechanics] = await Promise.all([
			generateSummary(allContent, 'deck'),
			extractTags(allContent, 'deck'),
			extractEntities(allContent, 'deck'),
			extractMechanics(allContent, 'deck')
		]);

		// Generate embedding for summary + tags
		const contextText = `${summary}\n\nTags: ${tags.join(', ')}`;
		const embedding = await generateEmbedding(contextText);

		// Update deck with context
		const { error: updateError } = await supabaseClient
			.from('decks')
			.update({
				summary,
				tags,
				entities,
				mechanics,
				context_embedding: embedding
			})
			.eq('id', deckId);

		if (updateError) throw updateError;

		console.log(`Deck context generated for ${deckId}:`, {
			summary: summary.length,
			tags: tags.length,
			entities: entities.length,
			mechanics: mechanics.length,
			hasEmbedding: !!embedding
		});

		return {
			success: true,
			summary,
			tags,
			entities,
			mechanics,
			hasEmbedding: !!embedding
		};
	} catch (error) {
		console.error('Error generating deck context:', error);
		throw error;
	}
}

/**
 * Generate context for a deck section
 */
export async function generateSectionContext(sectionId, supabaseClient) {
	try {
		console.log(`Generating context for section ${sectionId}`);

		// Get section with its cards
		const { data: section, error: sectionError } = await supabaseClient
			.from('deck_sections')
			.select(`
				id,
				name,
				deck_cards (
					cards (
						title,
						content,
						tags
					)
				)
			`)
			.eq('id', sectionId)
			.single();

		if (sectionError) throw sectionError;

		// Combine all content from section
		let allContent = `Section: ${section.name}\n\n`;
		section.deck_cards.forEach(deckCard => {
			const card = deckCard.cards;
			allContent += `- ${card.title}: ${card.content}\n`;
			if (card.tags && card.tags.length > 0) {
				allContent += `  Tags: ${card.tags.join(', ')}\n`;
			}
		});

		if (allContent.trim().length === 0) {
			console.log(`No content found for section ${sectionId}`);
			return { success: false, reason: 'No content' };
		}

		// Generate all context elements in parallel
		const [summary, tags, entities, mechanics] = await Promise.all([
			generateSummary(allContent, 'section'),
			extractTags(allContent, 'section'),
			extractEntities(allContent, 'section'),
			extractMechanics(allContent, 'section')
		]);

		// Generate embedding for summary + tags
		const contextText = `${summary}\n\nTags: ${tags.join(', ')}`;
		const embedding = await generateEmbedding(contextText);

		// Update section with context
		const { error: updateError } = await supabaseClient
			.from('deck_sections')
			.update({
				summary,
				tags,
				entities,
				mechanics,
				context_embedding: embedding
			})
			.eq('id', sectionId);

		if (updateError) throw updateError;

		console.log(`Section context generated for ${sectionId}:`, {
			summary: summary.length,
			tags: tags.length,
			entities: entities.length,
			mechanics: mechanics.length,
			hasEmbedding: !!embedding
		});

		return {
			success: true,
			summary,
			tags,
			entities,
			mechanics,
			hasEmbedding: !!embedding
		};
	} catch (error) {
		console.error('Error generating section context:', error);
		throw error;
	}
}

/**
 * Check if a deck has enough content for context generation
 */
export async function getDeckContextReadiness(deckId, supabaseClient) {
	try {
		// Count cards in deck
		const { count: cardCount, error } = await supabaseClient
			.from('deck_cards')
			.select('*', { count: 'exact', head: true })
			.eq('deck_id', deckId);

		if (error) throw error;

		// Check if deck has description
		const { data: deck, error: deckError } = await supabaseClient
			.from('decks')
			.select('description')
			.eq('id', deckId)
			.single();

		if (deckError) throw deckError;

		const hasDescription = deck.description && deck.description.trim().length > 0;
		const hasEnoughCards = cardCount >= 3; // Minimum cards for meaningful context

		return {
			cardCount,
			hasDescription,
			hasEnoughCards,
			isReady: hasDescription && hasEnoughCards,
			missingRequirements: {
				needsDescription: !hasDescription,
				needsMoreCards: !hasEnoughCards,
				cardsNeeded: Math.max(0, 3 - cardCount)
			}
		};
	} catch (error) {
		console.error('Error checking deck context readiness:', error);
		return {
			cardCount: 0,
			hasDescription: false,
			hasEnoughCards: false,
			isReady: false,
			missingRequirements: {
				needsDescription: true,
				needsMoreCards: true,
				cardsNeeded: 3
			}
		};
	}
}

/**
 * Check if a section has enough content for context generation
 */
export async function getSectionContextReadiness(sectionId, supabaseClient) {
	try {
		// Count cards in section
		const { count: cardCount, error } = await supabaseClient
			.from('deck_cards')
			.select('*', { count: 'exact', head: true })
			.eq('section_id', sectionId);

		if (error) throw error;

		const hasEnoughCards = cardCount >= 2; // Minimum cards for meaningful context

		return {
			cardCount,
			hasEnoughCards,
			isReady: hasEnoughCards,
			missingRequirements: {
				needsMoreCards: !hasEnoughCards,
				cardsNeeded: Math.max(0, 2 - cardCount)
			}
		};
	} catch (error) {
		console.error('Error checking section context readiness:', error);
		return {
			cardCount: 0,
			hasEnoughCards: false,
			isReady: false,
			missingRequirements: {
				needsMoreCards: true,
				cardsNeeded: 2
			}
		};
	}
}


