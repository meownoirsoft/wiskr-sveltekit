// import { sentrySvelteKit } from "@sentry/sveltekit";
// import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
	plugins: [/* sentrySvelteKit({
        sourceMapsUploadOptions: {
            org: "meow-noir-software",
            project: "javascript-sveltekit"
        }
    }), */ sveltekit(),  visualizer({
		filename: './stats.html', // or wherever you want
		open: true,                    // auto-open in browser
		gzipSize: true,
		brotliSize: true
	  })],
	
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
		exclude: ['@supabase/auth-helpers-sveltekit'],
		// Force re-optimization on dep changes
		force: process.env.NODE_ENV === 'development'
	},
	
	server: {
		// Fixed port to always use 5173
		port: 5173,
		// Enable filesystem caching
		fs: {
			cachedChecks: true
		},
		allowedHosts: ['.localhost', '.localdomain', '::1', '127.0.0.1', '.ngrok-free.app'],
		// Enhanced HMR for better development experience
		hmr: {
			overlay: process.env.NODE_ENV === 'development',
			// Faster HMR updates
			timeout: 30000,
			// Better error handling
			clientPort: 5173
		},
		// Skip some file watching for better performance
		watch: {
			// Ignore large directories
			ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
			// Faster file watching
			usePolling: false,
			// Optimize for HMR
			interval: 100
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