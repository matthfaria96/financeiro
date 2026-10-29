<script lang="ts">
  import type { Snippet } from 'svelte';
  import { haptic } from '$lib/features/pwa.svelte';

  /**
   * Carrossel de cartões do mesmo tamanho: arraste (dedo, mouse ou dois dedos no trackpad), use as setas
   * do teclado ou toque nas bolinhas. O cartão acompanha o dedo e assenta no mais próximo com mola.
   */
  let { count, index = $bindable(0), labels, slide }: { count: number; index?: number; labels: string[]; slide: Snippet<[number]> } = $props();
  const GAP = 14;
  const BLEED = 12; // espaço em volta para a sombra dos cartões não ser cortada
  let outer = $state(0);
  const width = $derived(Math.max(0, outer - BLEED * 2));
  let drag = $state(0);
  let dragging = $state(false);
  let startX = 0, startY = 0, lastX = 0, lastT = 0, velocity = 0, locked: 'x' | 'y' | null = null;
  let wheelTotal = 0, wheelPause = 0;

  const clamp = (i: number) => Math.max(0, Math.min(count - 1, i));
  const go = (i: number) => {
    const next = clamp(i);
    if (next !== index) haptic();
    index = next;
  };
  // Nas pontas, resiste (efeito elástico) em vez de parar seco.
  const resisted = $derived((index === 0 && drag > 0) || (index === count - 1 && drag < 0) ? drag / 3 : drag);
  const offset = $derived(-index * (width + GAP) + resisted);

  function down(e: PointerEvent) {
    if (e.button !== 0) return;
    startX = lastX = e.clientX; startY = e.clientY; lastT = performance.now(); velocity = 0; locked = null;
    dragging = true;
  }
  function move(e: PointerEvent) {
    if (!dragging) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (!locked && Math.hypot(dx, dy) > 6) {
      locked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (locked === 'x') (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    if (locked !== 'x') return;
    const now = performance.now();
    velocity = (e.clientX - lastX) / Math.max(1, now - lastT);
    lastX = e.clientX; lastT = now;
    drag = dx;
  }
  function up() {
    if (!dragging) return;
    dragging = false;
    if (locked === 'x') {
      const flick = Math.abs(velocity) > 0.45 ? -Math.sign(velocity) : 0;
      const far = Math.abs(drag) > width * 0.28 ? -Math.sign(drag) : 0;
      go(index + (flick || far));
      // Um arraste não pode virar clique em botão dentro do cartão.
      if (Math.abs(drag) > 6) addEventListener('click', (ev) => { ev.stopPropagation(); ev.preventDefault(); }, { capture: true, once: true });
    }
    drag = 0;
    locked = null;
  }
  // Trackpad: dois dedos para o lado passam um cartão; a inércia que sobra é ignorada por um instante.
  function wheel(e: WheelEvent) {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    if (performance.now() < wheelPause) return;
    wheelTotal += e.deltaX;
    if (Math.abs(wheelTotal) > 50) {
      go(index + Math.sign(wheelTotal));
      wheelTotal = 0;
      wheelPause = performance.now() + 650;
    }
  }
  function key(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div class="carousel" role="region" aria-roledescription="carrossel" aria-label={labels[index]} tabindex="0" onkeydown={key}>
  <div class="viewport" bind:clientWidth={outer} onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up} onwheel={wheel} role="presentation">
    <div class="track" class:dragging style:transform="translate3d({offset}px, 0, 0)" style:gap="{GAP}px">
      {#each Array.from({ length: count }, (_, i) => i) as i (i)}
        <div class="slide" class:current={i === index} aria-hidden={i !== index} style:width="{width}px">{@render slide(i)}</div>
      {/each}
    </div>
  </div>
  <div class="dots" role="tablist" aria-label="Cartões">
    {#each labels as label, i (label)}<button role="tab" aria-selected={i === index} aria-label={label} class:on={i === index} onclick={() => go(i)}></button>{/each}
  </div>
</div>

<style>
  .carousel { outline: none; }
  .viewport { overflow: hidden; touch-action: pan-y; cursor: grab; margin: -12px; padding: 12px; }
  .viewport:active { cursor: grabbing; }
  .track { display: flex; align-items: stretch; transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1); will-change: transform; }
  .track.dragging { transition: none; }
  .slide { flex: none; display: flex; transition: opacity 0.45s, transform 0.55s cubic-bezier(0.22, 1, 0.36, 1); user-select: none; -webkit-user-select: none; }
  .slide:not(.current) { opacity: 0.45; transform: scale(0.96); }
  .slide > :global(*) { flex: 1; min-width: 0; }
  .dots { display: flex; justify-content: center; gap: 7px; margin-top: 12px; }
  .dots button { width: 7px; height: 7px; border-radius: 4px; border: 0; padding: 0; background: rgba(255, 255, 255, 0.22); transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1), background 0.3s; }
  .dots button.on { width: 22px; background: var(--accent); }
  .dots button:hover:not(.on) { background: rgba(255, 255, 255, 0.4); }
</style>
