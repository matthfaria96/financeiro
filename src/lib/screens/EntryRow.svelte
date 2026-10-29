<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import type { Entry } from '$lib/data/types';
  import Avatar from '$lib/ui/Avatar.svelte';
  import Money from '$lib/ui/Money.svelte';
  import PersonChip from '$lib/ui/PersonChip.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { kindIcon } from '$lib/ui/look';
  import { accountOf, categoryOf, costOf, kindOf } from '$lib/features/model';
  import { prefs } from '$lib/ui/prefs.svelte';

  let { entry, onclick, selected = null, compact = false, lead }: { entry: Entry; onclick?: () => void; selected?: boolean | null; compact?: boolean; /** Algo antes do avatar (ex.: a data), dentro da mesma linha clicável. */ lead?: import('svelte').Snippet } = $props();
  const category = $derived(categoryOf(entry));
  const merchant = $derived(entry.merchant_id ? store.merchantById.get(entry.merchant_id) : undefined);
  const person = $derived(entry.person_id ? store.personById.get(entry.person_id) : undefined);
  const account = $derived(accountOf(entry));
  const transfer = $derived(kindOf(entry) === 'transfer');
  // Visão simples: a pessoa só aparece quando não é a dona da conta (o que foge do normal).
  const showPerson = $derived(!compact && person && (prefs.full || person.id !== account?.default_person_id));
</script>

<button class="entry" class:has-lead={!!lead} {onclick} aria-pressed={selected ?? undefined}>
  {#if lead}{@render lead()}{/if}
  {#if selected !== null}
    <span class="check" class:on={selected}><Icon name={selected ? 'check-circle' : 'circle'} size={22} /></span>
  {/if}
  <Avatar merchant={merchant ?? null} category={category ?? null} name={entry.title} />
  <span class="grow text">
    <span class="title ellipsis">{entry.title}</span>
    <span class="meta ellipsis">
      {#if category}<span style:color={category.color}>{category.name}</span>{/if}
      {#if entry.installment_total > 1}<span class="pill tag">{entry.installment_current}/{entry.installment_total}</span>{/if}
      {#if prefs.full && kindOf(entry) === 'expense' && costOf(entry) === 'fixed'}<span class="pill fixed">Fixo</span>{/if}
    </span>
  </span>
  <span class="right">
    <Money cents={entry.amount_cents} muted={transfer} class="amount" />
    <span class="row" style="gap: 6px">
      {#if transfer}<span class="caption">não conta</span>{/if}
      {#if showPerson && person}<PersonChip {person} />{/if}
      {#if account && prefs.full && !compact}<span class="faint" title={account.name}><Icon name={kindIcon[account.kind]} size={13} /></span>{/if}
    </span>
  </span>
</button>

<style>
  .entry { display: flex; align-items: center; gap: 14px; width: 100%; text-align: left; padding: 11px 16px; border: 0; background: none; transition: background 0.2s, transform 0.2s var(--ease); }
  .entry.has-lead { padding-left: 8px; gap: 12px; }
  .entry:hover { background: rgba(255, 255, 255, 0.045); }
  .entry:active { background: rgba(255, 255, 255, 0.07); transform: scale(0.995); }
  :global(.entries) > :global(.entry + .entry) { border-top: 1px solid var(--stroke); }
  .text { display: flex; flex-direction: column; gap: 3px; }
  .title { font-size: 15.5px; }
  .meta { display: flex; gap: 6px; align-items: center; font-size: 13px; color: var(--text-2); }
  .tag { background: rgba(255, 255, 255, 0.08); color: var(--text-2); }
  .fixed { background: var(--accent-soft); color: var(--accent); }
  .right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex: none; }
  .right :global(.amount) { font-size: 15.5px; font-weight: 600; }
  .check { color: var(--text-3); display: grid; }
  .check.on { color: var(--accent); }
</style>
