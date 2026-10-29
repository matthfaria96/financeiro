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

  /** O fundo escuro não deixa rolar a página de trás (dedo ou roda). Sem mexer no overflow da página: isso recalculava a tela toda. */
  function noScroll(node: HTMLElement) {
    const stop = (e: Event) => e.preventDefault();
    node.addEventListener('wheel', stop, { passive: false });
    node.addEventListener('touchmove', stop, { passive: false });
    return { destroy: () => { node.removeEventListener('wheel', stop); node.removeEventListener('touchmove', stop); } };
  }

  /** Leva a folha para o <body>: dentro de outra folha ela ficaria presa à de baixo. */
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return { destroy: () => node.remove() };
  }

  const isMobile = () => typeof matchMedia !== 'undefined' && matchMedia('(max-width: 720px)').matches;
  /** Celular: sobe de baixo. Computador: surge crescendo um pouco, como as janelas do macOS. */
  /**
   * Abrir/fechar só com transform e opacity (a placa de vídeo anima sem repintar nada).
   * Celular: sobe de baixo. Computador: surge crescendo um pouco, como as janelas do macOS.
   */
  function present(_node: HTMLElement) {
    if (reduce) return { duration: 0 };
    if (isMobile()) return { duration: 340, easing: quintOut, css: (_t: number, u: number) => `transform: translate3d(0, ${u * 100}%, 0)` };
    return { duration: 220, easing: cubicOut, css: (t: number, u: number) => `opacity: ${t}; transform: translate3d(0, ${u * 8}px, 0) scale(${0.97 + 0.03 * t})` };
  }
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
</script>

<svelte:window onkeydown={keydown} />

{#if open}
  <div use:portal>
  <div class="backdrop" class:nested={depth > 0} use:noScroll transition:fade={{ duration: depth > 0 || reduce ? 0 : 200 }} onclick={close} role="presentation"></div>
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
  /* Sem desfoque (backdrop-filter): refazer o vidro a cada quadro da animação é o que engasgava.
     Fundo quase opaco com degradê dá o mesmo visual e anima liso. */
  .backdrop { position: fixed; inset: 0; z-index: 80; background: rgba(2, 6, 5, 0.62); }
  .sheet {
    position: fixed; z-index: 81; inset: 0; margin: auto; height: fit-content;
    width: min(560px, calc(100vw - 32px)); max-height: min(86vh, 900px); display: flex; flex-direction: column;
    background: linear-gradient(180deg, #19221f, #121916); contain: layout paint; will-change: transform, opacity;
    border: 1px solid var(--stroke-strong); border-radius: 24px; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 30px 80px rgba(0, 0, 0, 0.55);
  }
  .backdrop.nested { background: transparent; }
  .sheet.under { opacity: 0; visibility: hidden; pointer-events: none; transition: opacity 0.12s, visibility 0s 0.12s; }
  header .btn.ghost :global(svg) { margin-left: -4px; }
  .sheet.wide { width: min(820px, calc(100vw - 32px)); }
  header { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; padding: 10px 10px 8px; border-bottom: 1px solid var(--stroke); flex: none; }
  header h3 { margin: 0; font-size: 16px; font-weight: 600; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  header .btn.ghost { justify-self: start; }
  .actions { justify-self: end; display: flex; gap: 6px; }
  .body { overflow-y: auto; padding: 8px 16px 20px; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
  .grabber { display: none; }
  @media (max-width: 720px) {
    .sheet { inset: auto 0 0 0; margin: 0; height: auto; width: 100%; max-height: calc(100dvh - env(safe-area-inset-top) - 12px); border-radius: 22px 22px 0 0; padding-bottom: env(safe-area-inset-bottom); }
    .sheet.wide { width: 100%; }
    .grabber { display: block; width: 38px; height: 5px; border-radius: 3px; background: rgba(255, 255, 255, 0.25); margin: 8px auto 0; flex: none; }
  }
</style>
