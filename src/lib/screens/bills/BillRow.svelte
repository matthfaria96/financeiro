<script lang="ts">
  import type { Bill } from '$lib/data/types';
  import { store } from '$lib/data/store.svelte';
  import Avatar from '$lib/ui/Avatar.svelte';
  import Money from '$lib/ui/Money.svelte';
  import { statusLabel, type BillStatus } from '$lib/features/bills';
  import { merchantForBill } from './billLook';

  let { bill, status }: { bill: Bill; status: BillStatus } = $props();
  const category = $derived(bill.category_id ? store.categoryById.get(bill.category_id) ?? null : null);
  const merchant = $derived(merchantForBill(bill));
  const card = $derived(store.accountById.get(bill.account_id ?? '')?.kind === 'creditCard');
</script>

<div class="row">
  <Avatar merchant={merchant ?? null} {category} name={bill.name} size={46} />
  <span class="grow stack-sm" style="gap: 2px">
    <span class="ellipsis" style="font-size: 17px">{bill.name}</span>
    <span class="caption">Mensal · dia {bill.day_of_month}{card ? ' · no cartão' : ''}</span>
  </span>
  <span class="stack-sm" style="gap: 2px; align-items: flex-end">
    <Money cents={bill.amount_cents} colored={false} class="value-sm" />
    <span class="small" class:pos={status.type === 'paid'} class:neg={status.type === 'today' || status.type === 'overdue'} class:muted={status.type === 'upcoming'}>{statusLabel(status)}</span>
  </span>
</div>
