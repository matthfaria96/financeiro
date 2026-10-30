<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { money } from '$lib/core/money';
  import { addMonths, dayMonth, monthOf, monthTitle, today, type Month } from '$lib/core/dates';
  import type { Bill } from '$lib/data/types';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';
  import Segmented from '$lib/ui/Segmented.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import { hint } from '$lib/ui/hint';
  import BillRow from '$lib/screens/bills/BillRow.svelte';
  import BillEditor from '$lib/screens/bills/BillEditor.svelte';
  import BillCalendar from '$lib/screens/bills/BillCalendar.svelte';
  import { billInMonth, billStatus, monthNames, onCard } from '$lib/features/bills';
  import { payableGroups } from '$lib/features/payables';
  import { isBillPaid } from '$lib/features/month';
  import { accountOf, inScopeAccount, visibleEntries, inScopeBill } from '$lib/features/model';

  /** Contas fixas (tela; abre pelo Configurar de Lançamentos e pelo calendário da Previsão):
   *  o que vence no mês (calendário + lista) ou no ano (só o que vem 1x por ano; as mensais ficam na aba Mês). */
  let view = $state<'month' | 'year'>('month');
  let month = $state<Month>(monthOf(today()));
  let editorOpen = $state(false);
  let editing = $state<Bill | null>(null);
  let newYearly = $state(false);

  const bills = $derived(store.bills.filter((b) => b.active && inScopeBill(b)).toSorted((a, b) => a.day_of_month - b.day_of_month));
  const scoped = $derived(visibleEntries());
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
  const yearly = $derived(bills.filter((b) => b.frequency === 'yearly').toSorted((a, b) => (a.month_of_year ?? 1) - (b.month_of_year ?? 1) || a.day_of_month - b.day_of_month));
  const yearlyByMonth = $derived(monthNames.map((name, index) => ({ name, items: yearly.filter((b) => (b.month_of_year ?? 1) === index + 1) })).filter((m) => m.items.length));
  const yearlyTotal = $derived(yearly.reduce((s, b) => s + b.amount_cents, 0));

  function edit(bill: Bill | null, asYearly = false) {
    editing = bill;
    newYearly = asYearly;
    editorOpen = true;
  }
</script>

<div class="page">
  <SubHeader title="Contas fixas" back="#/transacoes">
    <button class="btn primary" onclick={() => edit(null, view === 'year')} use:hint={['Nova conta fixa', 'Algo que se paga sempre: todo mês ou uma vez por ano.']}><Icon name="plus" size={15} /><span class="hide-m">Nova conta</span></button>
  </SubHeader>
  <div class="stack">
    <!-- Visão e mês na mesma barra; o mês é um seletor único (‹ Outubro 2026 ›), longe da seta de voltar. -->
    <div class="bar">
      <div class="seg-wrap"><Segmented label="Visão" bind:value={view} options={[{ value: 'month', label: 'Mês' }, { value: 'year', label: 'Ano' }]} /></div>
      {#if view === 'month'}
        <div class="stepper" role="group" aria-label="Mês">
          <button aria-label="Mês anterior" onclick={() => (month = addMonths(month, -1))}><Icon name="chevron-left" size={16} /></button>
          <b>{monthTitle(month)}</b>
          <button aria-label="Próximo mês" onclick={() => (month = addMonths(month, 1))}><Icon name="chevron-right" size={16} /></button>
        </div>
        {#if month !== monthOf(today())}<button class="today-btn" onclick={() => (month = monthOf(today()))}>Hoje</button>{/if}
      {/if}
    </div>

    {#if view === 'month'}
      <div class="desk">
        <div class="col">
          <section class="card sums">
            <div><span class="caption">Total do mês</span><b class="big">{money(monthTotal, { cents: false })}</b></div>
            <div class="right"><span class="caption">Já pago</span><b class="num pos">{money(monthPaid, { cents: false })}</b></div>
          </section>
          <section class="card cal-card"><BillCalendar {month} bills={monthBills.map((x) => x.bill)} faturas={faturas} paid={paidKeys} /></section>
        </div>
        <div class="col">
          {#if faturas.length}
            <div class="card flush list">
              {#each faturas as g (g.account.id + g.due)}
                <div class="list-row"><BankCard account={g.account} width={46} /><span class="grow">Fatura {g.account.name}<span class="caption block">vence {dayMonth(g.due)}{paidKeys.has(`f:${g.account.id}:${g.due}`) ? ' · paga' : ''}</span></span><span class="num">{money(g.imported + g.projected)}</span></div>
              {/each}
            </div>
          {/if}
          <div class="card flush list">
            {#each monthBills as { bill, status } (bill.id)}<button class="list-row plain" class:paid={status.type === 'paid'} onclick={() => edit(bill)}><BillRow {bill} {status} /></button>
            {:else}<p class="muted small pad">Nenhuma conta fixa neste mês. Toque em + para cadastrar aluguel, luz, escola…</p>{/each}
          </div>
        </div>
      </div>
    {:else}
      <section class="card sums">
        <div><span class="caption">Contas anuais</span><b class="big">{money(yearlyTotal, { cents: false })}</b></div>
        <div class="right"><span class="caption">No ano</span><b class="num">{yearly.length} {yearly.length === 1 ? 'conta' : 'contas'}</b></div>
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
    {/if}
  </div>
</div>
<BillEditor bind:open={editorOpen} bill={editing} yearly={newYearly} />

<style>
  .bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .seg-wrap { flex: 1 1 220px; max-width: 320px; }
  .stepper { display: flex; align-items: center; gap: 2px; margin-left: auto; padding: 3px; border-radius: 12px; border: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.05); }
  .stepper b { min-width: 128px; text-align: center; font: 600 15px var(--font-display); }
  .stepper button { display: grid; place-items: center; width: 32px; height: 30px; border: 0; border-radius: 9px; background: none; color: var(--text-2); transition: background 0.2s, color 0.2s; }
  .stepper button:hover { background: rgba(255, 255, 255, 0.08); color: var(--text); }
  .today-btn { padding: 7px 12px; border-radius: 10px; border: 1px solid var(--stroke); background: none; color: var(--accent); font-size: 13px; font-weight: 600; }
  /* Celular: Mês/Ano em cima, o mês embaixo ocupando a largura. */
  @media (max-width: 600px) {
    .seg-wrap { flex-basis: 100%; max-width: none; }
    .stepper { flex: 1; margin-left: 0; justify-content: space-between; }
  }
  .desk, .col { display: flex; flex-direction: column; gap: 12px; }
  .cal-card { padding: 12px; }
  /* Computador: calendário à esquerda, listas à direita (nada esticado). */
  @media (min-width: 1100px) {
    .desk { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: 16px; align-items: start; }
    .desk > .col:first-child { position: sticky; top: 16px; }
  }
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
