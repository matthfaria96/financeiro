<script lang="ts">
  import { money, percent } from '$lib/core/money';
  import Donut from '$lib/ui/Donut.svelte';
  import type { Group } from '$lib/features/analytics';

  /** Rosca de um lado (saídas ou entradas) com o nome de cada cor; o total fica no centro e os valores ao passar o mouse.
   *  Sem nada no mês, o cartão continua lá, apagado: anel vazio e a frase dizendo que ainda não há nada. */
  let { title, groups, total, empty }: { title: string; groups: Group[]; total: number; empty: string } = $props();
  const slices = $derived([
    ...groups.slice(0, 6).map((g) => ({ id: g.key, label: g.label, value: g.cents, color: g.color })),
    ...(groups.length > 6 ? [{ id: 'resto', label: 'Outros', value: groups.slice(6).reduce((s, g) => s + g.cents, 0), color: '#5a6b75' }] : [])
  ]);
</script>

<section class="card side" class:empty={!slices.length}>
  <div class="card-head"><h3>{title}</h3>{#if slices.length}<b class="num head-total">{money(total, { cents: false })}</b>{/if}</div>
  {#if slices.length}
    <div class="body">
      <div class="center"><Donut size={190} {slices} center={money(total, { cents: false })} caption={title} /></div>
      <div class="legend">{#each slices as s (s.id)}<span class="chip-l"><i style:background={s.color}></i><span class="lbl">{s.label}</span><span class="pct">{percent(s.value / (total || 1))}</span></span>{/each}</div>
    </div>
  {:else}
    <div class="body">
      <div class="center ghost" aria-hidden="true">
        <svg viewBox="0 0 100 100" width="190" height="190"><circle cx="50" cy="50" r="41" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="16" /><circle cx="50" cy="50" r="41" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="16" stroke-dasharray="2 6" /></svg>
        <span class="zero"><span class="caption">{title}</span><b>{money(0, { cents: false })}</b></span>
      </div>
      <p class="muted small none">{empty}</p>
    </div>
  {/if}
</section>

<style>
  .side { display: flex; flex-direction: column; gap: 14px; min-width: 0; height: 100%; container-type: inline-size; }
  .body { flex: 1; display: flex; flex-direction: column; gap: 14px; }
  .legend { margin-top: auto; }
  .pct { display: none; }
  .card-head { margin-bottom: 0; }
  .center { display: grid; place-items: center; }
  .empty { opacity: 0.72; }
  .ghost { position: relative; }
  .ghost svg { display: block; }
  .zero { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
  .zero b { font: 600 18px var(--font-display); color: var(--text-3); }
  .none { margin: auto 0 0; text-align: center; }
  .legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 14px; }
  .chip-l { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--text-2); white-space: nowrap; }
  i { width: 10px; height: 10px; border-radius: 3px; flex: none; }
  /* Cartão largo (a rosca sozinha no computador): legenda em lista ao lado, com a % de cada uma. */
  @container (min-width: 620px) {
    .body { flex-direction: row; align-items: center; justify-content: center; gap: 48px; }
    .legend { margin: 0; display: grid; grid-template-columns: repeat(2, minmax(150px, 210px)); gap: 10px 32px; justify-content: start; }
    .chip-l { font-size: 14px; }
    .lbl { flex: 1; }
    .pct { display: inline; color: var(--text); font-weight: 600; font-variant-numeric: tabular-nums; }
  }
  .head-total { display: none; font-size: 16px; font-weight: 600; }
  /* Celular (cartão estreito): rosca pequena à esquerda e a lista com % à direita — metade da altura. */
  @container (max-width: 520px) {
    .side { gap: 10px; }
    .head-total { display: inline; }
    .body { flex-direction: row; align-items: center; gap: 18px; }
    .center :global(.donut), .center :global(.donut svg), .ghost svg { width: 118px !important; height: 118px !important; }
    .center :global(.donut .center) { display: none; }
    .legend { margin: 0; flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 7px; justify-content: center; }
    .chip-l { display: flex; gap: 8px; font-size: 13.5px; }
    .lbl { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
    .pct { display: inline; color: var(--text); font-weight: 600; font-variant-numeric: tabular-nums; }
    .zero b { font-size: 14px; }
    .none { margin: 0; text-align: left; }
  }
</style>
