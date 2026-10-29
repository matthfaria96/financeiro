<script lang="ts">
  import { money, percent } from '$lib/core/money';
  import { addMonths, monthTitle, shortMonth, type Month } from '$lib/core/dates';
  import type { Account, Entry } from '$lib/data/types';
  import AdjustSheet from './AdjustSheet.svelte';
  import Donut from '$lib/ui/Donut.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import BarChart from '$lib/ui/charts/BarChart.svelte';
  import LineChart from '$lib/ui/charts/LineChart.svelte';
  import { seriesColor } from '$lib/ui/charts/scale';
  import { ui } from '$lib/ui/ui.svelte';
  import { adjustmentReason, analyzeMonth, monthEndTotal, type MonthAnalysis } from '$lib/features/analytics';

  /** Panorama mensal: o mês (entradas × saídas), os últimos 6 meses lado a lado e o saldo na conta no tempo. */
  let { month, analysis, entries, accounts, stale = [] }: { month: Month; analysis: MonthAnalysis; entries: Entry[]; accounts: Account[]; stale?: string[] } = $props();
  // Carrossel: 0 = o mês, 1 = entradas × saídas, 2 = saldo. Arraste ou toque nas bolinhas.
  let slide = $state(0);
  let track = $state<HTMLDivElement>();
  const titles = ['Panorama mensal', 'Entradas × saídas', 'Saldo nas contas'];
  const onScroll = () => { if (track) slide = Math.round(track.scrollLeft / track.clientWidth); };
  const goTo = (i: number) => track?.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
  let adjustOpen = $state(false);
  const months = $derived(Array.from({ length: 6 }, (_, i) => addMonths(month, i - 5)));
  const labels = $derived(months.map((m) => shortMonth(m).slice(0, 3)));
  const per = $derived( months.map((m) => analyzeMonth(m, entries, accounts)));
  const past = $derived(per.slice(0, -1).map((p) => p.expenseTotal).filter((v) => v > 0));
  const average = $derived(past.length ? Math.round(past.reduce((a, b) => a + b, 0) / past.length) : null);
  const balances = $derived(months.map((m) => monthEndTotal(m, accounts)));
  const spent = $derived(analysis.incomeTotal ? analysis.expenseTotal / analysis.incomeTotal : 0);
</script>

<section class="card">
  <div class="card-head"><h3>{titles[slide]}</h3>{#if slide === 0}<button class="btn adj" onclick={() => (adjustOpen = true)}><Icon name="pencil" size={13} />Ajustar</button>{/if}</div>
  <div class="slides" bind:this={track} onscroll={onScroll}>
    <div class="slide">
      <div class="month">
        <Donut size={104} thickness={0.32} center={analysis.incomeTotal ? percent(spent) : '—'} caption="gasto"
          slices={[{ id: 'in', label: 'Sobrou', value: Math.max(0, analysis.incomeTotal - analysis.expenseTotal), color: seriesColor.income }, { id: 'out', label: 'Saídas', value: analysis.expenseTotal, color: seriesColor.credit }]} />
        <div class="legend">
          <div class="line"><span class="row" style="gap: 8px"><i style:background={seriesColor.income}></i>Entradas</span><b class="num pos">{money(analysis.incomeTotal)}</b></div>
          <div class="line"><span class="row" style="gap: 8px"><i style:background={seriesColor.credit}></i>Saídas</span><b class="num">{money(analysis.expenseTotal)}</b></div>
          <a class="more" href="#/transacoes">Ver lançamentos <Icon name="chevron-right" size={13} /></a>
        </div>
      </div>
      {#if stale.length}<button class="stale" onclick={() => ui.startImport()}><Icon name="import" size={15} /><span class="grow">Extrato só {stale.join(', ')}. Importe o de {monthTitle(month).split(' ')[0].toLowerCase()} para ver as entradas.</span><b>Importar</b></button>{/if}
      {#if analysis.adjustment}<p class="caption adjnote">Inclui ajuste ({adjustmentReason[analysis.adjustment.reason].toLowerCase()}){analysis.adjustment.note ? `: ${analysis.adjustment.note}` : ''}</p>{/if}
      <div class="row between total"><span class="muted">Balanço</span><b class="num" class:pos={analysis.balance >= 0} class:neg={analysis.balance < 0}>{money(analysis.balance)}</b></div>
      {#if analysis.adjustment?.closing != null}<div class="row between left"><span class="muted small">Sobrou nas contas no fim do mês</span><b class="num">{money(analysis.adjustment.closing)}</b></div>{/if}
    </div>
    <div class="slide">
      <BarChart {labels} current={5} height={190} title="Entradas e saídas por mês"
        series={[{ id: 'in', name: 'Entradas', color: seriesColor.income, values: per.map((p) => p.incomeTotal) }, { id: 'out', name: 'Saídas', color: seriesColor.credit, values: per.map((p) => p.expenseTotal) }]}
        reference={average ? { value: average, label: `média das saídas ${money(average, { cents: false })}` } : null} />
    </div>
    <div class="slide">
      <LineChart {labels} height={190} title="Saldo nas contas no fim de cada mês" series={[{ id: 'bal', name: 'Saldo', color: '#2bd4a4', values: balances }]} />
      <p class="caption note">Saldo das contas, caixinha e dinheiro no fim de cada mês.</p>
    </div>
  </div>
  <div class="dots" role="tablist" aria-label="Visão">{#each titles as t, i (t)}<button role="tab" aria-selected={slide === i} aria-label={t} class:on={slide === i} onclick={() => goTo(i)}></button>{/each}</div>
</section>
<AdjustSheet bind:open={adjustOpen} {month} {analysis} />

<style>
  .slides { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; margin: 0 -18px; }
  .slides::-webkit-scrollbar { display: none; }
  .slide { flex: 0 0 100%; scroll-snap-align: start; padding: 0 18px; min-width: 0; }
  .dots { display: flex; justify-content: center; gap: 8px; margin-top: 14px; }
  .dots button { width: 8px; height: 8px; border-radius: 50%; border: 0; padding: 0; background: rgba(255, 255, 255, 0.22); transition: width 0.25s var(--ease), background 0.2s; }
  .dots button.on { width: 22px; border-radius: 4px; background: var(--accent); }
  .adj { height: 30px; padding: 0 10px; font-size: 13px; }
  .adjnote { margin: 10px 0 0; }
  /* O carrossel tem a altura do slide mais alto: no do mês, a sobra vai em volta da rosca, não embaixo do balanço. */
  .slide:first-child { display: flex; flex-direction: column; }
  .month { flex: 1; display: flex; align-items: center; gap: 18px; }
  .legend { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; font-size: 15px; }
  .line { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .line b { font-size: 16px; white-space: nowrap; }
  i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; flex: none; }
  .more { display: inline-flex; align-items: center; gap: 3px; color: var(--accent); font-weight: 600; font-size: 13.5px; }
  .stale { display: flex; align-items: center; gap: 10px; width: 100%; margin-top: 12px; padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(57, 135, 229, 0.35); background: rgba(57, 135, 229, 0.1); color: #8fc0ff; font-size: 13.5px; text-align: left; }
  .stale b { color: var(--text); }
  .total { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--stroke-strong); }
  .total b { font: 600 22px var(--font-display); }
  .note { margin: 8px 0 0; }
  .left { margin-top: 6px; }
</style>
