// svelte.config.js
import adapter from '@sveltejs/adapter-netlify';

const isDev = process.env.NODE_ENV === 'development';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),

    experimental: {
      tracing: {
        server: true
      },

      instrumentation: {
        server: true
      }
    }
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
  onwarn: (warning, handler) => {
    if (warning.code.startsWith('a11y-')) return;
    handler(warning);
  },
  vitePlugin: {
    inspector: false
  }
};

export default config;