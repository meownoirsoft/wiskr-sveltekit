<script>
  // Contact and support information
  export let contactEmail = 'support@wiskrapp.com';
  export let docsUrl = 'https://docs.wiskrapp.com';
  export let communityUrl = 'https://community.wiskrapp.com';
  
  // FAQ data
  const faqItems = [
    {
      question: "How do I create my first project?",
      answer: "Click the 'New' button in the header or go to Projects and select 'Create New Project'. Give your project a name and description, then start adding facts and having conversations with your Wiskrs."
    },
    {
      question: "What are conversation branches?",
      answer: "Branches let you explore different conversation paths from any message. Click the branch icon next to any message to create an alternative response and continue the conversation in a new direction."
    },
    {
      question: "How do I add context to my projects?",
      answer: "Use the Facts panel on the left to add documents, notes, and key information. This context helps your Wiskrs provide more relevant and accurate responses."
    },
    {
      question: "Can I export my project data?",
      answer: "Yes! Click the settings icon in your project selector and choose 'Export Project'. You can export conversations, facts, and project settings in various formats."
    },
    {
      question: "How do I switch between different Wiskr models?",
      answer: "In any conversation, click the model name at the top of the chat interface. You can choose from different Wiskr personalities and capabilities to match your needs."
    },
    {
      question: "What are project questions and ideas?",
      answer: "The Ideas panel on the right suggests relevant questions and related concepts based on your project context. Use these to explore new conversation topics and discover insights."
    }
  ];
  
  let openFaqIndex = null;
  
  function toggleFaq(index) {
    openFaqIndex = openFaqIndex === index ? null : index;
  }
</script>

<svelte:head>
  <title>Support — Wiskr</title>
  <meta name="description" content="Get help with Wiskr. Find answers to common questions, contact support, and access helpful resources." />
  <meta name="robots" content="index,follow" />
</svelte:head>

