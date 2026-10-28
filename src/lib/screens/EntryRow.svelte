<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import type { Entry } from '$lib/data/types';
  import Avatar from '$lib/ui/Avatar.svelte';
  import Money from '$lib/ui/Money.svelte';
  import PersonChip from '$lib/ui/PersonChip.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { kindIcon } from '$lib/ui/look';
  import { accountOf, categoryOf, costOf, kindOf } from '$lib/features/model';

  let { entry, onclick, selected = null }: { entry: Entry; onclick?: () => void; selected?: boolean | null } = $props();
  const category = $derived(categoryOf(entry));
  const merchant = $derived(entry.merchant_id ? store.merchantById.get(entry.merchant_id) : undefined);
  const person = $derived(entry.person_id ? store.personById.get(entry.person_id) : undefined);
  const account = $derived(accountOf(entry));
  const transfer = $derived(kindOf(entry) === 'transfer');
</script>

<button class="card tight entry" {onclick} aria-pressed={selected ?? undefined}>
  {#if selected !== null}
    <span class="check" class:on={selected}><Icon name={selected ? 'check-circle' : 'circle'} size={22} /></span>
  {/if}
  <Avatar merchant={merchant ?? null} category={category ?? null} name={entry.title} />
  <span class="grow text">
    <span class="title ellipsis">{entry.title}</span>
    <span class="meta ellipsis">
      {#if category}<span style:color={category.color}>{category.name}</span>{/if}
      {#if entry.installment_total > 1}<span class="pill tag">{entry.installment_current}/{entry.installment_total}</span>{/if}
      {#if kindOf(entry) === 'expense' && costOf(entry) === 'fixed'}<span class="pill fixed">Fixo</span>{/if}
    </span>
  </span>
  <span class="right">
    <Money cents={entry.amount_cents} muted={transfer} class="amount" />
    <span class="row" style="gap: 6px">
      {#if transfer}<span class="caption">não conta</span>{/if}
      {#if person}<PersonChip {person} />{/if}
      {#if account}<span class="faint" title={account.name}><Icon name={kindIcon[account.kind]} size={13} /></span>{/if}
    </span>
  </span>
</button>

<style>
  .entry { display: flex; align-items: center; gap: 14px; width: 100%; text-align: left; transition: background 0.2s, transform 0.15s var(--ease); }
  .entry:hover { background: rgba(26, 34, 31, 0.95); }
  .entry:active { transform: scale(0.99); }
  .text { display: flex; flex-direction: column; gap: 3px; }
  .title { font-size: 16.5px; }
  .meta { display: flex; gap: 6px; align-items: center; font-size: 13px; color: var(--text-2); }
  .tag { background: rgba(255, 255, 255, 0.08); color: var(--text-2); }
  .fixed { background: var(--accent-soft); color: var(--accent); }
  .right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex: none; }
  .right :global(.amount) { font-size: 16.5px; font-weight: 500; }
  .check { color: var(--text-3); display: grid; }
  .check.on { color: var(--accent); }
</style>
