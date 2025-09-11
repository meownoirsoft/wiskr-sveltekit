import { json } from '@sveltejs/kit';
import { generateSectionContext, getSectionContextReadiness } from '$lib/server/utils/deckContext.js';
import { supabaseAdmin } from '$lib/server/supabaseAdmin.js';

export async function GET({ params, url, locals }) {
	try {
		const { sectionId } = params;
		const action = url.searchParams.get('action');

		// Check authentication
		const { data: { user }, error: userError } = await locals.supabase.auth.getUser();
		if (userError || !user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const serverSupabase = supabaseAdmin();

		if (action === 'readiness') {
			const readiness = await getSectionContextReadiness(sectionId, serverSupabase);
			return json(readiness);
		}

		// Default: generate section context
		const context = await generateSectionContext(sectionId, serverSupabase);
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
		const { data: { user }, error: userError } = await locals.supabase.auth.getUser();
		if (userError || !user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const serverSupabase = supabaseAdmin();
		const context = await generateSectionContext(sectionId, serverSupabase);
		return json(context);
	} catch (error) {
		console.error('Error generating section context:', error);
		return json({ error: 'Failed to generate section context' }, { status: 500 });
	}
}


