<script lang="ts">
  import { money, percent } from '$lib/core/money';
  import { addMonths, monthOf, monthTitle, shortMonth, today, type Month } from '$lib/core/dates';
  import type { Account, Entry } from '$lib/data/types';
  import AdjustSheet from './AdjustSheet.svelte';
  import Donut from '$lib/ui/Donut.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import Tally from '$lib/ui/Tally.svelte';
  import Carousel from '$lib/ui/Carousel.svelte';
  import BarChart from '$lib/ui/charts/BarChart.svelte';
  import LineChart from '$lib/ui/charts/LineChart.svelte';
  import { seriesColor } from '$lib/ui/charts/scale';
  import { ui } from '$lib/ui/ui.svelte';
  import { adjustmentReason, analyzeMonth, expectedIncome, forecastMonth, monthEndTotal, type MonthAnalysis } from '$lib/features/analytics';

  /**
   * Panorama em três cartões do mesmo tamanho, lado a lado (arraste ou bolinhas):
   * o mês (entradas × saídas e balanço; nos meses futuros, a previsão), os últimos 6 meses e o saldo nas contas.
   */
  let { month, analysis, entries, accounts, stale = [] }: { month: Month; analysis: MonthAnalysis; entries: Entry[]; accounts: Account[]; stale?: string[] } = $props();
  let shown = $state(0);
  let adjustOpen = $state(false);
  const name = $derived(monthTitle(month).split(' ')[0].toLowerCase());
  const future = $derived(month > monthOf(today()));
  // Mês futuro: entra a média recente, sai o que já está comprometido (faturas e contas fixas).
  const view = $derived.by(() => {
    if (!future) return { income: analysis.incomeTotal, expense: analysis.expenseTotal };
    return { income: expectedIncome(entries, accounts), expense: forecastMonth(month, accounts).total };
  });
  const balance = $derived(view.income - view.expense);
  const spent = $derived(view.income ? view.expense / view.income : 0);
  const months = $derived(Array.from({ length: 6 }, (_, i) => addMonths(future ? monthOf(today()) : month, i - 5)));
  const labels = $derived(months.map((m) => shortMonth(m).slice(0, 3)));
  const per = $derived(months.map((m) => analyzeMonth(m, entries, accounts)));
  const past = $derived(per.slice(0, -1).map((p) => p.expenseTotal).filter((v) => v > 0));
  const average = $derived(past.length ? Math.round(past.reduce((a, b) => a + b, 0) / past.length) : null);
  const balances = $derived(months.map((m) => monthEndTotal(m, accounts)));
  const titles = $derived([future ? `Previsão de ${name}` : `Panorama de ${name}`, 'Entradas × saídas', 'Saldo nas contas']);
</script>

