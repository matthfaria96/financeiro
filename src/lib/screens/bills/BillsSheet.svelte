<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { ui } from '$lib/ui/ui.svelte';
  import { money } from '$lib/core/money';
  import { addMonths, dayMonth, monthOf, monthTitle, today, type Month } from '$lib/core/dates';
  import type { Bill } from '$lib/data/types';
  import Sheet from '$lib/ui/Sheet.svelte';
  import Segmented from '$lib/ui/Segmented.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import { hint } from '$lib/ui/hint';
  import BillRow from './BillRow.svelte';
  import BillEditor from './BillEditor.svelte';
  import BillCalendar from './BillCalendar.svelte';
  import { billInMonth, billStatus, monthNames, onCard } from '$lib/features/bills';
  import { payableGroups } from '$lib/features/payables';
  import { isBillPaid } from '$lib/features/month';
  import { accountOf, inScope, inScopeAccount, inScopeBill } from '$lib/features/model';

  /** Contas fixas: o que vence no mês (calendário + lista) ou no ano (o que é mensal e o que vem 1x por ano). */
  let view = $state<'month' | 'year'>('month');
  let month = $state<Month>(monthOf(today()));
  let editorOpen = $state(false);
  let editing = $state<Bill | null>(null);
  let newYearly = $state(false);

  const bills = $derived(store.bills.filter((b) => b.active && inScopeBill(b)).toSorted((a, b) => a.day_of_month - b.day_of_month));
  const scoped = $derived(store.entries.filter(inScope));
  const cash = $derived(scoped.filter((e) => ['checking', 'cash'].includes(accountOf(e)?.kind ?? '')));
  const cards = $derived(store.accounts.filter((a) => a.kind === 'creditCard' && inScopeAccount(a)));
  const isCard = (b: Bill) => onCard(b, store.accountById.get(b.account_id ?? '')?.kind === 'creditCard');

  // Mês
  const monthBills = $derived(bills.filter((b) => billInMonth(b, month)).map((bill) => ({ bill, status: billStatus(bill, month, scoped) })));
  const faturas = $derived(payableGroups(cards).filter((g) => monthOf(g.due) === month));
  const paidKeys = $derived(new Set([
    ...faturas.filter((g) => isBillPaid(g.account, g.due, g.imported, cash)).map((g) => `f:${g.account.id}:${g.due}`),
    ...monthBills.filter((x) => x.status.type === 'paid').map((x) => `b:${x.bill.id}`)
  ]));
  const monthTotal = $derived(faturas.reduce((s, g) => s + g.imported + g.projected, 0) + monthBills.filter((x) => !isCard(x.bill)).reduce((s, x) => s + x.bill.amount_cents, 0));
  const monthPaid = $derived(faturas.filter((g) => paidKeys.has(`f:${g.account.id}:${g.due}`)).reduce((s, g) => s + g.imported, 0)
    + monthBills.filter((x) => x.status.type === 'paid' && !isCard(x.bill)).reduce((s, x) => s + x.bill.amount_cents, 0));

  // Ano
  const monthly = $derived(bills.filter((b) => b.frequency !== 'yearly'));
  const yearly = $derived(bills.filter((b) => b.frequency === 'yearly').toSorted((a, b) => (a.month_of_year ?? 1) - (b.month_of_year ?? 1) || a.day_of_month - b.day_of_month));
  const yearlyByMonth = $derived(monthNames.map((name, index) => ({ name, items: yearly.filter((b) => (b.month_of_year ?? 1) === index + 1) })).filter((m) => m.items.length));
  const monthlyTotal = $derived(monthly.reduce((s, b) => s + b.amount_cents, 0));
  const yearlyTotal = $derived(yearly.reduce((s, b) => s + b.amount_cents, 0));

  function edit(bill: Bill | null, asYearly = false) {
    editing = bill;
    newYearly = asYearly;
    editorOpen = true;
  }
</script>

