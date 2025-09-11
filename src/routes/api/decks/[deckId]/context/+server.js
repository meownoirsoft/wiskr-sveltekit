import { json } from '@sveltejs/kit';
import { generateDeckContext, getDeckContextReadiness } from '$lib/server/utils/deckContext.js';
import { supabaseAdmin } from '$lib/server/supabaseAdmin.js';

export async function GET({ params, url, locals }) {
	try {
		const { deckId } = params;
		const action = url.searchParams.get('action');

		// Check authentication
		const { data: { user }, error: userError } = await locals.supabase.auth.getUser();
		if (userError || !user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const serverSupabase = supabaseAdmin();

		if (action === 'readiness') {
			const readiness = await getDeckContextReadiness(deckId, serverSupabase);
			return json(readiness);
		}

		// Default: generate deck context
		const context = await generateDeckContext(deckId, serverSupabase);
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
		const { data: { user }, error: userError } = await locals.supabase.auth.getUser();
		if (userError || !user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const serverSupabase = supabaseAdmin();
		const context = await generateDeckContext(deckId, serverSupabase);
		return json(context);
	} catch (error) {
		console.error('Error generating deck context:', error);
		return json({ error: 'Failed to generate deck context' }, { status: 500 });
	}
}


