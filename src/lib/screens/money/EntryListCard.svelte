<script lang="ts">
  import { money } from '$lib/core/money';
  import { shortDay } from '$lib/core/dates';
  import { ui } from '$lib/ui/ui.svelte';
  import EntryRow from '$lib/screens/EntryRow.svelte';
  import { spendDate } from '$lib/features/analytics';
  import { prefs } from '$lib/ui/prefs.svelte';
  import type { Entry } from '$lib/data/types';

  /** Extrato de um lado (entradas ou saídas) do mês, mais novos primeiro, 15 por vez. `bare`: só a lista (dentro de outro cartão). */
  let { title = '', entries, total = 0, tone = '', bare = false, empty = 'Nada neste mês.' }: { title?: string; entries: Entry[]; total?: number; tone?: 'pos' | ''; bare?: boolean; empty?: string } = $props();
  const sorted = $derived(entries.toSorted((a, b) => spendDate(b).localeCompare(spendDate(a)) || b.created_at.localeCompare(a.created_at)));
  // No cartão, a data é a da compra (a fatura do mês já é a que vence nele).
  let limit = $state(15);
</script>

{#snippet list()}
  <div class="entries">
    {#each sorted.slice(0, limit) as entry (entry.id)}
      <EntryRow {entry} compact when={shortDay(spendDate(entry))} purchase={prefs.creditByPurchase} onclick={() => ui.editEntry(entry.id)} />
    {:else}
      <p class="muted small padded empty"><span class="dot"></span>{empty}</p>
    {/each}
  </div>
  {#if sorted.length > limit}<button class="btn block more" onclick={() => (limit += 15)}>Carregar mais ({sorted.length - limit})</button>{/if}
{/snippet}

{#if bare}{@render list()}{:else}
<section class="card flush">
  <div class="card-head pad"><h3>{title} <span class="caption">· {entries.length}</span></h3><b class="num {tone}">{money(total)}</b></div>
  {@render list()}
</section>
{/if}

<style>
  .pad { padding: 18px 18px 6px; margin: 0; }
  .padded { padding: 14px 18px 18px; margin: 0; }
  .empty { display: flex; align-items: center; gap: 10px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--text-3); flex: none; }
  .more { margin: 6px 16px 16px; width: calc(100% - 32px); }
</style>
