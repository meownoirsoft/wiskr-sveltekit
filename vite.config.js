import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	
	// Development optimizations
	optimizeDeps: {
		// Pre-bundle heavy dependencies
		include: [
			'lucide-svelte',
			'lodash-es',
			'marked',
			'@supabase/supabase-js',
			'@floating-ui/dom',
			'luxon',
			'jszip'
		],
		// Exclude problematic dependencies that should not be pre-bundled
		exclude: ['@supabase/auth-helpers-sveltekit']
	},
	
	server: {
		// Enable filesystem caching
		fs: {
			cachedChecks: true
		}
	},
	
	build: {
		// Reduce chunk size for better caching in dev
		chunkSizeWarningLimit: 1000,
		// Use faster sourcemaps in dev (will be overridden by svelte config)
		sourcemap: process.env.NODE_ENV === 'development' ? 'cheap-source-map' : false
	},
	
	// Faster dependency resolution
	resolve: {
		dedupe: ['svelte']
	}
});