<section class="mx-auto max-w-4xl px-6 py-12">
  <header class="mb-12 text-center">
    <h1 class="text-4xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Support Center</h1>
    <p class="mt-4 text-lg text-gray-600 dark:text-gray-400">
      Need help? We're here to assist you with Wiskr.
    </p>
  </header>

  <!-- Quick Help Cards -->
  <div class="mb-16">
    <h2 class="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Quick Help</h2>
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <!-- Getting Started -->
      <div class="group rounded-xl border border-gray-200 dark:border-gray-700 p-6 transition-all hover:shadow-lg dark:hover:shadow-gray-800/25" style="background-color: var(--bg-card);">
        <div class="mb-4">
          <span class="text-3xl">🚀</span>
        </div>
        <h3 class="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">Getting Started</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          New to Wiskr? Learn the basics of creating projects and having conversations with Wiskrs.
        </p>
        <a 
          href={docsUrl} 
          class="inline-flex items-center gap-2 text-sm font-medium hover:underline transition-colors"
          style="color: var(--color-accent);"
          target="_blank"
          rel="noopener noreferrer"
        >
          View Guide
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      <!-- Community Support -->
      <div class="group rounded-xl border border-gray-200 dark:border-gray-700 p-6 transition-all hover:shadow-lg dark:hover:shadow-gray-800/25" style="background-color: var(--bg-card);">
        <div class="mb-4">
          <span class="text-3xl">💬</span>
        </div>
        <h3 class="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">Community Support</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Join our Discord community for help from other users and quick responses to common questions.
        </p>
        <a 
          href="https://discord.gg/wiskr" 
          class="inline-flex items-center gap-2 text-sm font-medium hover:underline transition-colors"
          style="color: var(--color-accent);"
          target="_blank"
          rel="noopener noreferrer"
        >
          Join Discord
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      <!-- Community -->
      <div class="group rounded-xl border border-gray-200 dark:border-gray-700 p-6 transition-all hover:shadow-lg dark:hover:shadow-gray-800/25" style="background-color: var(--bg-card);">
        <div class="mb-4">
          <span class="text-3xl">🌟</span>
        </div>
        <h3 class="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">Community</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Connect with other users, share tips, and discover new ways to use Wiskr.
        </p>
        <a 
          href={communityUrl} 
          class="inline-flex items-center gap-2 text-sm font-medium hover:underline transition-colors"
          style="color: var(--color-accent);"
          target="_blank"
          rel="noopener noreferrer"
        >
          Join Community
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  </div>

  <!-- FAQ Section -->
  <div class="mb-16">
    <h2 class="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Frequently Asked Questions</h2>
    <div class="space-y-4">
      {#each faqItems as faq, index}
        <div class="rounded-lg border border-gray-200 dark:border-gray-700" style="background-color: var(--bg-card);">
          <button
            class="w-full px-6 py-4 text-left flex items-center justify-between hover:opacity-80 transition-opacity"
            on:click={() => toggleFaq(index)}
            aria-expanded={openFaqIndex === index}
          >
            <span class="font-medium text-gray-900 dark:text-gray-100">{faq.question}</span>
            <svg 
              class="w-5 h-5 transition-transform {openFaqIndex === index ? 'rotate-180' : ''}" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {#if openFaqIndex === index}
            <div class="px-6 pb-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              <p class="text-gray-600 dark:text-gray-400 leading-relaxed">{faq.answer}</p>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- Contact Information -->
  <div class="mb-16">
    <h2 class="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Get in Touch</h2>
    <div class="grid gap-8 md:grid-cols-2">
      <!-- Free Users: Discord -->
      <div class="rounded-xl border border-gray-200 dark:border-gray-700 p-6" style="background-color: var(--bg-card);">
        <h3 class="text-lg font-medium mb-3 text-gray-900 dark:text-gray-100">Free Users: Community Support</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-4">
          Join our Discord community for peer support, common questions, and community-driven help. Get faster responses from other users and occasional direct help.
        </p>
        <a 
          href="https://discord.gg/wiskr" 
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all hover:shadow-md"
          style="background-color: var(--color-accent);"
          on:mouseenter={(e) => e.target.style.backgroundColor = 'var(--color-accent-hover)'}
          on:mouseleave={(e) => e.target.style.backgroundColor = 'var(--color-accent)'}
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0189 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
          </svg>
          Join Discord Community
        </a>
      </div>

      <!-- Pro Users: Direct Support -->
      <div class="rounded-xl border border-gray-200 dark:border-gray-700 p-6" style="background-color: var(--bg-card);">
        <h3 class="text-lg font-medium mb-3 text-gray-900 dark:text-gray-100">Pro Users: Direct Support</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-4">
          Pro and higher tier users get direct email support and access to a private Discord channel for priority assistance.
        </p>
        <div class="space-y-3">
          <a 
            href="mailto:{contactEmail}" 
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 font-medium transition-all hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700"
            style="color: var(--color-accent);"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email Support
          </a>
          <p class="text-xs text-gray-500 dark:text-gray-500">
            Response times vary based on complexity and current workload. I'm a solo founder, so please be patient!
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- Additional Resources -->
  <div>
    <h2 class="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Additional Resources</h2>
    <div class="grid gap-4 sm:grid-cols-2">
      <a 
        href="/legal" 
        class="group flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
        style="background-color: var(--bg-card);"
      >
        <span class="text-2xl">📋</span>
        <div>
          <div class="font-medium text-gray-900 dark:text-gray-100 group-hover:underline">Legal & Privacy</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">Terms of Service and Privacy Policy</div>
        </div>
      </a>
      
      <a 
        href={docsUrl}
        target="_blank"
        rel="noopener noreferrer" 
        class="group flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
        style="background-color: var(--bg-card);"
      >
        <span class="text-2xl">📚</span>
        <div class="flex-1">
          <div class="font-medium text-gray-900 dark:text-gray-100 group-hover:underline">Documentation</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">Comprehensive guides and tutorials</div>
        </div>
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  </div>

  <!-- Footer -->
  <footer class="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-600 dark:text-gray-400">
    <p>
      Need immediate assistance? Email us at 
      <a class="underline hover:no-underline" style="color: var(--color-accent);" href="mailto:{contactEmail}">{contactEmail}</a>
      and we'll help you get back on track.
    </p>
  </footer>
</section>
