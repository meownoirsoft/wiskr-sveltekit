<script>
  // Customize these if your routes or email differ
  export let privacyPath = '/privacy';
  export let termsPath = '/terms';
  export let contactEmail = 'support@wiskrapp.com';
</script>

<svelte:head>
  <title>Legal — Wiskr</title>
  <meta name="description" content="Read Wiskr’s Terms of Service and Privacy Policy." />
  <meta name="robots" content="index,follow" />
</svelte:head>

<section class="mx-auto max-w-2xl px-6 py-12">
  <header class="mb-8">
    <h1 class="text-3xl font-semibold tracking-tight">Legal</h1>
    <p class="mt-2 text-base text-muted-foreground">
      Welcome to Wiskr’s legal center. Here you’ll find our key policies.
    </p>
  </header>

  <nav aria-label="Legal documents">
    <ul class="space-y-4">
      <li>
        <a
          href={privacyPath}
          class="group inline-flex items-center rounded-xl border px-4 py-3 transition hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2"
        >
          <span class="mr-2 text-xl">🔒</span>
          <div>
            <div class="font-medium group-hover:underline">Privacy Policy</div>
            <div class="text-sm text-muted-foreground">
              How we collect, use, and protect your data.
            </div>
          </div>
        </a>
      </li>
      <li>
        <a
          href={termsPath}
          class="group inline-flex items-center rounded-xl border px-4 py-3 transition hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2"
        >
          <span class="mr-2 text-xl">📜</span>
          <div>
            <div class="font-medium group-hover:underline">Terms of Service</div>
            <div class="text-sm text-muted-foreground">
              The rules for using Wiskr.
            </div>
          </div>
        </a>
      </li>
    </ul>
  </nav>

  <footer class="mt-10 border-t pt-6 text-sm text-muted-foreground">
    By using Wiskr, you agree to our
    <a class="underline hover:no-underline" href={termsPath}>Terms of Service</a>
    and
    <a class="underline hover:no-underline" href={privacyPath}>Privacy Policy</a>.
    Questions? Email us at
    <a class="underline hover:no-underline" href={"mailto:" + contactEmail}>{contactEmail}</a>.
  </footer>
</section>
