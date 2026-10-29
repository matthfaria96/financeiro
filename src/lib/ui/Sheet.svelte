<script module lang="ts">
  /** Janelas abertas, da de baixo para a de cima: só a de cima aparece (uma janela por vez). */
  let stack = $state<symbol[]>([]);
</script>

<script lang="ts">
  import { untrack, type Snippet } from 'svelte';
  import Icon from './Icon.svelte';
  import { fade } from 'svelte/transition';
  import { cubicOut, quintOut } from 'svelte/easing';

  /**
   * Folha: sobe de baixo no celular e abre centralizada no computador. Esc ou toque fora fecham.
   * Uma folha aberta de dentro de outra toma o lugar dela (com "Voltar"); ao fechar, a de baixo volta.
   */
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

  const id = Symbol();
  $effect(() => {
    if (!open) return;
    // untrack: ler a pilha aqui faria o efeito rodar de novo a cada janela aberta.
    untrack(() => (stack = [...stack, id]));
    return () => untrack(() => (stack = stack.filter((s) => s !== id)));
  });
  const depth = $derived(stack.indexOf(id));
  const under = $derived(depth >= 0 && depth < stack.length - 1);

  function keydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open && !under) close();
  }

  /** Leva a folha para o <body>: dentro de outra folha ela ficaria presa à de baixo. */
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return { destroy: () => node.remove() };
  }

  const isMobile = () => typeof matchMedia !== 'undefined' && matchMedia('(max-width: 720px)').matches;
  /** Celular: sobe de baixo. Computador: surge crescendo um pouco, como as janelas do macOS. */
  function present(node: HTMLElement) {
    const base = getComputedStyle(node).transform;
    const from = base === 'none' ? '' : base;
    if (isMobile()) return { duration: 420, easing: quintOut, css: (_t: number, u: number) => `transform: ${from} translateY(${u * 100}%)` };
    return { duration: 280, easing: cubicOut, css: (t: number, u: number) => `opacity: ${t}; transform: ${from} translateY(${u * 10}px) scale(${0.965 + 0.035 * t})` };
  }
</script>

<svelte:window onkeydown={keydown} />

{#if open}
  <div use:portal>
  <div class="backdrop" class:nested={depth > 0} transition:fade={{ duration: depth > 0 ? 0 : 220 }} onclick={close} role="presentation"></div>
  <div class="sheet" class:wide class:under role="dialog" aria-hidden={under} aria-modal="true" aria-label={title}
    transition:present>
    <div class="grabber" aria-hidden="true"></div>
    <header>
      <button class="btn ghost" onclick={close}>{#if depth > 0}<Icon name="chevron-left" size={16} />Voltar{:else}Fechar{/if}</button>
      <h3>{title}</h3>
      <div class="actions">{#if actions}{@render actions()}{/if}</div>
    </header>
    <div class="body">{@render children()}</div>
  </div>
  </div>
{/if}

<style>
  .backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); backdrop-filter: blur(2px); z-index: 80; }
  .sheet {
    position: fixed; z-index: 81; left: 50%; top: 50%; transform: translate(-50%, -50%);
    width: min(560px, calc(100vw - 32px)); max-height: min(86vh, 900px); display: flex; flex-direction: column;
    background: rgba(20, 28, 25, 0.86); backdrop-filter: blur(30px) saturate(1.6); -webkit-backdrop-filter: blur(30px) saturate(1.6);
    border: 1px solid var(--stroke-strong); border-radius: 24px; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 30px 80px rgba(0, 0, 0, 0.6);
  }
  .backdrop.nested { background: transparent; backdrop-filter: none; }
  .sheet.under { opacity: 0; visibility: hidden; pointer-events: none; transition: opacity 0.15s, visibility 0s 0.15s; }
  header .btn.ghost :global(svg) { margin-left: -4px; }
  .sheet.wide { width: min(820px, calc(100vw - 32px)); }
  header { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; padding: 10px 10px 8px; border-bottom: 1px solid var(--stroke); }
  header h3 { margin: 0; font-size: 16px; font-weight: 600; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  header .btn.ghost { justify-self: start; }
  .actions { justify-self: end; display: flex; gap: 6px; }
  .body { overflow-y: auto; padding: 8px 16px 20px; overscroll-behavior: contain; }
  .grabber { display: none; }
  @media (max-width: 720px) {
    .sheet { left: 0; right: 0; top: auto; bottom: 0; transform: none; width: 100%; max-height: calc(100dvh - env(safe-area-inset-top) - 12px); border-radius: 22px 22px 0 0; padding-bottom: env(safe-area-inset-bottom); }
    .sheet.wide { width: 100%; }
    .grabber { display: block; width: 38px; height: 5px; border-radius: 3px; background: rgba(255, 255, 255, 0.25); margin: 8px auto 0; }
  }
</style>
