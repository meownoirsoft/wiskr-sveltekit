import { json } from '@sveltejs/kit';
import { generateSectionContext, getSectionContextReadiness } from '$lib/server/utils/deckContext.js';
import { db } from '$lib/server/db/queries.js';

export async function GET({ params, url, locals }) {
	try {
		const { sectionId } = params;
		const action = url.searchParams.get('action');

		// Check authentication
		const user = locals.user;
    const userError = !user ? { message: "Unauthorized" } : null;
		if (userError || !user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}


		if (action === 'readiness') {
			const readiness = await getSectionContextReadiness(sectionId, db);
			return json(readiness);
		}

		// Default: generate section context
		const context = await generateSectionContext(sectionId, db);
		return json(context);
	} catch (error) {
		console.error('Error in section context API:', error);
		return json({ error: 'Failed to generate section context' }, { status: 500 });
	}
}

export async function POST({ params, locals }) {
	try {
		const { sectionId } = params;

		// Check authentication
		const user = locals.user;
    const userError = !user ? { message: "Unauthorized" } : null;
		if (userError || !user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const context = await generateSectionContext(sectionId, db);
		return json(context);
	} catch (error) {
		console.error('Error generating section context:', error);
		return json({ error: 'Failed to generate section context' }, { status: 500 });
	}
}


