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
  import BillRow from '$lib/screens/bills/BillRow.svelte';
  import ExportGuide from '$lib/screens/import/ExportGuide.svelte';
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

  {#if !store.accounts.length || !store.entries.length}
    <section class="card stack welcome rise">
      <h2>Vamos começar</h2>
      <p class="muted">O Financeiro lê os extratos do banco, separa por categoria e monta os relatórios e gráficos sozinho.</p>
      <div class="step"><span class="n" class:done={store.accounts.length > 0}>{#if store.accounts.length}<Icon name="check" size={15} stroke={3} />{:else}1{/if}</span>
        <div class="grow"><b>Cadastre suas contas</b><p class="muted small">Cada conta e cartão (seus, da esposa, da casa), com o banco e de quem é.</p>
          {#if !store.accounts.length}<button class="btn primary" onclick={() => (ui.newAccountOpen = true)}>Cadastrar conta</button>{/if}</div></div>
      <div class="step"><span class="n">2</span>
        <div class="grow"><b>Importe o extrato de cada uma</b><p class="muted small">No app do banco, exporte o extrato ou a fatura e escolha a conta aqui — ou arraste o arquivo para esta janela.</p>
          <button class="btn" disabled={!store.accounts.length} onclick={() => ui.startImport()}>Importar extrato</button></div></div>
      <details><summary class="muted small">Qual arquivo exportar de cada banco</summary><ExportGuide /></details>
    </section>
  {/if}

  {#if look}
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

  {#if accounts.length}
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
  .welcome h2 { margin: 0; font: 700 22px var(--font-display); }
  .welcome p { margin: 0; }
  .step { display: flex; gap: 14px; align-items: flex-start; }
  .step p { margin: 4px 0 8px; }
  .n { width: 30px; height: 30px; border-radius: 50%; flex: none; display: grid; place-items: center; font-weight: 700; background: rgba(255, 255, 255, 0.08); }
  .n.done { background: var(--accent); color: #04140e; }
  details summary { cursor: pointer; margin-bottom: 10px; }
  .link { color: var(--accent); font-weight: 600; }
</style>
