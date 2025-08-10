<!-- src/routes/login/+page.svelte -->
<script>
  import { createBrowserClient } from '@supabase/ssr';
  import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
  const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

  let email = '';
  let password = '';
  let mode = 'signin'; // or 'signup'
  let msg = '';

  async function submit() {
    msg = '';
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // some projects require email confirm; if so, check Auth settings in Supabase
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      window.location.href = '/projects';
    } catch (e) {
      msg = e.message || String(e);
    }
  }
</script>

<div class="p-6 max-w-sm space-y-3">
  <h1 class="text-xl font-semibold">{mode === 'signup' ? 'Create account' : 'Sign in'}</h1>
  <input class="border p-2 w-full" placeholder="email" bind:value={email} />
  <input class="border p-2 w-full" type="password" placeholder="password" bind:value={password} />
  <button class="border px-3 py-2" on:click={submit}>
    {mode === 'signup' ? 'Sign up' : 'Sign in'}
  </button>
  <button class="text-sm underline" on:click={() => mode = mode === 'signup' ? 'signin' : 'signup'}>
    {mode === 'signup' ? 'Have an account? Sign in' : 'New here? Create one'}
  </button>
  {#if msg}<p class="text-sm text-red-600">{msg}</p>{/if}
</div>
