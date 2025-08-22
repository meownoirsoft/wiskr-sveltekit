<script>
  import { Database, Plus, Edit3, Trash2, Copy } from 'lucide-svelte';
</script>

<svelte:head>
  <title>Project Templates - Admin - Wiskr</title>
</svelte:head>

<div>
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
      Project Templates
    </h1>
    <p class="mt-2 text-gray-600 dark:text-gray-400">
      Create and manage project templates for onboarding new users with pre-configured contexts and questions.
    </p>
  </div>

  <!-- Coming Soon Notice -->
  <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-8 text-center">
    <Database class="h-16 w-16 text-blue-500 mx-auto mb-4" />
    <h3 class="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-2">
      Project Templates Coming Soon
    </h3>
    <p class="text-blue-800 dark:text-blue-200 mb-6 max-w-2xl mx-auto">
      This feature will allow you to create reusable project templates with predefined contexts, questions, and structure 
      to help onboard new users quickly with relevant starting content.
    </p>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 max-w-4xl mx-auto">
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700 p-6">
        <Plus class="h-8 w-8 text-blue-500 mb-3" />
        <h4 class="font-semibold text-gray-900 dark:text-white mb-2">Template Creation</h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Create templates from existing projects or build new ones from scratch
        </p>
      </div>
      
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700 p-6">
        <Copy class="h-8 w-8 text-blue-500 mb-3" />
        <h4 class="font-semibold text-gray-900 dark:text-white mb-2">Bulk Deployment</h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Apply templates to multiple users or new signups automatically
        </p>
      </div>
      
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700 p-6">
        <Edit3 class="h-8 w-8 text-blue-500 mb-3" />
        <h4 class="font-semibold text-gray-900 dark:text-white mb-2">Customization</h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Customize contexts, questions, and settings for different user types
        </p>
      </div>
    </div>
  </div>
  
  <!-- For now, show current available functionality -->
  <div class="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
      Current Workaround
    </h3>
    <p class="text-gray-600 dark:text-gray-400 mb-4">
      While templates are in development, you can:
    </p>
    <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
      <li class="flex items-center">
        <div class="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
        Use the <strong>Project Import</strong> feature to upload template projects as JSON/ZIP files
      </li>
      <li class="flex items-center">
        <div class="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
        Export existing projects and reuse them as templates for new users
      </li>
      <li class="flex items-center">
        <div class="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
        Create standardized project structures manually and document the process
      </li>
    </ul>
    
    <div class="mt-6 flex gap-3">
      <a 
        href="/admin/import" 
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Go to Project Import
      </a>
    </div>
  </div>
</div>
