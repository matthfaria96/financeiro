<script lang="ts">
  import { money } from '$lib/core/money';
  import { dayMonth } from '$lib/core/dates';
  import { ui } from '$lib/ui/ui.svelte';
  import EntryRow from '$lib/screens/EntryRow.svelte';
  import type { Entry } from '$lib/data/types';
  import { prefs } from '$lib/ui/prefs.svelte';

  /** Extrato de um lado (entradas ou saídas) do mês, mais novos primeiro, 15 por vez. */
  let { title, entries, total, tone = '' }: { title: string; entries: Entry[]; total: number; tone?: 'pos' | '' } = $props();
  const sorted = $derived(entries.toSorted((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)));
  // No cartão, a data mostrada é a da compra; embaixo, a fatura em que ela é paga.
  let limit = $state(15);
</script>

<section class="card flush">
  <div class="card-head pad"><h3>{title} <span class="caption">· {entries.length}</span></h3><b class="num {tone}">{money(total)}</b></div>
  <div class="entries">
    {#each sorted.slice(0, limit) as entry (entry.id)}
      {@const due = !prefs.creditByPurchase && entry.bill_due_date ? entry.bill_due_date : null}
      <div class="dated"><span class="day caption" title={due ? `Comprado em ${dayMonth(entry.date)}` : ''}>{dayMonth(entry.date).slice(0, 5)}{#if due}<span class="due">fatura {dayMonth(due).slice(0, 5)}</span>{/if}</span><EntryRow {entry} compact onclick={() => ui.editEntry(entry.id)} /></div>
    {:else}
      <p class="muted small padded">Nada neste mês.</p>
    {/each}
  </div>
  {#if sorted.length > limit}<button class="btn block more" onclick={() => (limit += 15)}>Carregar mais ({sorted.length - limit})</button>{/if}
</section>

<style>
  .pad { padding: 18px 18px 6px; margin: 0; }
  .padded { padding: 12px 18px; margin: 0; }
  .dated { display: flex; align-items: center; }
  .dated + .dated { border-top: 1px solid var(--stroke); }
  .due { display: block; font-size: 10px; color: #b388ff; white-space: nowrap; }
  .day { width: 64px; flex: none; text-align: right; padding-right: 0; font-variant-numeric: tabular-nums; }
  .dated :global(.entry) { flex: 1; min-width: 0; padding-left: 12px; }
  @media (max-width: 600px) { .day { width: 44px; } .dated :global(.entry) { padding-left: 8px; } }
  .more { margin: 6px 16px 16px; width: calc(100% - 32px); }
</style>
