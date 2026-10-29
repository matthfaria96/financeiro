<script lang="ts">
  import { ui } from '$lib/ui/ui.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import EntryRow from '$lib/screens/EntryRow.svelte';
  import type { Entry } from '$lib/data/types';

  /** Os últimos lançamentos, com os logos: toque para corrigir categoria ou dono. */
  let { entries }: { entries: Entry[] } = $props();
  const recent = $derived(entries.filter((e) => !e.is_mirror).toSorted((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)).slice(0, 6));
</script>

<section class="card flush">
  <div class="card-head pad"><h3>Últimos lançamentos</h3><a class="sub link" href="#/transacoes">Ver todos <Icon name="chevron-right" size={12} /></a></div>
  <div class="entries">{#each recent as entry (entry.id)}<EntryRow {entry} compact onclick={() => ui.editEntry(entry.id)} />{/each}</div>
</section>

<style>
  .pad { padding: 18px 18px 4px; margin: 0; }
  .link { display: inline-flex; align-items: center; gap: 2px; color: var(--accent); font-weight: 600; }
</style>
