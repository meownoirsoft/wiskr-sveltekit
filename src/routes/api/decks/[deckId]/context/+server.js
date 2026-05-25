import { json } from '@sveltejs/kit';
import { generateDeckContext, getDeckContextReadiness } from '$lib/server/utils/deckContext.js';
import { db } from '$lib/server/db/queries.js';

export async function GET({ params, url, locals }) {
	try {
		const { deckId } = params;
		const action = url.searchParams.get('action');

		// Check authentication
		const user = locals.user;
    const userError = !user ? { message: "Unauthorized" } : null;
		if (userError || !user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}


		if (action === 'readiness') {
			const readiness = await getDeckContextReadiness(deckId, db);
			return json(readiness);
		}

		// Default: generate deck context
		const context = await generateDeckContext(deckId, db);
		return json(context);
	} catch (error) {
		console.error('Error in deck context API:', error);
		return json({ error: 'Failed to generate deck context' }, { status: 500 });
	}
}

export async function POST({ params, locals }) {
	try {
		const { deckId } = params;

		// Check authentication
		const user = locals.user;
    const userError = !user ? { message: "Unauthorized" } : null;
		if (userError || !user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const context = await generateDeckContext(deckId, db);
		return json(context);
	} catch (error) {
		console.error('Error generating deck context:', error);
		return json({ error: 'Failed to generate deck context' }, { status: 500 });
	}
}


