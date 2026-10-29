<script lang="ts">
  import { money } from '$lib/core/money';
  import { addMonths, dayMonth, monthOf, monthTitle, today } from '$lib/core/dates';
  import { store } from '$lib/data/store.svelte';
  import { ui } from '$lib/ui/ui.svelte';
  import type { Account } from '$lib/data/types';
  import Icon from '$lib/ui/Icon.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import Avatar from '$lib/ui/Avatar.svelte';
  import ChartButton from '$lib/ui/ChartButton.svelte';
  import { forecastMonth } from '$lib/features/analytics';
  import { merchantForBill } from '$lib/screens/bills/billLook';
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  /** Previsão dos próximos meses: faturas já comprometidas (compras e parcelas) + contas fixas. Toque no mês para ver. */
  let { accounts, oncalendar }: { accounts: Account[]; oncalendar?: () => void } = $props();
  const now = monthOf(today());
  const months = $derived([1, 2, 3, 4, 5, 6].map((i) => addMonths(now, i)).map((m) => ({ month: m, ...forecastMonth(m, accounts) })));
  const top = $derived(Math.max(1, ...months.map((n) => n.total)));
  let open = $state('');
</script>

<section class="card">
  <div class="card-head"><h3>Previsão dos próximos meses</h3><ChartButton icon="calendar" label="Calendário" detail="Contas fixas do mês ou do ano, e o calendário." onclick={() => (oncalendar ? oncalendar() : (ui.billsOpen = true))} /></div>
  <div class="months">
    {#each months as n, k (n.month)}
      <button class="bar-row" class:open={open === n.month} style:--d="{k * 50}ms" onclick={() => (open = open === n.month ? '' : n.month)} aria-expanded={open === n.month}>
        <span class="m">{monthTitle(n.month).split(' ')[0]}</span>
        <span class="track"><span style:width="{Math.max(2, (n.total / top) * 100)}%"></span></span>
        <b class="num">{money(n.total, { cents: false })}</b>
        <span class="chev"><Icon name="chevron-down" size={14} /></span>
      </button>
      {#if open === n.month}
        <div class="detail" transition:slide={{ duration: 300, easing: cubicOut }}>
          {#each n.faturas as f (f.account.id + f.due)}<div class="row item"><BankCard account={f.account} width={34} /><span class="grow ellipsis">Fatura {f.account.name}<span class="caption"> · {dayMonth(f.due)}</span></span><span class="num">{money(f.cents, { cents: false })}</span></div>{/each}
          {#each n.bills as bill (bill.id)}<div class="row item"><Avatar merchant={merchantForBill(bill) ?? null} category={store.categoryById.get(bill.category_id ?? '') ?? null} name={bill.name} size={30} /><span class="grow ellipsis">{bill.name}<span class="caption"> · dia {bill.day_of_month}</span></span><span class="num">{money(bill.amount_cents, { cents: false })}</span></div>{/each}
          {#if !n.faturas.length && !n.bills.length}<p class="muted small">Nada previsto ainda.</p>{/if}
        </div>
      {/if}
    {/each}
  </div>
  <p class="caption faint note">Faturas já comprometidas (compras e parcelas) + contas fixas.</p>
</section>

<style>
  .months { display: flex; flex-direction: column; gap: 4px; }
  .bar-row { display: grid; grid-template-columns: 92px 1fr auto 16px; align-items: center; gap: 12px; padding: 8px 10px; margin: 0 -10px; border-radius: 12px; background: none; border: 0; text-align: left; font-size: 15px; transition: background 0.2s; }
  .bar-row:hover, .bar-row.open { background: rgba(255, 255, 255, 0.04); }
  .chev { display: grid; color: var(--text-3); transition: transform 0.35s var(--ease); }
  .open .chev { transform: rotate(180deg); }
  .m { color: var(--text-2); }
  .track { height: 12px; border-radius: 6px; background: rgba(255, 255, 255, 0.06); overflow: hidden; }
  .track span { display: block; height: 100%; border-radius: 6px; background: linear-gradient(90deg, #d95926, #ff9f1c); transform-origin: left;
    animation: fill 0.9s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: var(--d); transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1); }
  @keyframes fill { from { transform: scaleX(0); } }
  .detail { overflow: hidden; margin: 0 0 8px; padding: 4px 12px; border-radius: 12px; background: rgba(255, 255, 255, 0.03); }
  .item { gap: 10px; padding: 7px 0; font-size: 14px; }
  .item + .item { border-top: 1px solid var(--stroke); }
  .note { margin: 10px 0 0; }
</style>
