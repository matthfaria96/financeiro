<script lang="ts">
  import { money } from '$lib/core/money';
  import { addMonths, dayMonth, monthOf, shortMonth, today } from '$lib/core/dates';
  import { store } from '$lib/data/store.svelte';
  import type { Account } from '$lib/data/types';
  import Icon from '$lib/ui/Icon.svelte';
  import Avatar from '$lib/ui/Avatar.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import ChartButton from '$lib/ui/ChartButton.svelte';
  import { statusLabel } from '$lib/features/bills';
  import { pendingThisMonth } from '$lib/features/payables';
  import { forecastMonth } from '$lib/features/analytics';
  import { merchantForBill } from '$lib/screens/bills/billLook';

  /** A pagar neste mês e a previsão dos próximos (faturas já comprometidas + contas fixas). */
  let { accounts }: { accounts: Account[] } = $props();
  const pending = $derived(pendingThisMonth());
  const now = monthOf(today());
  const next = $derived([1, 2, 3].map((i) => addMonths(now, i)).map((m) => ({ month: m, ...forecastMonth(m, accounts) })));
  const top = $derived(Math.max(1, ...next.map((n) => n.total)));
</script>

<section class="card">
  <div class="card-head"><h3>A pagar</h3><ChartButton icon="calendar" label="Calendário" detail="Faturas e contas fixas do mês, dia a dia." onclick={() => (location.hash = '#/a-pagar')} /></div>
  {#if pending.count}
    <div class="row between head"><span class="muted small">Falta neste mês</span><b class="num warn big">{money(pending.total, { cents: false })}</b></div>
    <div class="rows">
      {#each pending.faturas as g (g.account.id + g.due)}
        <a class="row item" href="#/a-pagar"><BankCard account={g.account} width={38} /><span class="grow ellipsis">Fatura {g.account.name}<span class="caption"> · {dayMonth(g.due)}</span></span><span class="num">{money(g.imported + g.projected, { cents: false })}</span></a>
      {/each}
      {#each pending.bills.slice(0, Math.max(0, 4 - pending.faturas.length)) as { bill, status } (bill.id)}
        <a class="row item" href="#/a-pagar"><Avatar merchant={merchantForBill(bill) ?? null} category={store.categoryById.get(bill.category_id ?? '') ?? null} name={bill.name} size={32} />
          <span class="grow ellipsis">{bill.name}<span class="caption" class:neg={status.type === 'overdue' || status.type === 'today'}> · {statusLabel(status).toLowerCase()}</span></span><span class="num">{money(bill.amount_cents, { cents: false })}</span></a>
      {/each}
    </div>
  {:else}
    <div class="done"><Icon name="check-circle" size={20} />Tudo pago neste mês.</div>
  {/if}
  <div class="future">
    <span class="caption">Previsão dos próximos meses</span>
    {#each next as n (n.month)}
      <div class="bar-row" title="{n.faturas.length} faturas + {n.bills.length} contas fixas">
        <span class="m">{shortMonth(n.month).slice(0, 3)}</span>
        <span class="track"><span style:width="{Math.max(2, (n.total / top) * 100)}%"></span></span>
        <b class="num">{money(n.total, { cents: false })}</b>
      </div>
    {/each}
    <span class="caption faint">Faturas já comprometidas (compras e parcelas) + contas fixas.</span>
  </div>
</section>

<style>
  .head { margin-bottom: 4px; }
  .big { font: 600 24px var(--font-display); }
  .rows { display: flex; flex-direction: column; }
  .item { gap: 12px; padding: 8px 0; color: inherit; font-size: 14.5px; }
  .item + .item { border-top: 1px solid var(--stroke); }
  .done { display: flex; align-items: center; gap: 10px; color: var(--positive); padding: 4px 0 8px; }
  .future { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--stroke); }
  .bar-row { display: grid; grid-template-columns: 34px 1fr auto; align-items: center; gap: 10px; font-size: 14px; }
  .m { color: var(--text-2); }
  .track { height: 10px; border-radius: 5px; background: rgba(255, 255, 255, 0.06); overflow: hidden; }
  .track span { display: block; height: 100%; border-radius: 5px; background: linear-gradient(90deg, #d95926, #ff9f1c); }
</style>
