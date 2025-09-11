import { json } from '@sveltejs/kit';
import { generateWorldContext, getWorldContextReadiness } from '$lib/server/utils/worldContext.js';
import { supabaseAdmin } from '$lib/server/supabaseAdmin.js';

export async function GET({ params, url, locals }) {
	try {
		const { projectId } = params;
		const action = url.searchParams.get('action');

		// Check authentication
		const { data: { user }, error: userError } = await locals.supabase.auth.getUser();
		if (userError || !user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const serverSupabase = supabaseAdmin();

		if (action === 'readiness') {
			const readiness = await getWorldContextReadiness(projectId, serverSupabase);
			return json(readiness);
		}

		// Default: generate world context
		const context = await generateWorldContext(projectId, serverSupabase);
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
		const { data: { user }, error: userError } = await locals.supabase.auth.getUser();
		if (userError || !user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const serverSupabase = supabaseAdmin();
		const context = await generateWorldContext(projectId, serverSupabase);
		return json(context);
	} catch (error) {
		console.error('Error generating world context:', error);
		return json({ error: 'Failed to generate world context' }, { status: 500 });
	}
}
