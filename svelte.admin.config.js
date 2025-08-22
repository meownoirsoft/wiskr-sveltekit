import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),
		
		// Admin-specific configuration
		appDir: '.svelte-kit-admin',
		
		// Only include admin routes
		routes: (filepath) => {
			// Include admin routes, shared API routes, and auth routes
			return filepath.includes('/admin/') || 
			       filepath.includes('/api/') || 
			       filepath.includes('/login/') ||
			       filepath.includes('/debug-context/') ||
			       filepath === 'src/routes/+layout.svelte' ||
			       filepath === 'src/routes/+layout.server.js' ||
			       filepath === 'src/routes/+error.svelte';
		},
		
		// Environment variables
		env: {
			publicPrefix: 'PUBLIC_ADMIN_'
		}
	}
};

export default config;
