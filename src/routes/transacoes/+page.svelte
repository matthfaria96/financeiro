<script lang="ts">
  import { goto } from '$app/navigation';
  import { store } from '$lib/data/store.svelte';
  import { addMonths, dayMonth, monthOf, monthTitle, today, type Month } from '$lib/core/dates';
  import { money } from '$lib/core/money';
  import Icon from '$lib/ui/Icon.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import Avatar from '$lib/ui/Avatar.svelte';
  import WorkspaceBar from '$lib/ui/WorkspaceBar.svelte';
  import ChartButton from '$lib/ui/ChartButton.svelte';
  import { hint } from '$lib/ui/hint';
  import BalanceCard from '$lib/screens/money/BalanceCard.svelte';
  import GroupsCard from '$lib/screens/money/GroupsCard.svelte';
  import ChartsSheet from '$lib/screens/money/ChartsSheet.svelte';
  import { merchantForBill } from '$lib/screens/bills/billLook';
  import { filter } from '$lib/screens/transactions/filter.svelte';
  import { inScope, inScopeAccount } from '$lib/features/model';
  import { analyzeMonth, forecastMonth } from '$lib/features/analytics';

  /** Lançamentos (o "analítico"): o mês escolhido em saldo, entradas, saídas por categoria e balanço.
   *  Meses futuros mostram o que já está previsto (faturas e contas fixas). */
  const current = monthOf(today());
  let month = $state<Month>(current);
  const entries = $derived(store.entries.filter(inScope));
  const accounts = $derived(store.accounts.filter((a) => !a.archived && inScopeAccount(a)).toSorted((a, b) => a.sort_order - b.sort_order));
  const first = $derived(entries.map((e) => monthOf(e.date)).sort()[0] ?? current);
  const options = $derived(Array.from({ length: 64 }, (_, i) => addMonths(current, 3 - i)).filter((m) => m >= first || m >= current));
  const future = $derived(month > current);
  const analysis = $derived(analyzeMonth(month, entries, accounts));
  const forecast = $derived(future ? forecastMonth(month, accounts) : null);
  let chartsOpen = $state(false);

  function search() {
    filter.set({ month });
    goto('#/transacoes/todos');
  }
</script>

<div class="page">
  <header class="row between top">
    <div class="month">
      <button class="icon-btn" aria-label="Mês anterior" disabled={month <= options.at(-1)!} onclick={() => (month = addMonths(month, -1))}><Icon name="chevron-left" /></button>
      <label class="picker" use:hint={['Mês', 'Escolha o mês. Dá para ver os próximos meses com o que já está previsto.']}>
        <span>{monthTitle(month)}</span><Icon name="chevron-down" size={16} />
        <select bind:value={month} aria-label="Mês">{#each options as m (m)}<option value={m}>{monthTitle(m)}{m > current ? ' (previsão)' : ''}</option>{/each}</select>
      </label>
      <button class="icon-btn" aria-label="Próximo mês" disabled={month >= options[0]} onclick={() => (month = addMonths(month, 1))}><Icon name="chevron-right" /></button>
    </div>
    <div class="row" style="gap: 8px">
      <ChartButton onclick={() => (chartsOpen = true)} detail="Entradas × saídas por mês, saídas por categoria e saldo no tempo." />
      <ChartButton icon="calendar" label="Calendário" detail="Faturas e contas fixas: o que vence, o que já foi pago." onclick={() => goto('#/a-pagar')} />
      <ChartButton icon="search" label="Buscar" detail="Todos os lançamentos deste mês, com busca e filtros." onclick={search} />
    </div>
  </header>
  <WorkspaceBar />

  {#if forecast}
    <section class="card">
      <div class="card-head"><h3>Previsão de {monthTitle(month).split(' ')[0].toLowerCase()}</h3><b class="num warn big">{money(forecast.total, { cents: false })}</b></div>
      <p class="caption" style="margin: -6px 0 10px">O que já se sabe que vai sair: faturas (compras feitas e parcelas) e contas fixas.</p>
      <div class="rows">
        {#each forecast.faturas as f (f.account.id + f.due)}
          <div class="row item"><BankCard account={f.account} width={38} /><span class="grow">Fatura {f.account.name}<span class="caption"> · vence {dayMonth(f.due)}</span></span><span class="num">{money(f.cents)}</span></div>
        {/each}
        {#each forecast.bills as bill (bill.id)}
          <div class="row item"><Avatar merchant={merchantForBill(bill) ?? null} category={store.categoryById.get(bill.category_id ?? '') ?? null} name={bill.name} size={32} /><span class="grow">{bill.name}<span class="caption"> · dia {bill.day_of_month}</span></span><span class="num">{money(bill.amount_cents)}</span></div>
        {:else}{#if !forecast.faturas.length}<p class="muted small">Nada previsto ainda para este mês.</p>{/if}{/each}
      </div>
    </section>
  {:else}
    <div class="layout">
      <div class="col">
        <BalanceCard {analysis} title={month === current ? 'Saldo financeiro' : 'Saldo no fim do mês'} />
        <GroupsCard title="Entradas" groups={analysis.income} total={analysis.incomeTotal} tone="pos" />
        <section class="card balance">
          <div class="card-head"><h3>Balanço</h3></div>
          <div class="row between"><span class="muted">Entradas</span><span class="num pos">{money(analysis.incomeTotal)}</span></div>
          <div class="row between"><span class="muted">Saídas</span><span class="num">{money(analysis.expenseTotal)}</span></div>
          <div class="row between final"><b>Final</b><b class="num" class:pos={analysis.balance >= 0} class:neg={analysis.balance < 0}>{money(analysis.balance)}</b></div>
        </section>
      </div>
      <div class="col">
        <GroupsCard title="Saídas por categoria" groups={analysis.expenses} total={analysis.expenseTotal} />
      </div>
    </div>
  {/if}
</div>
<ChartsSheet bind:open={chartsOpen} focus="categories" month={future ? current : month} {entries} {accounts} />

<style>
  .top { gap: 10px; flex-wrap: wrap; }
  .month { display: flex; align-items: center; gap: 8px; }
  .picker { position: relative; display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 999px; border: 1px solid var(--stroke-strong); background: rgba(255, 255, 255, 0.07); font: 600 19px var(--font-display); cursor: pointer; }
  .picker select { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .icon-btn:disabled { opacity: 0.3; }
  .layout { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); align-items: start; }
  @media (min-width: 1000px) { .layout { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
  .balance { display: flex; flex-direction: column; gap: 10px; font-size: 15px; }
  .balance .card-head { margin-bottom: 0; }
  .final { padding-top: 12px; border-top: 1px solid var(--stroke-strong); }
  .final b { font: 600 22px var(--font-display); }
  .rows { display: flex; flex-direction: column; }
  .item { gap: 12px; padding: 9px 0; font-size: 15px; }
  .item + .item { border-top: 1px solid var(--stroke); }
  .big { font: 600 24px var(--font-display); }
</style>
