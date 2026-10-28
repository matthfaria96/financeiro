<script lang="ts">
  import type { Account } from '$lib/data/types';
  import { store } from '$lib/data/store.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import Money from '$lib/ui/Money.svelte';
  import PersonChip from '$lib/ui/PersonChip.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { balanceOf, lastEntryDate } from '$lib/features/model';
  import { dayMonth, diffDays, today } from '$lib/core/dates';

  let { account }: { account: Account } = $props();
  const last = $derived(lastEntryDate(account));
  const stale = $derived(!last || diffDays(last, today()) > 40);
  const balance = $derived(balanceOf(account));
  const person = $derived(account.default_person_id ? store.personById.get(account.default_person_id) : undefined);
</script>

<a class="card tight row acc" href="#/contas/{account.id}">
  <BankCard {account} width={80} />
  <span class="grow stack-sm" style="gap: 3px">
    <span class="ellipsis name">{account.name}</span>
    <span class="caption" class:warn={stale}>{last ? `Extrato até ${dayMonth(last)}` : 'Nenhum extrato importado'}</span>
    {#if person}<span><PersonChip {person} /></span>{/if}
  </span>
  <span class="num bal" class:neg={balance < 0}><Money cents={balance} colored={false} /></span>
  <Icon name="chevron-right" size={16} class="faint" />
</a>

<style>
  .acc { transition: background 0.2s; }
  .acc:hover { background: rgba(26, 34, 31, 0.95); }
  .name { font-size: 16.5px; font-weight: 500; }
  .bal { font-size: 16.5px; }
</style>
