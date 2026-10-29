<script lang="ts">
  import { money, percent } from '$lib/core/money';
  import { addMonths, lastDay, monthTitle, shortMonth, today, type Month } from '$lib/core/dates';
  import type { Account, Entry } from '$lib/data/types';
  import Segmented from '$lib/ui/Segmented.svelte';
  import Donut from '$lib/ui/Donut.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import BarChart from '$lib/ui/charts/BarChart.svelte';
  import LineChart from '$lib/ui/charts/LineChart.svelte';
  import { seriesColor } from '$lib/ui/charts/scale';
  import { ui } from '$lib/ui/ui.svelte';
  import { analyzeMonth, type MonthAnalysis } from '$lib/features/analytics';
  import { balanceOf } from '$lib/features/model';

  /** Panorama mensal: o mês (entradas × saídas), os últimos 6 meses lado a lado e o saldo na conta no tempo. */
  let { month, analysis, entries, accounts, stale = [] }: { month: Month; analysis: MonthAnalysis; entries: Entry[]; accounts: Account[]; stale?: string[] } = $props();
  let view = $state<'month' | 'months' | 'balance'>('month');
  const months = $derived(Array.from({ length: 6 }, (_, i) => addMonths(month, i - 5)));
  const labels = $derived(months.map((m) => shortMonth(m).slice(0, 3)));
  const per = $derived(view === 'months' ? months.map((m) => analyzeMonth(m, entries, accounts)) : []);
  const past = $derived(per.slice(0, -1).map((p) => p.expenseTotal).filter((v) => v > 0));
  const average = $derived(past.length ? Math.round(past.reduce((a, b) => a + b, 0) / past.length) : null);
  const now = today();
  const balances = $derived(view === 'balance' ? months.map((m) => accounts.filter((a) => a.kind !== 'creditCard' && !a.archived).reduce((s, a) => s + balanceOf(a, lastDay(m) < now ? lastDay(m) : now), 0)) : []);
  const spent = $derived(analysis.incomeTotal ? analysis.expenseTotal / analysis.incomeTotal : 0);
</script>

<section class="card">
  <div class="card-head"><h3>Panorama mensal</h3></div>
  <Segmented label="Visão" bind:value={view} options={[{ value: 'month', label: shortMonth(month).slice(0, 3) }, { value: 'months', label: 'Entradas × saídas' }, { value: 'balance', label: 'Saldo' }]} />
  <div class="body">
    {#if view === 'month'}
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
      <div class="row between total"><span class="muted">Balanço</span><b class="num" class:pos={analysis.balance >= 0} class:neg={analysis.balance < 0}>{money(analysis.balance)}</b></div>
    {:else if view === 'months'}
      <BarChart {labels} current={5} height={190} title="Entradas e saídas por mês"
        series={[{ id: 'in', name: 'Entradas', color: seriesColor.income, values: per.map((p) => p.incomeTotal) }, { id: 'out', name: 'Saídas', color: seriesColor.credit, values: per.map((p) => p.expenseTotal) }]}
        reference={average ? { value: average, label: `média das saídas ${money(average, { cents: false })}` } : null} />
    {:else}
      <LineChart {labels} height={190} title="Saldo nas contas no fim de cada mês" series={[{ id: 'bal', name: 'Saldo', color: '#2bd4a4', values: balances }]} />
      <p class="caption note">Saldo das contas, caixinha e dinheiro no fim de cada mês.</p>
    {/if}
  </div>
</section>

<style>
  .body { margin-top: 14px; }
  .month { display: flex; align-items: center; gap: 18px; }
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
</style>
