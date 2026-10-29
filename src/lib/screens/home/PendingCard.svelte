<script lang="ts">
  import { money } from '$lib/core/money';
  import { dayMonth } from '$lib/core/dates';
  import { store } from '$lib/data/store.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import Avatar from '$lib/ui/Avatar.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import { statusLabel } from '$lib/features/bills';
  import { pendingThisMonth } from '$lib/features/payables';
  import { merchantForBill } from '$lib/screens/bills/billLook';

  /** O que ainda falta pagar neste mês (mesma conta da tela A pagar). */
  const pending = $derived(pendingThisMonth());
</script>

<section class="card">
  <div class="card-head"><h3>Falta pagar</h3>{#if pending.count}<b class="num warn">{money(pending.total, { cents: false })}</b>{/if}</div>
  {#if pending.count}
    <div class="rows">
      {#each pending.faturas as g (g.account.id + g.due)}
        <a class="item" href="#/a-pagar"><BankCard account={g.account} width={46} /><span class="grow ellipsis">Fatura {g.account.name}<span class="caption"> · vence {dayMonth(g.due)}</span></span><span class="num">{money(g.imported + g.projected, { cents: false })}</span></a>
      {/each}
      {#each pending.bills.slice(0, Math.max(0, 6 - pending.faturas.length)) as { bill, status } (bill.id)}
        <a class="item" href="#/a-pagar"><Avatar merchant={merchantForBill(bill) ?? null} category={store.categoryById.get(bill.category_id ?? '') ?? null} name={bill.name} size={34} />
          <span class="grow ellipsis">{bill.name}<span class="caption" class:neg={status.type === 'overdue' || status.type === 'today'}> · {statusLabel(status).toLowerCase()}</span></span><span class="num">{money(bill.amount_cents, { cents: false })}</span></a>
      {/each}
    </div>
    <a class="more" href="#/a-pagar">Ver tudo que vence <Icon name="chevron-right" size={13} /></a>
  {:else}
    <div class="done"><Icon name="check-circle" size={22} />Tudo pago neste mês.</div>
  {/if}
</section>

<style>
  .rows { display: flex; flex-direction: column; }
  .item { display: flex; align-items: center; gap: 12px; padding: 9px 0; color: inherit; font-size: 14.5px; }
  .item + .item { border-top: 1px solid var(--stroke); }
  .more { display: inline-flex; align-items: center; gap: 3px; margin-top: 10px; color: var(--accent); font-weight: 600; font-size: 14px; }
  .done { display: flex; align-items: center; gap: 10px; color: var(--positive); padding: 6px 0; }
</style>
