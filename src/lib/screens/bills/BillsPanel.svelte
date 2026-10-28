<script lang="ts">
  import { money, percent } from '$lib/core/money';
  import { monthTitle, type Month } from '$lib/core/dates';
  import { store } from '$lib/data/store.svelte';
  import type { Bill, Entry } from '$lib/data/types';
  import Ring from '$lib/ui/charts/Ring.svelte';
  import HBars from '$lib/ui/charts/HBars.svelte';
  import { billStatus } from '$lib/features/bills';

  /** Quanto das contas fixas do mês já foi pago e quais pesam mais. */
  let { bills, month, entries }: { bills: Bill[]; month: Month; entries: Entry[] } = $props();
  const statuses = $derived(bills.map((b) => ({ bill: b, status: billStatus(b, month, entries) })));
  const total = $derived(bills.reduce((s, b) => s + b.amount_cents, 0));
  const paid = $derived(statuses.filter((x) => x.status.type === 'paid').reduce((s, x) => s + x.bill.amount_cents, 0));
  const late = $derived(statuses.filter((x) => x.status.type === 'overdue').length);
  const rows = $derived(bills.map((b) => {
    const category = store.categoryById.get(b.category_id ?? '');
    return { id: b.id, label: b.name, value: b.amount_cents, color: category?.color ?? '#78909C', icon: category?.symbol ?? 'calendar' };
  }).toSorted((a, b) => b.value - a.value));
</script>

<section class="card stack">
  <div class="card-head" style="margin: 0"><h3>{monthTitle(month)}</h3><span class="sub">{bills.length} contas</span></div>
  <div class="row" style="gap: 18px">
    <Ring value={paid / (total || 1)} size={104} stroke={10} label={percent(paid / (total || 1))} sub="pago" />
    <div class="stack-sm grow">
      <div><span class="caption">Pago</span><div class="value-md pos">{money(paid, { cents: false })}</div></div>
      <div><span class="caption">Falta</span><div class="value-md warn">{money(total - paid, { cents: false })}</div></div>
      {#if late}<span class="small neg">{late} {late === 1 ? 'atrasada' : 'atrasadas'}</span>{/if}
    </div>
  </div>
</section>
{#if rows.length}
  <section class="card"><div class="card-head"><h3>O que mais pesa</h3><span class="sub">{money(total, { cents: false })}/mês</span></div><HBars {rows} total={total} limit={7} /></section>
{/if}
