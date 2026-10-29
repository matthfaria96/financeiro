<script lang="ts">
  import { money } from '$lib/core/money';
  import Donut from '$lib/ui/Donut.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import ChartButton from '$lib/ui/ChartButton.svelte';
  import { seriesColor } from '$lib/ui/charts/scale';
  import type { MonthAnalysis } from '$lib/features/analytics';

  /** Entradas, saídas e balanço do mês, com a rosca. */
  let { analysis, title, onchart, link = '' }: { analysis: MonthAnalysis; title: string; onchart?: () => void; link?: string } = $props();
</script>

<section class="card">
  <div class="card-head"><h3>{title}</h3>{#if onchart}<ChartButton onclick={onchart} detail="Entradas e saídas mês a mês." />{/if}</div>
  <div class="body">
    <Donut size={124} thickness={0.3} center={money(analysis.balance, { cents: false })} caption="Balanço"
      slices={[{ id: 'in', label: 'Entradas', value: analysis.incomeTotal, color: seriesColor.income }, { id: 'out', label: 'Saídas', value: analysis.expenseTotal, color: seriesColor.credit }]} />
    <div class="legend">
      <div class="row between"><span class="row" style="gap: 8px"><i style:background={seriesColor.income}></i>Entradas</span><b class="num pos">{money(analysis.incomeTotal, { cents: false })}</b></div>
      <div class="row between"><span class="row" style="gap: 8px"><i style:background={seriesColor.credit}></i>Saídas</span><b class="num">{money(analysis.expenseTotal, { cents: false })}</b></div>
      <div class="row between sep"><span class="row" style="gap: 8px"><i class="box"></i>Balanço</span><b class="num" class:pos={analysis.balance >= 0} class:neg={analysis.balance < 0}>{money(analysis.balance, { cents: false })}</b></div>
    </div>
  </div>
  {#if link}<a class="more" href={link}>Ver os lançamentos do mês <Icon name="chevron-right" size={13} /></a>{/if}
</section>

<style>
  .body { display: flex; align-items: center; gap: 18px; }
  @media (min-width: 960px) and (max-width: 1300px) { .body { flex-direction: column; align-items: stretch; } .body :global(.donut) { align-self: center; } }
  @media (max-width: 520px) { .body { flex-direction: column; align-items: stretch; } .body :global(.donut) { align-self: center; } }
  .legend { flex: 1; display: flex; flex-direction: column; gap: 12px; font-size: 15px; }
  .legend b { font-size: 16px; white-space: nowrap; }
  .legend > div { gap: 10px; }
  .sep { padding-top: 12px; border-top: 1px solid var(--stroke); }
  i { width: 11px; height: 11px; border-radius: 3px; display: inline-block; }
  i.box { border: 1.5px solid var(--text-2); }
  .more { display: inline-flex; align-items: center; gap: 3px; margin-top: 14px; color: var(--accent); font-weight: 600; font-size: 14px; }
</style>
