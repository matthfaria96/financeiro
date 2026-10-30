<script lang="ts">
  import { clampedDay, daysInMonth, parts, today, type Month } from '$lib/core/dates';
  import { store } from '$lib/data/store.svelte';
  import type { Bill } from '$lib/data/types';
  import Avatar from '$lib/ui/Avatar.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import { dueDate } from '$lib/features/bills';
  import type { PayableGroup } from '$lib/features/payables';
  import { merchantForBill } from './billLook';

  /** Calendário do mês: em cada dia, as contas fixas e as faturas que vencem (pagas ficam apagadas). */
  let { month, bills, faturas, paid }: { month: Month; bills: Bill[]; faturas: PayableGroup[]; paid: Set<string> } = $props();
  const [y, m] = $derived(month.split('-').map(Number));
  const leading = $derived((new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7);
  const days = $derived(daysInMonth(y, m));
  const now = today();
</script>

<div class="cal">
  {#each ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as w}<span class="wd">{w}</span>{/each}
  {#each Array(leading) as _}<span></span>{/each}
  {#each Array(days) as _, index}
    {@const day = index + 1}
    {@const date = clampedDay(month, day)}
    {@const due = bills.filter((b) => parts(dueDate(b, month)).day === day)}
    {@const cards = faturas.filter((g) => g.due === date)}
    {@const total = cards.length + due.length}
    <div class="cell" class:today={date === now} class:past={date < now}>
      <span class="d">{day}</span>
      <!-- Um ícone só por dia (fatura primeiro); o resto vira um selo "+N", sem quebrar a célula. -->
      {#if total}
        <!-- Mostra primeiro o que ainda falta pagar. -->
        {@const card = cards.find((g) => !paid.has(`f:${g.account.id}:${g.due}`))}
        {@const bill = due.find((b) => !paid.has(`b:${b.id}`))}
        {@const shown = card ? { card } : bill ? { bill } : cards[0] ? { card: cards[0] } : { bill: due[0] }}
        <span class="mark">
          {#if shown.card}<span class:done={paid.has(`f:${shown.card.account.id}:${shown.card.due}`)}><BankCard account={shown.card.account} width={26} /></span>
          {:else if shown.bill}<span class:done={paid.has(`b:${shown.bill.id}`)}><Avatar merchant={merchantForBill(shown.bill) ?? null} category={store.categoryById.get(shown.bill.category_id ?? '') ?? null} name={shown.bill.name} size={22} /></span>{/if}
          {#if total > 1}<span class="more">+{total - 1}</span>{/if}
        </span>
      {/if}
    </div>
  {/each}
</div>

<style>
  .cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
  .wd { text-align: center; font-size: 12.5px; color: var(--text-2); padding-bottom: 2px; }
  .cell { min-height: 60px; border-radius: 11px; background: rgba(255, 255, 255, 0.035); border: 1px solid var(--stroke); display: flex; flex-direction: column; align-items: center; padding-top: 6px; gap: 5px; }
  .cell.today { background: rgba(43, 212, 164, 0.1); border-color: rgba(43, 212, 164, 0.35); }
  .cell.today .d { color: var(--accent); font-weight: 700; }
  .cell.past .d { color: var(--text-3); }
  .d { font-size: 13px; }
  .mark { position: relative; display: inline-flex; }
  .more { position: absolute; top: -6px; right: -12px; min-width: 18px; height: 16px; padding: 0 4px; border-radius: 8px; display: grid; place-items: center; background: #2a3230; border: 1px solid var(--card-solid, #111); font-size: 10px; font-weight: 700; color: var(--text); }
  .done { opacity: 0.35; }
  .cell { min-width: 0; }
  @media (max-width: 600px) { .cal { gap: 4px; } .cell { min-height: 54px; border-radius: 9px; } .more { right: -9px; } }
</style>
