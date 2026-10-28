<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  /** Folha: sobe de baixo no celular e abre centralizada no computador. Esc ou toque fora fecham. */
  let { open = $bindable(), title, onclose, actions, children, wide = false }: {
    open: boolean;
    title: string;
    onclose?: () => void;
    actions?: Snippet;
    children: Snippet;
    wide?: boolean;
  } = $props();

  function close() {
    open = false;
    onclose?.();
  }

  function keydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) close();
  }

  const isMobile = () => typeof matchMedia !== 'undefined' && matchMedia('(max-width: 720px)').matches;
</script>

<svelte:window onkeydown={keydown} />

{#if open}
  <div class="backdrop" transition:fade={{ duration: 180 }} onclick={close} role="presentation"></div>
  <div class="sheet" class:wide role="dialog" aria-modal="true" aria-label={title}
    transition:fly={{ y: isMobile() ? 600 : 24, duration: 320, easing: cubicOut, opacity: isMobile() ? 1 : 0 }}>
    <div class="grabber" aria-hidden="true"></div>
    <header>
      <button class="btn ghost" onclick={close}>Fechar</button>
      <h3>{title}</h3>
      <div class="actions">{#if actions}{@render actions()}{/if}</div>
    </header>
    <div class="body">{@render children()}</div>
  </div>
{/if}

<style>
  .backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); backdrop-filter: blur(2px); z-index: 80; }
  .sheet {
    position: fixed; z-index: 81; left: 50%; top: 50%; transform: translate(-50%, -50%);
    width: min(560px, calc(100vw - 32px)); max-height: min(86vh, 900px); display: flex; flex-direction: column;
    background: #121916; border: 1px solid var(--stroke-strong); border-radius: 24px; box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
  }
  .sheet.wide { width: min(820px, calc(100vw - 32px)); }
  header { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; padding: 10px 10px 8px; border-bottom: 1px solid var(--stroke); }
  header h3 { margin: 0; font-size: 16px; font-weight: 600; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  header .btn.ghost { justify-self: start; }
  .actions { justify-self: end; display: flex; gap: 6px; }
  .body { overflow-y: auto; padding: 8px 16px 20px; overscroll-behavior: contain; }
  .grabber { display: none; }
  @media (max-width: 720px) {
    .sheet { left: 0; right: 0; top: auto; bottom: 0; transform: none; width: 100%; max-height: 94dvh; border-radius: 22px 22px 0 0; padding-bottom: env(safe-area-inset-bottom); }
    .sheet.wide { width: 100%; }
    .grabber { display: block; width: 38px; height: 5px; border-radius: 3px; background: rgba(255, 255, 255, 0.25); margin: 8px auto 0; }
  }
</style>