<Carousel count={3} bind:index={shown} labels={titles}>
  {#snippet slide(i)}
    <section class="card panel">
      {#if i === 0}
        <div class="card-head"><h3>{titles[0]}</h3>{#if !future}<button class="btn adj" onclick={() => (adjustOpen = true)}><Icon name="pencil" size={13} />Ajustar</button>{:else}<span class="pill soon">previsão</span>{/if}</div>
        <div class="month">
          <Donut size={112} thickness={0.3} center={view.income ? percent(spent) : '—'} caption={future ? 'vai sair' : 'gasto'}
            slices={[{ id: 'in', label: 'Sobra', value: Math.max(0, view.income - view.expense), color: seriesColor.income }, { id: 'out', label: 'Saídas', value: view.expense, color: seriesColor.credit }]} />
          <div class="legend">
            <div class="line"><span class="key"><i style:background={seriesColor.income}></i>{future ? 'Deve entrar' : 'Entradas'}</span><b class="pos"><Tally cents={view.income} /></b></div>
            <div class="line"><span class="key"><i style:background={seriesColor.credit}></i>{future ? 'Já comprometido' : 'Saídas'}</span><b><Tally cents={view.expense} /></b></div>
            <a class="more" href="#/transacoes">{future ? 'Ver o que vence' : 'Ver lançamentos'} <Icon name="chevron-right" size={13} /></a>
          </div>
        </div>
        {#if stale.length}<button class="stale" onclick={() => ui.startImport()}><Icon name="import" size={15} /><span class="grow">Extrato só {stale.join(', ')}. Importe o de {name} para ver as entradas.</span><b>Importar</b></button>{/if}
        {#if analysis.adjustment && !future}<p class="caption adjnote">Inclui ajuste ({adjustmentReason[analysis.adjustment.reason].toLowerCase()}){analysis.adjustment.note ? `: ${analysis.adjustment.note}` : ''}</p>{/if}
        <div class="total">
          <div class="row between"><span class="muted">{future ? 'Deve sobrar' : 'Balanço'}</span><b class:pos={balance >= 0} class:neg={balance < 0}><Tally cents={balance} /></b></div>
          {#if future}<p class="caption faint">Entrada pela média dos últimos meses; saídas: faturas e contas fixas que já se sabe.</p>{/if}
          {#if analysis.adjustment?.closing != null && !future}<div class="row between left"><span class="muted small">Sobrou nas contas no fim do mês</span><b class="small"><Tally cents={analysis.adjustment.closing} /></b></div>{/if}
        </div>
      {:else if i === 1}
        <div class="card-head"><h3>{titles[1]}</h3><span class="caption">últimos 6 meses</span></div>
        <div class="chart"><BarChart {labels} current={5} height={180} title="Entradas e saídas por mês"
          series={[{ id: 'in', name: 'Entradas', color: seriesColor.income, values: per.map((p) => p.incomeTotal) }, { id: 'out', name: 'Saídas', color: seriesColor.credit, values: per.map((p) => p.expenseTotal) }]}
          reference={average ? { value: average, label: `média das saídas ${money(average, { cents: false })}` } : null} /></div>
      {:else}
        <div class="card-head"><h3>{titles[2]}</h3><span class="caption">fim de cada mês</span></div>
        <div class="chart"><LineChart {labels} height={180} title="Saldo nas contas no fim de cada mês" series={[{ id: 'bal', name: 'Saldo', color: '#2bd4a4', values: balances }]} /></div>
        <p class="caption faint">Contas, caixinhas e dinheiro somados.</p>
      {/if}
    </section>
  {/snippet}
</Carousel>
<AdjustSheet bind:open={adjustOpen} {month} {analysis} />

<style>
  .panel { display: flex; flex-direction: column; min-height: 290px; }
  .adj { height: 30px; padding: 0 11px; font-size: 13px; gap: 6px; }
  .soon { color: #8fc0ff; background: rgba(57, 135, 229, 0.14); }
  .adjnote { margin: 10px 0 0; }
  .month { flex: 1; display: flex; align-items: center; gap: 20px; padding: 4px 0; }
  .legend { flex: 1; min-width: 0; max-width: 380px; display: flex; flex-direction: column; gap: 10px; font-size: 15px; }
  .line { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .key { display: flex; align-items: center; gap: 8px; color: var(--text-2); white-space: nowrap; }
  .line b { font-size: 16.5px; font-weight: 600; white-space: nowrap; }
  i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; flex: none; }
  .more { align-self: flex-start; display: inline-flex; align-items: center; gap: 3px; color: var(--accent); font-weight: 600; font-size: 13.5px; transition: gap 0.25s var(--ease); }
  .more:hover { gap: 7px; }
  .stale { display: flex; align-items: center; gap: 10px; width: 100%; margin-top: 12px; padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(57, 135, 229, 0.35); background: rgba(57, 135, 229, 0.1); color: #8fc0ff; font-size: 13.5px; text-align: left; }
  .stale b { color: var(--text); }
  .total { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--stroke-strong); }
  .total > .row b { font: 600 24px var(--font-display); letter-spacing: -0.01em; }
  .total p { margin: 6px 0 0; }
  .left { margin-top: 6px; }
  .chart { flex: 1; display: flex; flex-direction: column; justify-content: center; }
  .panel > p { margin: 8px 0 0; }
</style>
