// svelte.config.js
import adapter from '@sveltejs/adapter-node';

const isDev = process.env.NODE_ENV === 'development';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      precompress: true, // gzip/brotli for static assets
      out: 'build'       // Railway will run "node build"
    }),
    // If you rely on SSR, do NOT prerender everything.
    // Remove your previous prerender override unless you truly want a static export.
    // prerender: { entries: isDev ? [] : ['*'] }
  },

  extensions: ['.svelte'],

  compilerOptions: {
    dev: isDev,
    hydratable: true,
    css: 'injected',
    sourcemap: false,
    accessors: false,
    // Svelte 5: HMR is in core — do this and REMOVE vitePlugin.hot
    hmr: isDev
  },

  // Remove/avoid vitePlugin.hot; it causes the Svelte 5 warning.
  // vitePlugin: { inspector: false }
};

export default config;
