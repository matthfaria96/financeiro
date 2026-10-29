<script lang="ts">
  import { money, percent } from '$lib/core/money';
  import Donut from '$lib/ui/Donut.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import ChartButton from '$lib/ui/ChartButton.svelte';
  import { seriesColor } from '$lib/ui/charts/scale';
  import type { MonthAnalysis } from '$lib/features/analytics';

  /** Entradas e saídas do mês: rosca à esquerda, valores à direita, balanço no rodapé (como o total do Saldo). */
  let { analysis, title, onchart, link = '' }: { analysis: MonthAnalysis; title: string; onchart?: () => void; link?: string } = $props();
  const spentShare = $derived(analysis.incomeTotal ? analysis.expenseTotal / analysis.incomeTotal : 0);
</script>

<section class="card">
  <div class="card-head"><h3>{title}</h3>{#if onchart}<ChartButton onclick={onchart} detail="Entradas e saídas mês a mês." />{/if}</div>
  <div class="body">
    <Donut size={104} thickness={0.32} center={analysis.incomeTotal ? percent(spentShare) : '—'} caption="gasto"
      slices={[{ id: 'in', label: 'Entradas', value: Math.max(0, analysis.incomeTotal - analysis.expenseTotal), color: seriesColor.income }, { id: 'out', label: 'Saídas', value: analysis.expenseTotal, color: seriesColor.credit }]} />
    <div class="legend">
      <div class="line"><span class="row" style="gap: 8px"><i style:background={seriesColor.income}></i>Entradas</span><b class="num pos">{money(analysis.incomeTotal)}</b></div>
      <div class="line"><span class="row" style="gap: 8px"><i style:background={seriesColor.credit}></i>Saídas</span><b class="num">{money(analysis.expenseTotal)}</b></div>
      {#if link}<a class="more" href={link}>Ver lançamentos <Icon name="chevron-right" size={13} /></a>{/if}
    </div>
  </div>
  <div class="row between total"><span class="muted">Balanço</span><b class="num" class:pos={analysis.balance >= 0} class:neg={analysis.balance < 0}>{money(analysis.balance)}</b></div>
</section>

<style>
  .body { display: flex; align-items: center; gap: 18px; }
  .legend { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; font-size: 15px; }
  .line { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .line b { font-size: 16px; white-space: nowrap; }
  i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; flex: none; }
  .more { display: inline-flex; align-items: center; gap: 3px; color: var(--accent); font-weight: 600; font-size: 13.5px; }
  .total { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--stroke-strong); }
  .total b { font: 600 22px var(--font-display); }
</style>
