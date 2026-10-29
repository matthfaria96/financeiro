<script lang="ts">
  import { goto } from '$app/navigation';
  import { addMonths, monthOf, shortMonth, today, type Month } from '$lib/core/dates';
  import { money, percent } from '$lib/core/money';
  import { store } from '$lib/data/store.svelte';
  import type { Account, Entry } from '$lib/data/types';
  import { ui } from '$lib/ui/ui.svelte';
  import Sheet from '$lib/ui/Sheet.svelte';
  import Segmented from '$lib/ui/Segmented.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import BarChart from '$lib/ui/charts/BarChart.svelte';
  import LineChart from '$lib/ui/charts/LineChart.svelte';
  import { seriesColor } from '$lib/ui/charts/scale';
  import BillRow from '$lib/screens/bills/BillRow.svelte';
  import ForecastCard from './ForecastCard.svelte';
  import { analyzeMonth, monthEndTotal, spendMonth } from '$lib/features/analytics';
  import { costOf, kindOf, inScopeBill } from '$lib/features/model';
  import { billInMonth, billStatus } from '$lib/features/bills';

  /** Análise: fixas × variáveis (com as contas fixas), previsão dos próximos meses e entradas × saídas. */
  type Tab = 'cost' | 'forecast' | 'flow';
  let { open = $bindable(), focus = 'cost', month = monthOf(today()), entries, accounts }: {
    open: boolean; focus?: Tab | 'balance' | 'categories'; month?: Month; entries: Entry[]; accounts: Account[];
  } = $props();
  let tab = $state<Tab>('cost');
  $effect(() => {
    if (open) tab = focus === 'forecast' || focus === 'flow' ? focus : 'cost';
  });

  const months = $derived(Array.from({ length: 6 }, (_, i) => addMonths(month, i - 5)));
  const labels = $derived(months.map((m) => shortMonth(m).slice(0, 3)));
  const expensesOf = (m: Month) => entries.filter((e) => !e.is_mirror && spendMonth(e) === m && kindOf(e) === 'expense');
  const sum = (list: Entry[]) => -list.reduce((s, e) => s + e.amount_cents, 0);
  const fixed = $derived(open ? months.map((m) => sum(expensesOf(m).filter((e) => costOf(e) === 'fixed'))) : []);
  const variable = $derived(open ? months.map((m) => sum(expensesOf(m).filter((e) => costOf(e) === 'variable'))) : []);
  const nowFixed = $derived(fixed.at(-1) ?? 0);
  const nowVariable = $derived(variable.at(-1) ?? 0);
  const bills = $derived(store.bills.filter((b) => b.active && inScopeBill(b) && billInMonth(b, month)).toSorted((a, b) => a.day_of_month - b.day_of_month)
    .map((bill) => ({ bill, status: billStatus(bill, month, entries) })));
  const billsTotal = $derived(bills.reduce((s, x) => s + x.bill.amount_cents, 0));

  const months12 = $derived(Array.from({ length: 12 }, (_, i) => addMonths(month, i - 11)));
  const per = $derived(open && tab === 'flow' ? months12.map((m) => analyzeMonth(m, entries, accounts)) : []);
  const balances = $derived(open && tab === 'flow' ? months12.map((m) => monthEndTotal(m, accounts)) : []);

  function manage() {
    open = false;
    void goto('#/contas-fixas');
  }
</script>

<Sheet bind:open title="Análise" wide>
  <div class="stack" style="padding-top: 10px">
    <Segmented label="Análise" bind:value={tab} options={[{ value: 'cost', label: 'Fixas e variáveis' }, { value: 'forecast', label: 'Previsão' }, { value: 'flow', label: 'Entradas × saídas' }]} />

    {#if tab === 'cost'}
      <section class="card split">
        <div><span class="caption row" style="gap: 6px"><i style:background={seriesColor.account}></i>Fixas em {shortMonth(month).slice(0, 3).toLowerCase()}</span><b class="big">{money(nowFixed, { cents: false })}</b>
          <span class="caption">{nowFixed + nowVariable ? percent(nowFixed / (nowFixed + nowVariable)) : '—'} dos gastos</span></div>
        <div><span class="caption row" style="gap: 6px"><i style:background={seriesColor.credit}></i>Variáveis</span><b class="big">{money(nowVariable, { cents: false })}</b>
          <span class="caption">{nowFixed + nowVariable ? percent(nowVariable / (nowFixed + nowVariable)) : '—'} dos gastos</span></div>
      </section>
      <section class="card"><div class="card-head"><h3>Últimos 6 meses</h3><span class="sub">fixas se repetem; variáveis mudam</span></div>
        <BarChart {labels} current={5} height={200} title="Gastos fixos e variáveis por mês"
          series={[{ id: 'fixed', name: 'Fixas', color: seriesColor.account, stack: 'all', values: fixed }, { id: 'variable', name: 'Variáveis', color: seriesColor.credit, stack: 'all', values: variable }]} /></section>
      <section class="card flush">
        <div class="card-head pad"><h3>Contas fixas do mês</h3><b class="num">{money(billsTotal, { cents: false })}</b></div>
        <div class="list">
          {#each bills as { bill, status } (bill.id)}<div class="list-row"><BillRow {bill} {status} /></div>
          {:else}<p class="muted small padded">Nenhuma conta fixa cadastrada.</p>{/each}
        </div>
        <button class="btn block manage" onclick={manage}><Icon name="calendar" size={16} />Gerenciar contas fixas e calendário</button>
      </section>
    {:else if tab === 'forecast'}
      <ForecastCard {accounts} oncalendar={manage} />
    {:else}
      <section class="card"><div class="card-head"><h3>Entradas × saídas</h3><a class="sub link" href="#/relatorios/planilha" onclick={() => (open = false)}>Mês a mês em tabela</a></div>
        <BarChart labels={months12.map((m) => shortMonth(m).slice(0, 3))} current={11} height={220} title="Entradas e saídas por mês"
          series={[{ id: 'in', name: 'Entradas', color: seriesColor.income, values: per.map((p) => p.incomeTotal) }, { id: 'out', name: 'Saídas', color: seriesColor.credit, values: per.map((p) => p.expenseTotal) }]} /></section>
      <section class="card"><div class="card-head"><h3>Saldo nas contas</h3><span class="sub">no fim de cada mês</span></div>
        <LineChart labels={months12.map((m) => shortMonth(m).slice(0, 3))} series={[{ id: 'bal', name: 'Saldo', color: '#2bd4a4', values: balances }]} height={180} title="Saldo no fim de cada mês" /></section>
    {/if}
  </div>
</Sheet>

<style>
  .split { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .split > div { display: flex; flex-direction: column; gap: 3px; }
  .big { font: 600 24px var(--font-display); }
  i { width: 9px; height: 9px; border-radius: 3px; display: inline-block; }
  .pad { padding: 18px 18px 6px; margin: 0; }
  .padded { padding: 12px 18px; margin: 0; }
  .manage { margin: 8px 18px 18px; width: calc(100% - 36px); }
  .link { color: var(--accent); font-weight: 600; }
</style>
