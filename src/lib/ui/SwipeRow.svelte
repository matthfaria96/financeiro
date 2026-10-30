<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';
  import { haptic } from '$lib/features/pwa.svelte';

  /**
   * Linha que se apaga como no iPhone: no celular, arraste para a esquerda e toque em Apagar (ou arraste até o fim);
   * no computador, passe o mouse e clique na lixeira que aparece. `disabled`: linha só de leitura.
   */
  let { children, ondelete, label = 'Apagar', disabled = false }: { children: Snippet; ondelete: () => void; label?: string; disabled?: boolean } = $props();
  const OPEN = 84;
  let x = $state(0);
  let dragging = $state(false);
  let startX = 0, startY = 0, base = 0, locked: 'x' | 'y' | null = null;
  let width = $state(0);

  function down(e: PointerEvent) {
    if (disabled || e.pointerType === 'mouse') return;
    startX = e.clientX; startY = e.clientY; base = x; locked = null; dragging = true;
  }
  function move(e: PointerEvent) {
    if (!dragging) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (!locked && Math.hypot(dx, dy) > 8) locked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (locked !== 'x') return;
    x = Math.min(0, base + dx);
  }
  function up() {
    if (!dragging) return;
    dragging = false;
    if (locked !== 'x') return;
    // Arrastou mais de 60% da linha: apaga direto. Passou da metade do botão: fica aberto.
    if (-x > width * 0.6) return remove();
    x = -x > OPEN / 2 ? -OPEN : 0;
    if (x) haptic();
  }
  function remove() {
    haptic();
    x = -width;
    setTimeout(ondelete, 180);
  }
  // Tocar em outro lugar fecha a linha aberta.
  $effect(() => {
    if (x !== -OPEN) return;
    const close = (e: Event) => { if (!(e.target instanceof Element && e.target.closest('.swipe-action'))) x = 0; };
    addEventListener('pointerdown', close, true);
    return () => removeEventListener('pointerdown', close, true);
  });
</script>

<div class="swipe" bind:clientWidth={width}>
  {#if !disabled}<button class="swipe-action" style:width="{Math.max(OPEN, -x)}px" onclick={remove} aria-label={label} tabindex={x ? 0 : -1}><Icon name="trash" size={18} /><span>{label}</span></button>{/if}
  <div class="content" class:dragging style:transform="translate3d({x}px, 0, 0)" onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up} role="presentation">
    {@render children()}
    {#if !disabled}<button class="hover-del" onclick={remove} aria-label={label} title={label}><Icon name="trash" size={15} /></button>{/if}
  </div>
</div>

<style>
  .swipe { position: relative; overflow: hidden; touch-action: pan-y; }
  .swipe-action { position: absolute; top: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
    border: 0; background: var(--negative); color: #fff; font-size: 11.5px; font-weight: 600; }
  .content { position: relative; display: flex; align-items: center; background: var(--card-solid); transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
  .content.dragging { transition: none; }
  .content > :global(:first-child) { flex: 1; min-width: 0; }
  /* Computador: lixeira discreta que aparece ao passar o mouse. */
  .hover-del { display: none; width: 34px; height: 34px; margin-right: 8px; border-radius: 10px; border: 1px solid transparent; background: none; color: var(--text-3); place-items: center; flex: none; opacity: 0; transition: opacity 0.15s, color 0.15s, background 0.15s; }
  @media (hover: hover) and (pointer: fine) {
    .hover-del { display: grid; }
    .swipe:hover .hover-del, .hover-del:focus-visible { opacity: 1; }
    .hover-del:hover { color: var(--negative); background: rgba(255, 107, 91, 0.12); }
    .swipe-action { display: none; }
  }
</style>
