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
 * Extract unique terms and concepts from card content to build a world glossary
 */
export async function extractGlossaryTerms(projectId, supabaseClient) {
	try {
		// Get all cards for this project
		const { data: cards, error } = await supabaseClient
			.from('cards')
			.select('title, content')
			.eq('project_id', projectId);

		if (error) throw error;

		// Combine all text content
		const allText = cards.map(card => `${card.title} ${card.content}`).join(' ');

		// Common words to ignore (basic list, could be expanded)
		const commonWords = new Set([
			'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
			'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
			'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
			'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
			'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among',
			'very', 'really', 'quite', 'just', 'only', 'also', 'even', 'still', 'yet', 'already', 'never', 'always', 'sometimes',
			'here', 'there', 'where', 'when', 'why', 'how', 'what', 'who', 'which', 'whose', 'whom'
		]);

		// Extract words (2+ characters, not common words)
		const words = allText
			.toLowerCase()
			.replace(/[^\w\s]/g, ' ')
			.split(/\s+/)
			.filter(word => word.length >= 2 && !commonWords.has(word));

		// Count word frequency
		const wordCount = {};
		words.forEach(word => {
			wordCount[word] = (wordCount[word] || 0) + 1;
		});

		// Get unique terms (appearing 2+ times or single occurrence but likely important)
		const uniqueTerms = Object.entries(wordCount)
			.filter(([word, count]) => count >= 2 || (count === 1 && word.length >= 4))
			.map(([word, count]) => ({ term: word, frequency: count }))
			.sort((a, b) => b.frequency - a.frequency)
			.slice(0, 50) // Limit to top 50 terms
			.map(item => item.term);

		return uniqueTerms;
	} catch (error) {
		console.error('Error extracting glossary terms:', error);
		return [];
	}
}

/**
 * Analyze card content to identify recurring themes and ideas
 */
export async function extractThemes(projectId, supabaseClient) {
	try {
		// Get all cards for this project
		const { data: cards, error } = await supabaseClient
			.from('cards')
			.select('title, content, tags')
			.eq('project_id', projectId);

		if (error) throw error;

		if (cards.length < 3) {
			return []; // Need at least 3 cards to identify themes
		}

		// Combine all content for analysis
		const allContent = cards.map(card => `${card.title}: ${card.content}`).join('\n');

		// Use OpenAI to analyze themes
		const openai = createOpenAIClient();
		const response = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
			messages: [
				{
					role: 'system',
					content: `Analyze the following content from a creative project and identify 5-10 recurring themes, motifs, or central ideas. Return only a JSON array of theme strings, each being a concise phrase (2-4 words). Focus on the most prominent and recurring concepts.`
				},
				{
					role: 'user',
					content: allContent
				}
			],
			temperature: 0.3,
			max_tokens: 200
		});

		const themesText = response.choices[0].message.content;
		try {
			return JSON.parse(themesText);
		} catch (parseError) {
			// Fallback: extract themes from text response
			return themesText
				.split('\n')
				.map(line => line.replace(/^[-*]\s*/, '').trim())
				.filter(line => line.length > 0)
				.slice(0, 10);
		}
	} catch (error) {
		console.error('Error extracting themes:', error);
		return [];
	}
}

/**
 * Generate world context for a project
 */
export async function generateWorldContext(projectId, supabaseClient) {
	try {
		console.log(`Generating world context for project ${projectId}`);

		// Get project description
		const { data: project, error: projectError } = await supabaseClient
			.from('projects')
			.select('description')
			.eq('id', projectId)
			.single();

		if (projectError) throw projectError;

		// Extract glossary and themes
		const [glossaryTerms, themes] = await Promise.all([
			extractGlossaryTerms(projectId, supabaseClient),
			extractThemes(projectId, supabaseClient)
		]);

		// Generate embeddings
		const [synopsisEmbedding, glossaryEmbedding] = await Promise.all([
			project.description ? generateEmbedding(project.description) : null,
			glossaryTerms.length > 0 ? generateEmbedding(glossaryTerms.join(', ')) : null
		]);

		// Update project with world context
		const { error: updateError } = await supabaseClient
			.from('projects')
			.update({
				world_glossary: glossaryTerms.join(', '),
				world_themes: themes.join(', '),
				world_synopsis_embedding: synopsisEmbedding,
				world_glossary_embedding: glossaryEmbedding
			})
			.eq('id', projectId);

		if (updateError) throw updateError;

		console.log(`World context generated for project ${projectId}:`, {
			glossaryTerms: glossaryTerms.length,
			themes: themes.length,
			hasSynopsisEmbedding: !!synopsisEmbedding,
			hasGlossaryEmbedding: !!glossaryEmbedding
		});

		return {
			glossaryTerms,
			themes,
			hasSynopsisEmbedding: !!synopsisEmbedding,
			hasGlossaryEmbedding: !!glossaryEmbedding
		};
	} catch (error) {
		console.error('Error generating world context:', error);
		throw error;
	}
}

/**
 * Check if a project has enough content for world context generation
 */
export async function getWorldContextReadiness(projectId, supabaseClient) {
	try {
		// Count cards in project
		const { count: cardCount, error } = await supabaseClient
			.from('cards')
			.select('*', { count: 'exact', head: true })
			.eq('project_id', projectId);

		if (error) throw error;

		// Check if project has description
		const { data: project, error: projectError } = await supabaseClient
			.from('projects')
			.select('description')
			.eq('id', projectId)
			.single();

		if (projectError) throw projectError;

		const hasDescription = project.description && project.description.trim().length > 0;
		const hasEnoughCards = cardCount >= 5; // Minimum cards for meaningful context

		return {
			cardCount,
			hasDescription,
			hasEnoughCards,
			isReady: hasDescription && hasEnoughCards,
			missingRequirements: {
				needsDescription: !hasDescription,
				needsMoreCards: !hasEnoughCards,
				cardsNeeded: Math.max(0, 5 - cardCount)
			}
		};
	} catch (error) {
		console.error('Error checking world context readiness:', error);
		return {
			cardCount: 0,
			hasDescription: false,
			hasEnoughCards: false,
			isReady: false,
			missingRequirements: {
				needsDescription: true,
				needsMoreCards: true,
				cardsNeeded: 5
			}
		};
	}
}
