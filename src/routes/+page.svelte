<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { ui } from '$lib/ui/ui.svelte';
  import { money } from '$lib/core/money';
  import { addMonths, lastDay, monthOf, today } from '$lib/core/dates';
  import { monthReport } from '$lib/core/reports';
  import Icon from '$lib/ui/Icon.svelte';
  import SectionTitle from '$lib/ui/SectionTitle.svelte';
  import WorkspaceBar from '$lib/ui/WorkspaceBar.svelte';
  import ChangeBadge from '$lib/ui/ChangeBadge.svelte';
  import Donut from '$lib/ui/Donut.svelte';
  import AreaChart from '$lib/ui/AreaChart.svelte';
  import { hint } from '$lib/ui/hint';
  import OutlookCards from '$lib/screens/home/OutlookCards.svelte';
  import AccountRow from '$lib/screens/accounts/AccountRow.svelte';
  import AccountEditor from '$lib/screens/accounts/AccountEditor.svelte';
  import BillRow from '$lib/screens/bills/BillRow.svelte';
  import ExportGuide from '$lib/screens/import/ExportGuide.svelte';
  import { balanceOf, categoryOf, inScope, inScopeAccount, inScopeBill, kindOf, rootOf } from '$lib/features/model';
  import { outlook } from '$lib/features/month';
  import { billStatus } from '$lib/features/bills';
  import { matchKey } from '$lib/features/rules';

  const entries = $derived(store.entries.filter(inScope));
  const accounts = $derived(store.accounts.filter((a) => !a.archived && inScopeAccount(a)).toSorted((a, b) => a.sort_order - b.sort_order));
  const bills = $derived(store.bills.filter((b) => b.active && inScopeBill(b)).toSorted((a, b) => a.day_of_month - b.day_of_month));
  const look = $derived(entries.length ? outlook(entries, accounts, bills, store.forecastMonths) : null);
  const month = monthOf(today());

  const groups = $derived([
    { title: 'Contas e dinheiro', icon: 'bank', note: 'disponível', items: accounts.filter((a) => a.kind === 'checking' || a.kind === 'cash'), card: false },
    { title: 'Investimentos', icon: 'invest', note: 'investido', items: accounts.filter((a) => a.kind === 'savings'), card: false },
    { title: 'Cartões', icon: 'card', note: 'em aberto', items: accounts.filter((a) => a.kind === 'creditCard'), card: true }
  ].filter((g) => g.items.length));

  const spending = $derived.by(() => {
    const items = entries.filter((e) => !e.is_mirror).map((e) => {
      const root = rootOf(categoryOf(e));
      return { date: e.date, amountCents: e.amount_cents, groupId: root ? matchKey(root) : 'outros', kind: kindOf(e) };
    });
    return monthReport(month, items, 'expenses');
  });
  const pendingBills = $derived(bills.map((b) => ({ bill: b, status: billStatus(b, month, entries) })).filter((x) => x.status.type !== 'paid').slice(0, 4));
  const history = $derived(Array.from({ length: 9 }, (_, i) => addMonths(month, i - 8)).map((m) => ({ month: m, cents: accounts.reduce((s, a) => s + balanceOf(a, lastDay(m) < today() ? lastDay(m) : today()), 0) })));

</script>

