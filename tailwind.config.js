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
    // Admin dashboard colors - dynamically applied
    'text-blue-600', 'text-blue-400', 'border-blue-200', 'border-blue-300', 'border-blue-700', 'border-blue-800', 'hover:border-blue-300', 'hover:border-blue-700',
    'text-green-600', 'text-green-400', 'border-green-200', 'border-green-300', 'border-green-700', 'border-green-800', 'hover:border-green-300', 'hover:border-green-700',
    'text-purple-600', 'text-purple-400', 'border-purple-200', 'border-purple-300', 'border-purple-700', 'border-purple-800', 'hover:border-purple-300', 'hover:border-purple-700',
    'text-orange-600', 'text-orange-400', 'border-orange-200', 'border-orange-300', 'border-orange-700', 'border-orange-800', 'hover:border-orange-300', 'hover:border-orange-700',
    'text-red-600', 'text-red-400', 'text-green-500', 'text-green-600', 'text-yellow-600',
    'bg-red-100', 'text-red-800', 'text-red-200', 'dark:bg-red-900', 'dark:text-red-200',
    // Dark mode variations
    'dark:text-blue-400', 'dark:text-green-400', 'dark:text-purple-400', 'dark:text-orange-400',
    'dark:text-red-400', 'dark:text-green-600', 'dark:text-yellow-400',
    'dark:border-blue-800', 'dark:border-green-800', 'dark:border-purple-800', 'dark:border-orange-800',
    'dark:hover:border-blue-700', 'dark:hover:border-green-700', 'dark:hover:border-purple-700', 'dark:hover:border-orange-700',
    // Prose styles for markdown formatting
    'prose', 'prose-sm', 'max-w-none'
  ],
  theme: { extend: {} },
  plugins: [forms, typography]
};
