import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 5174, // Different port for admin
		host: '0.0.0.0' // Allow external connections
	},
	preview: {
		port: 5175 // Different preview port
	},
	define: {
		'process.env.ADMIN_MODE': true // Environment flag to identify admin mode
	}
});
