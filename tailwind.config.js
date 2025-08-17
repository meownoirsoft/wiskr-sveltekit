/** @type {import('tailwindcss').Config} */
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

export default {
  darkMode: 'class',
  content: [
    './src/**/*.{svelte,js,ts}',
    './src/routes/**/*.{svelte,js,ts}',
    './src/lib/**/*.{svelte,js,ts}',
    './index.html'
  ],
  safelist: [
    // Rainbow branch colors - dynamically applied
    'bg-white', 'border-gray-200',
    'bg-red-50', 'border-red-200',
    'bg-orange-50', 'border-orange-200', 
    'bg-yellow-50', 'border-yellow-200',
    'bg-green-50', 'border-green-200',
    'bg-blue-50', 'border-blue-200',
    'bg-indigo-50', 'border-indigo-200',
    'bg-purple-50', 'border-purple-200',
    'bg-pink-50', 'border-pink-200',
    // Prose styles for markdown formatting
    'prose', 'prose-sm', 'max-w-none'
  ],
  theme: { extend: {} },
  plugins: [forms, typography]
};
