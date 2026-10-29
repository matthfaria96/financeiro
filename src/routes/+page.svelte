<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { ui } from '$lib/ui/ui.svelte';
  import { addMonths, dayHeader, lastDay, monthOf, today } from '$lib/core/dates';
  import { monthReport } from '$lib/core/reports';
  import Icon from '$lib/ui/Icon.svelte';
  import WorkspaceBar from '$lib/ui/WorkspaceBar.svelte';
  import { hint } from '$lib/ui/hint';
  import NetWorthCard from '$lib/screens/home/NetWorthCard.svelte';
  import MonthCard from '$lib/screens/home/MonthCard.svelte';
  import ForecastCard from '$lib/screens/home/ForecastCard.svelte';
  import FlowCard from '$lib/screens/home/FlowCard.svelte';
  import SpendingCard from '$lib/screens/home/SpendingCard.svelte';
  import WalletCard from '$lib/screens/home/WalletCard.svelte';
  import MonthSimple from '$lib/screens/home/MonthSimple.svelte';
  import Welcome from '$lib/screens/home/Welcome.svelte';
  import PendingCard from '$lib/screens/home/PendingCard.svelte';
  import RecentCard from '$lib/screens/home/RecentCard.svelte';
  import { prefs } from '$lib/ui/prefs.svelte';
  import BillRow from '$lib/screens/bills/BillRow.svelte';
  import { balanceOf, categoryOf, inScope, inScopeAccount, inScopeBill, kindOf, rootOf } from '$lib/features/model';
  import { flowHistory, outlook } from '$lib/features/month';
  import { billStatus } from '$lib/features/bills';
  import { matchKey } from '$lib/features/rules';

  const entries = $derived(store.entries.filter(inScope));
  const accounts = $derived(store.accounts.filter((a) => !a.archived && inScopeAccount(a)).toSorted((a, b) => a.sort_order - b.sort_order));
  const bills = $derived(store.bills.filter((b) => b.active && inScopeBill(b)).toSorted((a, b) => a.day_of_month - b.day_of_month));
  const look = $derived(entries.length ? outlook(entries, accounts, bills, store.forecastMonths) : null);
  const month = monthOf(today());

  const spending = $derived.by(() => {
    const items = entries.filter((e) => !e.is_mirror).map((e) => {
      const root = rootOf(categoryOf(e));
      return { date: e.date, amountCents: e.amount_cents, groupId: root ? matchKey(root) : 'outros', kind: kindOf(e) };
    });
    return monthReport(month, items, 'expenses');
  });
  const pendingBills = $derived(bills.map((b) => ({ bill: b, status: billStatus(b, month, entries) })).filter((x) => x.status.type !== 'paid').slice(0, 5));
  const worth = $derived(Array.from({ length: 9 }, (_, i) => addMonths(month, i - 8)).map((m) => ({ month: m, cents: accounts.filter((a) => a.kind !== 'creditCard').reduce((s, a) => s + balanceOf(a, lastDay(m) < today() ? lastDay(m) : today()), 0) })));
  const flows = $derived(flowHistory(6, entries, accounts));
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const me = $derived(store.people.find((p) => p.role === 'me')?.name.replace(/^Eu$/, '') ?? '');
</script>

<div class="page">
  <header class="row between top">
    <div><h1>{greeting}{me ? `, ${me}` : ''}</h1><span class="muted small">{dayHeader(today())}</span></div>
    <div class="row" style="gap: 8px">
      <button class="btn" onclick={() => (ui.newEntryOpen = true)} use:hint={['Novo lançamento', 'Anote um gasto ou entrada à mão.']}><Icon name="plus" size={16} />Lançamento</button>
      <button class="btn primary" onclick={() => ui.startImport()} use:hint={['Importar extrato', 'Escolha a conta e o arquivo do banco. Você confere antes de gravar.']}><Icon name="import" size={16} />Importar</button>
    </div>
  </header>
  <WorkspaceBar />

  {#if !store.accounts.length || !store.entries.length}<Welcome />{/if}

  {#if look && !prefs.full}
    <div class="simple">
      <div class="col">
        <MonthSimple outlook={look} />
        {#if spending.slices.length}<SpendingCard report={spending} />{/if}
      </div>
      <div class="col">
        <PendingCard />
        <RecentCard {entries} />
      </div>
    </div>
  {:else if look}
    <div class="grid-main stretch">
      <NetWorthCard outlook={look} history={worth} />
      <div class="side">
        <MonthCard outlook={look} />
        <ForecastCard outlook={look} months={store.forecastMonths} />
      </div>
    </div>
    <div class="grid-2 stretch">
      <FlowCard history={flows} />
      {#if spending.slices.length}<SpendingCard report={spending} />{/if}
    </div>
  {/if}

  {#if accounts.length && prefs.full}
    <div class="grid-main">
      <WalletCard {accounts} />
      {#if pendingBills.length}
        <section class="card">
          <div class="card-head"><h3>Próximas contas fixas</h3><a class="sub link" href="#/contas-fixas">Calendário</a></div>
          <div class="stack">{#each pendingBills as item (item.bill.id)}<BillRow bill={item.bill} status={item.status} />{/each}</div>
        </section>
      {/if}
    </div>
  {/if}
</div>

<style>
  .top h1 { margin: 6px 4px 2px; font: 700 30px var(--font-display); letter-spacing: -0.02em; }
  .top .small { margin-left: 4px; }
  .side { display: flex; flex-direction: column; gap: 16px; }
  .simple { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); align-items: start; }
  .col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
  @media (min-width: 1000px) { .simple { grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); } }
  .link { color: var(--accent); font-weight: 600; }
</style>
