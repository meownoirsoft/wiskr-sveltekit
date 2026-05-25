import { json } from '@sveltejs/kit';
import { generateWorldContext, getWorldContextReadiness } from '$lib/server/utils/worldContext.js';
import { db } from '$lib/server/db/queries.js';

export async function GET({ params, url, locals }) {
	try {
		const { projectId } = params;
		const action = url.searchParams.get('action');

		// Check authentication
		const user = locals.user;
    const userError = !user ? { message: "Unauthorized" } : null;
		if (userError || !user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}


		if (action === 'readiness') {
			const readiness = await getWorldContextReadiness(projectId, db);
			return json(readiness);
		}

		// Default: generate world context
		const context = await generateWorldContext(projectId, db);
		return json(context);
	} catch (error) {
		console.error('Error in world context API:', error);
		return json({ error: 'Failed to generate world context' }, { status: 500 });
	}
}

export async function POST({ params, locals }) {
	try {
		const { projectId } = params;

		// Check authentication
		const user = locals.user;
    const userError = !user ? { message: "Unauthorized" } : null;
		if (userError || !user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const context = await generateWorldContext(projectId, db);
		return json(context);
	} catch (error) {
		console.error('Error generating world context:', error);
		return json({ error: 'Failed to generate world context' }, { status: 500 });
	}
}
