<script lang="ts">
  import Select from '$lib/ui/Select.svelte';
  import { goto } from '$app/navigation';
  import { store } from '$lib/data/store.svelte';
  import { addMonths, dayMonth, monthOf, monthTitle, today, type Month } from '$lib/core/dates';
  import { money } from '$lib/core/money';
  import Icon from '$lib/ui/Icon.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import Avatar from '$lib/ui/Avatar.svelte';
  import ChartButton from '$lib/ui/ChartButton.svelte';
  import { hint } from '$lib/ui/hint';
  import CategoryDonut from '$lib/screens/money/CategoryDonut.svelte';
  import EntryListCard from '$lib/screens/money/EntryListCard.svelte';
  import ChartsSheet from '$lib/screens/money/ChartsSheet.svelte';
  import { merchantForBill } from '$lib/screens/bills/billLook';
  import { filter } from '$lib/screens/transactions/filter.svelte';
  import { inScope, inScopeAccount } from '$lib/features/model';
  import { analyzeMonth, forecastMonth } from '$lib/features/analytics';
  import Segmented from '$lib/ui/Segmented.svelte';
  import { prefs } from '$lib/ui/prefs.svelte';

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
      <Select variant="title" bind:value={month} label="Mês" options={options.map((m) => ({ value: m, label: monthTitle(m), hint: m > current ? 'previsão' : undefined }))} />
      <button class="icon-btn" aria-label="Próximo mês" disabled={month >= options[0]} onclick={() => (month = addMonths(month, 1))}><Icon name="chevron-right" /></button>
    </div>
    <div class="row" style="gap: 8px">
      <ChartButton onclick={() => (chartsOpen = true)} label="Análise" detail="Fixas e variáveis, previsão dos próximos meses e entradas × saídas." />
      <ChartButton icon="search" label="Buscar" detail="Todos os lançamentos deste mês, com busca e filtros." onclick={search} />
    </div>
  </header>

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
    <section class="card totals">
      <div><span class="caption">Entradas</span><b class="num pos">{money(analysis.incomeTotal)}</b></div>
      <div><span class="caption">Saídas</span><b class="num">{money(analysis.expenseTotal)}</b></div>
      <div><span class="caption">Balanço</span><b class="num" class:pos={analysis.balance >= 0} class:neg={analysis.balance < 0}>{money(analysis.balance)}</b></div>
    </section>
    <div class="credit-mode">
      <Segmented label="Compras no cartão" value={prefs.creditByPurchase ? 'purchase' : 'bill'} options={[{ value: 'bill', label: 'Cartão no mês da fatura' }, { value: 'purchase', label: 'No mês da compra' }]}
        onchange={(v) => prefs.setCreditByPurchase(v === 'purchase')} />
      <span class="caption">{prefs.creditByPurchase ? 'Compras no cartão contam no dia em que foram feitas.' : 'Compras no cartão contam quando a fatura vence (parceladas: só a parcela do mês).'}</span>
    </div>
    <div class="layout">
      <CategoryDonut title="Saídas" groups={analysis.expenses} total={analysis.expenseTotal} empty="Nenhuma saída neste mês." />
      <CategoryDonut title="Entradas" groups={analysis.income} total={analysis.incomeTotal} tone="pos" empty="Nenhuma entrada neste mês. Importe o extrato da conta." />
    </div>
    <EntryListCard title="Entradas" entries={analysis.income.flatMap((g) => g.entries)} total={analysis.incomeTotal} tone="pos" />
    <EntryListCard title="Saídas" entries={analysis.expenses.flatMap((g) => g.entries)} total={-analysis.expenseTotal} />
  {/if}
</div>
<ChartsSheet bind:open={chartsOpen} focus="cost" month={future ? current : month} {entries} {accounts} />

<style>
  .top { gap: 10px; flex-wrap: wrap; }
  .month { display: flex; align-items: center; gap: 8px; }
  .icon-btn:disabled { opacity: 0.3; }
  .layout { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); align-items: start; }
  @media (min-width: 1000px) { .layout { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .credit-mode { display: flex; flex-direction: column; gap: 6px; }
  .credit-mode :global(.seg) { max-width: 460px; }
  .totals { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .totals > div { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .totals b { font: 600 clamp(15px, 4vw, 22px) var(--font-display); white-space: nowrap; }
  .rows { display: flex; flex-direction: column; }
  .item { gap: 12px; padding: 9px 0; font-size: 15px; }
  .item + .item { border-top: 1px solid var(--stroke); }
  .big { font: 600 24px var(--font-display); }
</style>
