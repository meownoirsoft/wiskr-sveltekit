# XRay
a simple DOM inspector that works in the future...today

```js
<script type="module">
  import { init } from '/xray.js';
  const xray = init({ hotkey: 'Control+Shift+X' }); // L = lock, C = copy selector
  // xray.toggle(true) // start enabled if you like chaos
</script>
```

React Next/Vite
```jsx
import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      import('./xray.js').then(({ init }) => init({ hotkey: 'Control+Shift+X' }));
    }
  }, []);
  return /* your app */;
}
```



Svelte
```svelte
<script>
  import { onMount } from 'svelte';
  onMount(async () => {
    if (import.meta.env.DEV) {
      const { init } = await import('$lib/devtools/xray.js');
      init({ hotkey: 'Control+Shift+X' });
    }
  });
</script>
```