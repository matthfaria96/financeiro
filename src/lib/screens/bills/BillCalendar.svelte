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
    <div class="cell" class:today={date === now} class:past={date < now}>
      <span class="d">{day}</span>
      <span class="marks">
        {#each cards as g (g.account.id)}<span class:done={paid.has(`f:${g.account.id}:${g.due}`)}><BankCard account={g.account} width={30} /></span>{/each}
        {#each due.slice(0, 2) as b (b.id)}<span class:done={paid.has(`b:${b.id}`)}><Avatar merchant={merchantForBill(b) ?? null} category={store.categoryById.get(b.category_id ?? '') ?? null} name={b.name} size={24} /></span>{/each}
      </span>
    </div>
  {/each}
</div>

<style>
  .cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
  .wd { text-align: center; font-size: 12.5px; color: var(--text-2); padding-bottom: 2px; }
  .cell { min-height: 68px; border-radius: 11px; background: rgba(255, 255, 255, 0.035); border: 1px solid var(--stroke); display: flex; flex-direction: column; align-items: center; padding-top: 6px; gap: 5px; }
  .cell.today { background: rgba(43, 212, 164, 0.1); border-color: rgba(43, 212, 164, 0.35); }
  .cell.today .d { color: var(--accent); font-weight: 700; }
  .cell.past .d { color: var(--text-3); }
  .d { font-size: 13px; }
  .marks { display: flex; flex-wrap: wrap; justify-content: center; gap: 3px; }
  .done { opacity: 0.35; }
</style>
