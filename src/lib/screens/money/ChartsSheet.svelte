<script lang="ts">
  import { goto } from '$app/navigation';
  import { addMonths, monthOf, shortMonth, today, type Month } from '$lib/core/dates';
  import type { Account, Entry } from '$lib/data/types';
  import Sheet from '$lib/ui/Sheet.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import BarChart from '$lib/ui/charts/BarChart.svelte';
  import LineChart from '$lib/ui/charts/LineChart.svelte';
  import { seriesColor } from '$lib/ui/charts/scale';
  import { analyzeMonth, monthEndTotal } from '$lib/features/analytics';

  /** Análise: entradas × saídas e o saldo nos últimos 12 meses. Fixas, variáveis e sazonais ficam na Previsão do Início. */
  let { open = $bindable(), month = monthOf(today()), entries, accounts }: { open: boolean; month?: Month; entries: Entry[]; accounts: Account[] } = $props();
  const months12 = $derived(Array.from({ length: 12 }, (_, i) => addMonths(month, i - 11)));
  const per = $derived(open ? months12.map((m) => analyzeMonth(m, entries, accounts)) : []);
  const balances = $derived(open ? months12.map((m) => monthEndTotal(m, accounts)) : []);

  function toForecast() {
    open = false;
    void goto('#/previsao');
  }
</script>

<Sheet bind:open title="Análise" wide>
  <div class="stack" style="padding-top: 10px">
    <section class="card"><div class="card-head"><h3>Entradas × saídas</h3><a class="sub link" href="#/relatorios/planilha" onclick={() => (open = false)}>Mês a mês em tabela</a></div>
      <BarChart labels={months12.map((m) => shortMonth(m).slice(0, 3))} current={11} height={220} title="Entradas e saídas por mês"
        series={[{ id: 'in', name: 'Entradas', color: seriesColor.income, values: per.map((p) => p.incomeTotal) }, { id: 'out', name: 'Saídas', color: seriesColor.credit, values: per.map((p) => p.expenseTotal) }]} /></section>
    <section class="card"><div class="card-head"><h3>Saldo nas contas</h3><span class="sub">no fim de cada mês</span></div>
      <LineChart labels={months12.map((m) => shortMonth(m).slice(0, 3))} series={[{ id: 'bal', name: 'Saldo', color: '#2bd4a4', values: balances }]} height={180} title="Saldo no fim de cada mês" /></section>
    <button class="card row link-card" onclick={toForecast}><Icon name="calendar" size={18} /><span class="grow"><b>Fixas, variáveis e sazonais</b><span class="caption block">A previsão dos próximos meses, no Início.</span></span><Icon name="chevron-right" size={15} class="faint" /></button>
  </div>
</Sheet>

<style>
  .link { color: var(--accent); font-weight: 600; }
  .link-card { width: 100%; text-align: left; color: inherit; gap: 12px; }
  .link-card :global(svg:first-child) { color: var(--accent); }
  .block { display: block; margin-top: 2px; }
</style>