<Sheet bind:open={ui.billsOpen} title="Contas fixas" wide>
  {#snippet actions()}<button class="btn primary" onclick={() => edit(null, view === 'year')} use:hint={['Nova conta fixa', 'Algo que se paga sempre: todo mês ou uma vez por ano.']}><Icon name="plus" size={15} />Conta</button>{/snippet}
  <div class="stack" style="padding-top: 10px">
    <Segmented label="Visão" bind:value={view} options={[{ value: 'month', label: 'Mês' }, { value: 'year', label: 'Ano' }]} />

    {#if view === 'month'}
      <div class="row between monthbar">
        <button class="icon-btn" aria-label="Mês anterior" onclick={() => (month = addMonths(month, -1))}><Icon name="chevron-left" /></button>
        <b class="title">{monthTitle(month)}</b>
        <button class="icon-btn" aria-label="Próximo mês" onclick={() => (month = addMonths(month, 1))}><Icon name="chevron-right" /></button>
      </div>
      <section class="card sums">
        <div><span class="caption">Total do mês</span><b class="big">{money(monthTotal, { cents: false })}</b></div>
        <div class="right"><span class="caption">Já pago</span><b class="num pos">{money(monthPaid, { cents: false })}</b></div>
      </section>
      <BillCalendar {month} bills={monthBills.map((x) => x.bill)} faturas={faturas} paid={paidKeys} />
      {#if faturas.length}
        <div class="card flush list">
          {#each faturas as g (g.account.id + g.due)}
            <div class="list-row"><BankCard account={g.account} width={46} /><span class="grow">Fatura {g.account.name}<span class="caption block">vence {dayMonth(g.due)}{paidKeys.has(`f:${g.account.id}:${g.due}`) ? ' · paga' : ''}</span></span><span class="num">{money(g.imported + g.projected)}</span></div>
          {/each}
        </div>
      {/if}
      <div class="card flush list">
        {#each monthBills as { bill, status } (bill.id)}<button class="list-row plain" class:paid={status.type === 'paid'} onclick={() => edit(bill)}><BillRow {bill} {status} /></button>
        {:else}<p class="muted small pad">Nenhuma conta fixa neste mês. Toque em "Conta" para cadastrar aluguel, luz, escola…</p>{/each}
      </div>
    {:else}
      <section class="card sums">
        <div><span class="caption">Por ano</span><b class="big">{money(monthlyTotal * 12 + yearlyTotal, { cents: false })}</b></div>
        <div class="right"><span class="caption">Mensais × 12 + anuais</span><b class="num">{money(monthlyTotal, { cents: false })}/mês</b></div>
      </section>
      <div class="row between head"><h4>Uma vez por ano</h4><button class="btn ghost" onclick={() => edit(null, true)}><Icon name="plus" size={14} />Anual</button></div>
      {#each yearlyByMonth as m (m.name)}
        <section class="card">
          <div class="row between mhead"><b>{m.name}</b><span class="num muted">{money(m.items.reduce((s, b) => s + b.amount_cents, 0), { cents: false })}</span></div>
          <div class="stack-sm">{#each m.items as bill (bill.id)}<button class="plain" onclick={() => edit(bill)}><BillRow {bill} /></button>{/each}</div>
        </section>
      {:else}
        <p class="muted small">Nenhuma conta anual. Ex.: IPVA, IPTU, licenciamento, seguro.</p>
      {/each}
      <div class="row between head"><h4>Todo mês</h4><span class="caption">{money(monthlyTotal * 12, { cents: false })} no ano</span></div>
      <div class="card flush list">
        {#each monthly as bill (bill.id)}<button class="list-row plain" onclick={() => edit(bill)}><BillRow {bill} /></button>
        {:else}<p class="muted small pad">Nenhuma conta mensal.</p>{/each}
      </div>
    {/if}
  </div>
</Sheet>
<BillEditor bind:open={editorOpen} bill={editing} yearly={newYearly} />

<style>
  .monthbar .title { font: 600 18px var(--font-display); }
  .sums { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
  .sums > div { display: flex; flex-direction: column; gap: 3px; }
  .right { text-align: right; }
  .big { font: 600 30px var(--font-display); letter-spacing: -0.02em; }
  .plain { background: none; border: 0; width: 100%; text-align: left; padding: 0; }
  .list-row.plain { padding: 12px 16px; }
  .paid { opacity: 0.6; }
  .block { display: block; }
  .pad { padding: 16px; margin: 0; }
  .head { margin-top: 6px; }
  .head h4 { margin: 0; font: 600 16px var(--font-display); }
  .mhead { margin-bottom: 10px; }
</style>
