import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-auto';

const isDev = process.env.NODE_ENV === 'development';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		// Prerender only essential pages in dev for faster startup
		prerender: {
			entries: isDev ? [] : ['*']
		},
		// Faster builds in dev
		files: {
			// Use faster file system operations
		}
	},
	preprocess: [mdsvex()],
	extensions: ['.svelte', '.svx'],
	compilerOptions: {
		// More aggressive optimizations in dev
		dev: isDev,
		// Disable sourcemaps for faster compilation (enable when debugging)
		sourcemap: false,
		// Faster compilation with reduced CSS generation
		css: 'injected',
		// Faster hydration
		hydratable: true,
		// Skip some runtime checks in dev for speed
		accessors: false
	},
	vitePlugin: {
		// Faster inspector and HMR
		inspector: isDev ? {
			toggleVisibilityKey: 'meta-shift',
			showToggleButton: 'never'
		} : false,
		// Skip some expensive checks in dev
		hot: isDev ? {
			partialAccept: true
		} : true
	}
};

export default config;
