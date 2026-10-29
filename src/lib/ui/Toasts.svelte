<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { fly } from 'svelte/transition';
  import Icon from './Icon.svelte';
</script>

<div class="toasts" aria-live="polite">
  {#each store.toasts as toast (toast.id)}
    <div class="toast {toast.tone}" transition:fly={{ y: 20, duration: 260 }}>
      <Icon name={toast.tone === 'error' ? 'alert' : toast.tone === 'info' ? 'info' : 'check-circle'} size={18} />
      <span>{toast.text}</span>
    </div>
  {/each}
</div>

<style>
  .toasts { position: fixed; z-index: 120; left: 50%; transform: translateX(-50%); bottom: calc(100px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 8px; width: min(440px, calc(100vw - 32px)); pointer-events: none; }
  .toast { display: flex; gap: 10px; align-items: center; padding: 12px 16px; border-radius: 16px; background: rgba(30, 40, 36, 0.92); backdrop-filter: blur(20px) saturate(1.6); border: 1px solid var(--stroke-strong); box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45); font-size: 14.5px; }
  .toast.ok :global(svg) { color: var(--accent); }
  .toast.error :global(svg) { color: var(--negative); }
  .toast.info :global(svg) { color: var(--blue); }
  @media (min-width: 960px) { .toasts { bottom: 28px; left: calc(50% + 110px); } }
</style>
