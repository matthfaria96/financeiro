<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { ui } from '$lib/ui/ui.svelte';
  import { addDays, lastDay, monthOf, shortDate, today, dayMonth } from '$lib/core/dates';
  import { money } from '$lib/core/money';
  import Icon from '$lib/ui/Icon.svelte';
  import { hint } from '$lib/ui/hint';
  import Avatar from '$lib/ui/Avatar.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import WorkspaceBar from '$lib/ui/WorkspaceBar.svelte';
  import SectionTitle from '$lib/ui/SectionTitle.svelte';
  import BillRow from '$lib/screens/bills/BillRow.svelte';
  import BarChart from '$lib/ui/charts/BarChart.svelte';
  import { bankColor } from '$lib/ui/look';
  import { shortMonth } from '$lib/core/dates';
  import { payableGroups, pendingThisMonth, type PayableGroup } from '$lib/features/payables';
  import { isBillPaid } from '$lib/features/month';
  import { billStatus } from '$lib/features/bills';
  import { accountOf, categoryOf, inScope, inScopeAccount, inScopeBill } from '$lib/features/model';
  import BillEditor from '$lib/screens/bills/BillEditor.svelte';
  import { prefs } from '$lib/ui/prefs.svelte';
  import { monthTitle } from '$lib/core/dates';
  import type { Bill } from '$lib/data/types';

  const month = monthOf(today());
  const now = today();
  const groups = $derived(payableGroups(store.accounts.filter((a) => a.kind === 'creditCard' && inScopeAccount(a))));
  const thisMonth = $derived(groups.filter((g) => monthOf(g.due) === month));
  const upcoming = $derived(groups.filter((g) => g.due > lastDay(month)));
  const cash = $derived(store.entries.filter((e) => inScope(e) && ['checking', 'cash'].includes(accountOf(e)?.kind ?? '')));
  const bills = $derived(store.bills.filter((b) => b.active && inScopeBill(b)).toSorted((a, b) => a.day_of_month - b.day_of_month));
  // Faturas por mês de vencimento, empilhadas por cartão (cada cartão na cor do banco).
  const chart = $derived.by(() => {
    const months = [...new Set(groups.map((g) => monthOf(g.due)))].sort().filter((m) => m >= month).slice(0, 8);
    const cards = [...new Map(groups.map((g) => [g.account.id, g.account])).values()];
    return {
      labels: months.map((m) => shortMonth(m).slice(0, 3)),
      series: cards.map((card) => ({ id: card.id, name: card.name, color: bankColor(card), stack: 'faturas',
        values: months.map((m) => groups.filter((g) => g.account.id === card.id && monthOf(g.due) === m).reduce((s, g) => s + g.imported + g.projected, 0)) }))
    };
  });
  // Contas fixas do mês: as que faltam primeiro; as pagas ficam recolhidas.
  const scoped = $derived(store.entries.filter(inScope));
  const billStatuses = $derived(bills.map((b) => ({ bill: b, status: billStatus(b, month, scoped) })));
  const billsPending = $derived(billStatuses.filter((x) => x.status.type !== 'paid'));
  const billsPaid = $derived(billStatuses.filter((x) => x.status.type === 'paid'));
  const cardsPending = $derived(thisMonth.filter((g) => !isBillPaid(g.account, g.due, g.imported, cash)));
  const cardsPaid = $derived(thisMonth.filter((g) => isBillPaid(g.account, g.due, g.imported, cash)));
  const pendingTotal = $derived(pendingThisMonth().total);
  const paidTotal = $derived(cardsPaid.reduce((s, g) => s + g.imported, 0) + billsPaid.reduce((s, x) => s + x.bill.amount_cents, 0));
  let showPaid = $state(false);
  let editorOpen = $state(false);
  let editing = $state<Bill | null>(null);
  function editBill(bill: Bill | null) {
    editing = bill;
    editorOpen = true;
  }
  let open = $state<Set<string>>(new Set());
  const key = (g: PayableGroup) => `${g.account.id}-${g.due}`;
  function toggle(id: string) {
    const next = new Set(open);
    next.has(id) ? next.delete(id) : next.add(id);
    open = next;
  }
  function subtitle(g: PayableGroup) {
    const count = `${g.entries.length} compras${g.installments.length ? ` + ${g.installments.length} parcelas previstas` : ''}`;
    if (isBillPaid(g.account, g.due, g.imported, cash)) return `${count} · paga`;
    return g.due < now ? `${count} · venceu (pagamento não encontrado nos extratos)` : count;
  }
</script>

