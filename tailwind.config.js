/** @type {import('tailwindcss').Config} */
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

export default {
  content: [
    './src/**/*.{svelte,js,ts}',
    './src/routes/**/*.{svelte,js,ts}',
    './src/lib/**/*.{svelte,js,ts}',
    './index.html'
  ],
  theme: { extend: {} },
  plugins: [forms, typography]
};