<div class="page">
  <header class="row between top">
    <h1>Início</h1>
    <button class="icon-btn" onclick={() => ui.startImport()} use:hint={['Importar extrato', 'Escolha a conta e o arquivo do banco. Você confere antes de gravar.']} aria-label="Importar extrato"><Icon name="import" /></button>
  </header>
  <WorkspaceBar />

  {#if !store.accounts.length || !store.entries.length}
    <section class="card stack welcome rise">
      <h2>Vamos começar</h2>
      <p class="muted">O Financeiro lê os extratos do banco, separa por categoria e monta os relatórios sozinho.</p>
      <div class="step"><span class="n" class:done={store.accounts.length > 0}>{#if store.accounts.length}<Icon name="check" size={15} stroke={3} />{:else}1{/if}</span>
        <div class="grow"><b>Cadastre suas contas</b><p class="muted small">Cada conta e cartão (seus, da esposa, da casa), com o banco e de quem é.</p>
          {#if !store.accounts.length}<button class="btn primary" onclick={() => (ui.newAccountOpen = true)}>Cadastrar conta</button>{/if}</div></div>
      <div class="step"><span class="n">2</span>
        <div class="grow"><b>Importe o extrato de cada uma</b><p class="muted small">No app do banco, exporte o extrato ou a fatura e escolha a conta aqui.</p>
          <button class="btn" disabled={!store.accounts.length} onclick={() => ui.startImport()}>Importar extrato</button></div></div>
      <details><summary class="muted small">Qual arquivo exportar de cada banco</summary><ExportGuide /></details>
    </section>
  {/if}

  {#if look}<OutlookCards outlook={look} months={store.forecastMonths} />{/if}

  {#if store.accounts.length}
    <SectionTitle title="Contas e cartões">
      <button class="btn ghost" onclick={() => (ui.newAccountOpen = true)} use:hint={['Cadastrar conta', 'Qualquer banco: conta, cartão, investimento ou dinheiro.']}><Icon name="plus" size={16} />Cadastrar</button>
    </SectionTitle>
    {#each groups as group (group.title)}
      {@const total = group.card ? group.items.reduce((s, a) => s + Math.max(0, -balanceOf(a)), 0) : group.items.reduce((s, a) => s + balanceOf(a), 0)}
      <div class="row between group-head"><span class="row small muted" style="gap: 6px"><Icon name={group.icon} size={14} />{group.title}</span><span class="small muted num">{money(total)} {group.note}</span></div>
      {#each group.items as account (account.id)}<AccountRow {account} />{/each}
    {/each}
  {/if}

  {#if spending.slices.length}
    <SectionTitle title="Para onde foi este mês"><ChangeBadge change={spending.change} /></SectionTitle>
    <a class="card stack where" href="#/relatorios" use:hint={['Para onde foi', 'Consumo do mês pela data da compra, inclusive no cartão. Abre os relatórios.']}>
      <div class="row" style="align-items: baseline; gap: 8px"><span class="value-lg">{money(spending.totalCents, { cents: false })}</span><span class="muted small grow">em compras e contas</span><Icon name="chevron-right" size={16} class="faint" /></div>
      <div class="row" style="gap: 18px; align-items: center">
        <Donut size={120} labels={false} slices={spending.slices.map((s) => ({ id: s.groupId, value: s.totalCents, color: store.categoryByKey.get(s.groupId)?.color ?? '#78909C' }))} />
        <div class="grow stack-sm">
          {#each spending.slices.slice(0, 5) as slice (slice.groupId)}
            {@const category = store.categoryByKey.get(slice.groupId)}
            <div class="row between small"><span class="row ellipsis" style="gap: 8px"><span style:color={category?.color}><Icon name={category?.symbol ?? 'tag'} size={15} /></span>{category?.name ?? 'Outros'}</span><span class="num">{money(slice.totalCents, { cents: false })}</span></div>
          {/each}
        </div>
      </div>
      <span class="caption">Pode ser diferente do "já saiu", que é o que saiu da conta.</span>
    </a>
  {/if}

  {#if pendingBills.length}
    <SectionTitle title="Próximas contas fixas" />
    <a class="card stack" href="#/contas-fixas">
      {#each pendingBills as item (item.bill.id)}<BillRow bill={item.bill} status={item.status} />{/each}
    </a>
  {/if}

  {#if entries.length}
    <SectionTitle title="Patrimônio" />
    <section class="card"><div class="label" style="margin-bottom: 6px">Evolução nos últimos meses</div><AreaChart points={history} /></section>
  {/if}
</div>

<AccountEditor bind:open={ui.newAccountOpen} />

<style>
  .top h1 { margin: 6px 4px; font: 700 30px var(--font-display); letter-spacing: -0.02em; }
  .welcome h2 { margin: 0; font: 700 22px var(--font-display); }
  .welcome p { margin: 0; }
  .step { display: flex; gap: 14px; align-items: flex-start; }
  .step p { margin: 4px 0 8px; }
  .n { width: 30px; height: 30px; border-radius: 50%; flex: none; display: grid; place-items: center; font-weight: 700; background: rgba(255, 255, 255, 0.08); }
  .n.done { background: var(--accent); color: #04140e; }
  details summary { cursor: pointer; margin-bottom: 10px; }
  .group-head { padding: 6px 4px 0; }
  .where { transition: background 0.2s; }
  .where:hover { background: rgba(26, 34, 31, 0.95); }
</style>
