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
    const ignoredWarnings = [
      'a11y_missing_attribute',
      'a11y_autofocus',
      'a11y_click_events_have_key_events',
      'a11y_no_noninteractive_tabindex',
      'a11y_interactive_supports_focus',
      'a11y_consider_explicit_label',
      'a11y_no_redundant_roles',
      'a11y_no_noninteractive_element_interactions',
      'a11y_no_noninteractive_tabindex',
      'a11y_interactive_supports_focus',
      'a11y_consider_explicit_label',
      'a11y_no_redundant_roles',
      'a11y_aria_attributes',
      'a11y_no_static_element_interactions',
      'a11y_aria_props',
      'a11y_aria_unsupported_elements',
      'a11y_role_has_required_aria_props',
      'a11y_click_events_have_key_events',
      'a11y_label_has_associated_control',
      'a11y_role_supports_aria_props',
      'export_let_unused',
      'css_unused_selector'
    ];

    if (ignoredWarnings.includes(warning.code)) return;

    // Otherwise, handle as normal
    handler(warning);
  },
  vitePlugin: {
    inspector: false
  }
};

export default config;