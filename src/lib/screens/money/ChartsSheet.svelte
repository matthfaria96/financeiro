<script lang="ts">
  import { addMonths, lastDay, monthOf, shortMonth, today, type Month } from '$lib/core/dates';
  import { money } from '$lib/core/money';
  import { store } from '$lib/data/store.svelte';
  import type { Account, Entry } from '$lib/data/types';
  import Sheet from '$lib/ui/Sheet.svelte';
  import Donut from '$lib/ui/Donut.svelte';
  import BarChart from '$lib/ui/charts/BarChart.svelte';
  import LineChart from '$lib/ui/charts/LineChart.svelte';
  import { seriesColor } from '$lib/ui/charts/scale';
  import { analyzeMonth } from '$lib/features/analytics';
  import { balanceOf } from '$lib/features/model';

  /** Análise aberta pelos mini botões: saldo no tempo, entradas × saídas por mês e saídas por categoria. */
  let { open = $bindable(), focus = 'flow', month = monthOf(today()), entries, accounts }: {
    open: boolean; focus?: 'balance' | 'flow' | 'categories'; month?: Month; entries: Entry[]; accounts: Account[];
  } = $props();
  const months = $derived(Array.from({ length: 12 }, (_, i) => addMonths(month, i - 11)));
  const labels = $derived(months.map((m) => shortMonth(m).slice(0, 3)));
  const per = $derived(open ? months.map((m) => analyzeMonth(m, entries, accounts)) : []);
  const now = today();
  const balances = $derived(open ? months.map((m) => accounts.filter((a) => a.kind !== 'creditCard' && !a.archived).reduce((s, a) => s + balanceOf(a, lastDay(m) < now ? lastDay(m) : now), 0)) : []);
  const current = $derived(per.at(-1));
</script>

<Sheet bind:open title="Análise" wide>
  <div class="stack" style="padding-top: 10px">
    {#if focus === 'balance'}
      <section class="card"><div class="card-head"><h3>Saldo nas contas</h3><span class="sub">no fim de cada mês</span></div>
        <LineChart {labels} series={[{ id: 'bal', name: 'Saldo', color: '#2bd4a4', values: balances }]} height={220} title="Saldo no fim de cada mês" /></section>
    {/if}
    <section class="card"><div class="card-head"><h3>Entradas × saídas</h3><a class="sub link" href="#/relatorios/planilha" onclick={() => (open = false)}>Mês a mês em tabela</a></div>
      <BarChart {labels} current={11} height={220} title="Entradas e saídas por mês"
        series={[{ id: 'in', name: 'Entradas', color: seriesColor.income, values: per.map((p) => p.incomeTotal) }, { id: 'out', name: 'Saídas', color: seriesColor.credit, values: per.map((p) => p.expenseTotal) }]} /></section>
    {#if current && current.expenses.length}
      <section class="card"><div class="card-head"><h3>Saídas por categoria</h3><span class="sub">{shortMonth(month)}</span></div>
        <div class="split">
          <Donut size={190} center={money(current.expenseTotal, { cents: false })} caption="Saídas" slices={current.expenses.slice(0, 7).map((g) => ({ id: g.key, label: g.label, value: g.cents, color: g.color }))} />
          <div class="legend">{#each current.expenses.slice(0, 8) as g (g.key)}<div class="row between small"><span class="row" style="gap: 8px"><i style:background={g.color}></i>{g.label}</span><span class="num">{money(g.cents, { cents: false })}</span></div>{/each}</div>
        </div>
      </section>
    {/if}
    {#if focus !== 'balance'}
      <section class="card"><div class="card-head"><h3>Saldo nas contas</h3><span class="sub">no fim de cada mês</span></div>
        <LineChart {labels} series={[{ id: 'bal', name: 'Saldo', color: '#2bd4a4', values: balances }]} height={180} title="Saldo no fim de cada mês" /></section>
    {/if}
  </div>
</Sheet>

<style>
  .link { color: var(--accent); font-weight: 600; }
  .split { display: flex; gap: 24px; align-items: center; flex-wrap: wrap; }
  .legend { flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: 8px; }
  i { width: 9px; height: 9px; border-radius: 3px; display: inline-block; }
</style>
