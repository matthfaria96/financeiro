<script lang="ts">
  import { addMonths, monthOf, shortMonth, today, type Month } from '$lib/core/dates';
  import Icon from '$lib/ui/Icon.svelte';

  /**
   * Meses do Início: o mês escolhido fica sempre no centro, parado; a faixa desliza por baixo.
   * Vai do primeiro mês com dados até 12 meses à frente. Setas nas pontas, toque num mês ou arraste.
   */
  let { value = $bindable(), first }: { value: Month; first: Month | null } = $props();
  const now = monthOf(today());
  const start = $derived(first && first < now ? first : addMonths(now, -11));
  const months = $derived.by(() => {
    const list: Month[] = [];
    for (let m = start; m <= addMonths(now, 12); m = addMonths(m, 1)) list.push(m);
    return list;
  });
  const index = $derived(Math.max(0, months.indexOf(value)));
  const ITEM = 68;
  let width = $state(600);
  const offset = $derived(width / 2 - ITEM / 2 - index * ITEM);

  const go = (delta: number) => { const next = months[index + delta]; if (next) value = next; };
  let startX = 0;
  function down(e: PointerEvent) { startX = e.clientX; }
  function up(e: PointerEvent) {
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 30) go(-Math.round(dx / ITEM) || (dx > 0 ? -1 : 1));
  }
  function key(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'ArrowRight') go(1);
  }
</script>

<div class="wrap" role="tablist" aria-label="Mês" tabindex="0" onkeydown={key}>
  <button class="arrow left" aria-label="Mês anterior" disabled={index === 0} onclick={() => go(-1)}><Icon name="chevron-left" size={18} /></button>
  <div class="viewport" role="presentation" bind:clientWidth={width} onpointerdown={down} onpointerup={up}>
    <div class="track" style:transform="translateX({offset}px)">
      {#each months as m, i (m)}
        {@const distance = Math.abs(i - index)}
        <button role="tab" aria-selected={m === value} class:on={m === value} class:now={m === now} class:future={m > now}
          style:opacity={Math.max(0.25, 1 - distance * 0.18)} onclick={() => (value = m)}>
          <span>{shortMonth(m).slice(0, 3)}</span><small>{m === value || m.endsWith('-01') ? m.slice(0, 4) : ''}</small>
        </button>
      {/each}
    </div>
  </div>
  <button class="arrow right" aria-label="Próximo mês" disabled={index === months.length - 1} onclick={() => go(1)}><Icon name="chevron-right" size={18} /></button>
</div>
{#if value !== now}<button class="today" onclick={() => (value = now)}>Voltar para {shortMonth(now).slice(0, 3)}</button>{/if}

<style>
  .wrap { position: relative; display: flex; align-items: center; gap: 6px; outline: none; }
  .viewport { position: relative; flex: 1; overflow: hidden; height: 58px; touch-action: pan-y; cursor: grab;
    -webkit-mask-image: linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent); mask-image: linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent); }
  .track { position: absolute; left: 0; top: 0; display: flex; transition: transform 0.45s var(--ease); }
  .track button { width: 68px; height: 58px; flex: none; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; border: 0; background: none; color: var(--text-2); font-size: 14px; transition: opacity 0.3s, color 0.3s; }
  .track button span { transition: transform 0.35s var(--ease); }
  .track button small { font-size: 10px; color: var(--text-3); height: 12px; }
  .track button.future span { font-style: italic; }
  .track button.on { color: var(--text); }
  .track button.on span { transform: scale(1.45); font-weight: 700; }
  .track button.on.now span { color: var(--accent); }
  .viewport::after { content: ''; position: absolute; left: 50%; top: 6px; width: 64px; height: 46px; transform: translateX(-50%); border-radius: 14px; background: rgba(255, 255, 255, 0.07); border: 1px solid var(--stroke-strong); pointer-events: none; }

  .arrow { width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.05); color: var(--text-2); display: grid; place-items: center; flex: none; }
  .arrow:disabled { opacity: 0.25; }
  .today { align-self: center; margin-top: -6px; border: 0; background: none; color: var(--accent); font-size: 12.5px; font-weight: 600; }
</style>