{#snippet group(g: PayableGroup)}
  <div class="card stack-sm">
    <button class="row head" onclick={() => toggle(key(g))}>
      <BankCard account={g.account} width={56} />
      <span class="grow stack-sm" style="gap: 2px"><b>{g.account.name} · vence {dayMonth(g.due)}</b><span class="caption">{subtitle(g)}</span></span>
      <span class="stack-sm" style="gap: 1px; align-items: flex-end"><b class="num">{money(g.imported + g.projected)}</b>{#if g.projected}<span class="caption" style="color: var(--purple)">{money(g.projected)} previsto</span>{/if}</span>
      <Icon name={open.has(key(g)) ? 'chevron-up' : 'chevron-down'} size={16} class="faint" />
    </button>
    {#if open.has(key(g))}
      {#each g.entries as entry (entry.id)}
        <button class="row line" onclick={() => ui.editEntry(entry.id)}>
          <Avatar merchant={store.merchantById.get(entry.merchant_id ?? '') ?? null} category={categoryOf(entry) ?? null} name={entry.title} size={28} />
          <span class="grow stack-sm" style="gap: 0"><span class="small ellipsis">{entry.title}</span><span class="caption">Comprado em {shortDate(entry.date)}{entry.installment_total > 1 ? ` · ${entry.installment_current}/${entry.installment_total}` : ''}</span></span>
          <span class="small num">{money(entry.amount_cents)}</span>
        </button>
      {/each}
      {#each g.installments as item, i (i)}
        <div class="row line"><span class="clock"><Icon name="clock" size={16} /></span><span class="grow small">{item.title} · parcela {item.label}</span><span class="small num" style="color: var(--purple)">{money(item.cents)}</span></div>
      {/each}
    {/if}
  </div>
{/snippet}

<div class="page">
  <header class="row between top">
    <h1>A pagar</h1>
    <button class="btn" onclick={() => editBill(null)} use:hint={['Nova conta fixa', 'Uma conta que se repete todo mês (aluguel, luz, escola, assinatura).']}><Icon name="plus" size={16} />Conta fixa</button>
  </header>
  <WorkspaceBar />

  <section class="card summary">
    <div><span class="caption">Falta pagar em {monthTitle(month).split(' ')[0].toLowerCase()}</span><b class="big" class:warn={pendingTotal > 0}>{money(pendingTotal, { cents: false })}</b></div>
    <div class="right"><span class="caption">Já pago</span><b class="num pos">{money(paidTotal, { cents: false })}</b></div>
  </section>

  {#if prefs.full && chart.labels.length}
    <section class="card">
      <div class="card-head"><h3>Faturas dos próximos meses</h3><span class="sub">compras já feitas + parcelas previstas</span></div>
      <BarChart labels={chart.labels} series={chart.series} current={0} height={200} title="Faturas por mês de vencimento" />
    </section>
  {/if}

  <SectionTitle title="Falta pagar" />
  {#each cardsPending as g (key(g))}{@render group(g)}{/each}
  {#if billsPending.length}
    <div class="card flush list">{#each billsPending as { bill, status } (bill.id)}<button class="list-row plain" onclick={() => editBill(bill)}><BillRow {bill} {status} /></button>{/each}</div>
  {/if}
  {#if !cardsPending.length && !billsPending.length}<div class="card row done"><Icon name="check-circle" size={22} />Tudo pago neste mês.</div>{/if}

  {#if cardsPaid.length || billsPaid.length}
    <button class="btn ghost toggle" onclick={() => (showPaid = !showPaid)}><Icon name={showPaid ? 'chevron-up' : 'chevron-down'} size={15} />Pagas este mês ({cardsPaid.length + billsPaid.length})</button>
    {#if showPaid}
      {#each cardsPaid as g (key(g))}{@render group(g)}{/each}
      {#if billsPaid.length}<div class="card flush list paid">{#each billsPaid as { bill, status } (bill.id)}<button class="list-row plain" onclick={() => editBill(bill)}><BillRow {bill} {status} /></button>{/each}</div>{/if}
    {/if}
  {/if}

  {#if upcoming.length}
    <SectionTitle title="Próximas faturas" />
    {#each upcoming as g (key(g))}{@render group(g)}{/each}
  {/if}
</div>
<BillEditor bind:open={editorOpen} bill={editing} />

<style>
  .top { gap: 10px; }
  .summary { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; padding: 22px; }
  .summary > div { display: flex; flex-direction: column; gap: 4px; }
  .summary .right { text-align: right; }
  .big { font: 600 38px var(--font-display); letter-spacing: -0.02em; }
  .plain { background: none; border: 0; width: 100%; text-align: left; }
  .done { gap: 10px; color: var(--positive); }
  .toggle { align-self: flex-start; }
  .paid { opacity: 0.75; }
  .top h1 { margin: 6px 0; font: 700 30px var(--font-display); letter-spacing: -0.02em; }
  .head, .line { background: none; border: 0; padding: 0; text-align: left; width: 100%; }
  .line { padding-top: 6px; }
  .clock { width: 28px; display: grid; place-items: center; color: var(--purple); }
</style>
