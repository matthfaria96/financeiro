<script lang="ts">
  import type { Bill } from '$lib/data/types';
  import { store } from '$lib/data/store.svelte';
  import Avatar from '$lib/ui/Avatar.svelte';
  import Money from '$lib/ui/Money.svelte';
  import { methodShort, monthNames, statusLabel, type BillStatus } from '$lib/features/bills';
  import { merchantForBill } from './billLook';

  let { bill, status = null }: { bill: Bill; status?: BillStatus | null } = $props();
  const category = $derived(bill.category_id ? store.categoryById.get(bill.category_id) ?? null : null);
  const merchant = $derived(merchantForBill(bill));
  const card = $derived(bill.method === 'card' || store.accountById.get(bill.account_id ?? '')?.kind === 'creditCard');
  const detail = $derived([bill.frequency === 'yearly' ? `${monthNames[(bill.month_of_year ?? 1) - 1]}, dia ${bill.day_of_month}` : `Todo dia ${bill.day_of_month}`,
    card ? 'cartão' : methodShort[bill.method ?? 'account'].toLowerCase(), bill.variable ? 'valor variável' : ''].filter(Boolean).join(' · '));
</script>

<div class="row" style="width: 100%">
  <Avatar merchant={merchant ?? null} {category} name={bill.name} size={46} />
  <span class="grow stack-sm" style="gap: 2px">
    <span class="ellipsis" style="font-size: 16px">{bill.name}</span>
    <span class="caption">{detail}</span>
  </span>
  <span class="stack-sm" style="gap: 2px; align-items: flex-end">
    <span class="num">{bill.variable ? '~' : ''}<Money cents={bill.amount_cents} colored={false} class="value-sm" /></span>
    {#if status}<span class="small" class:pos={status.type === 'paid'} class:neg={status.type === 'today' || status.type === 'overdue'} class:muted={status.type === 'upcoming'}>{statusLabel(status)}</span>{/if}
  </span>
</div>
