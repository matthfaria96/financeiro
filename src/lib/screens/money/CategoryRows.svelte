<script lang="ts">
  import { money, percent } from '$lib/core/money';
  import { dayMonth } from '$lib/core/dates';
  import { ui } from '$lib/ui/ui.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import CategoryIcon from '$lib/ui/CategoryIcon.svelte';
  import ChangeBadge from '$lib/ui/ChangeBadge.svelte';
  import EntryRow from '$lib/screens/EntryRow.svelte';
  import type { Group } from '$lib/features/analytics';

  /** Categorias expansíveis: barra de fundo com a fatia, % e valor, variação para o mês anterior; toque abre os lançamentos. */
  let { groups, previous = [] }: { groups: Group[]; previous?: Group[] } = $props();
  let open = $state<Set<string>>(new Set());
  const before = $derived(new Map(previous.map((g) => [g.key, g.cents])));
  const change = (g: Group) => { const old = before.get(g.key); return old ? (g.cents - old) / old : null; };
  function toggle(key: string) {
    const next = new Set(open);
    next.has(key) ? next.delete(key) : next.add(key);
    open = next;
  }
</script>

<div class="rows">
  {#each groups as g (g.key)}
    <button class="slice" style:--c={g.color} style:--w="{g.share * 100}%" onclick={() => toggle(g.key)} aria-expanded={open.has(g.key)}>
      <CategoryIcon symbol={g.icon} color={g.color} size={38} />
      <span class="grow name"><span class="ellipsis">{g.label}</span><span class="caption">{percent(g.share)} · {g.entries.length}</span></span>
      <span class="val"><span class="num">{money(g.cents, { cents: false })}</span><ChangeBadge change={change(g)} /></span>
      <Icon name={open.has(g.key) ? 'chevron-up' : 'chevron-down'} size={15} class="faint" />
    </button>
    {#if open.has(g.key)}
      <div class="inner entries">
        {#each g.entries as entry (entry.id)}<div class="dated"><span class="day caption">{dayMonth(entry.date).slice(0, 5)}</span><EntryRow {entry} compact onclick={() => ui.editEntry(entry.id)} /></div>{/each}
      </div>
    {/if}
  {:else}
    <p class="muted small">Nada neste mês.</p>
  {/each}
</div>

<style>
  .rows { display: flex; flex-direction: column; gap: 8px; }
  .slice { position: relative; display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-radius: 16px; border: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.025); overflow: hidden; text-align: left; width: 100%; }
  .slice::before { content: ''; position: absolute; inset: 0 auto 0 0; width: var(--w); background: color-mix(in srgb, var(--c) 18%, transparent); }
  .slice > :global(*) { position: relative; }
  .slice:hover { border-color: var(--stroke-strong); }
  .name { display: flex; flex-direction: column; gap: 1px; min-width: 0; font-size: 15px; }
  .val { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; white-space: nowrap; font-size: 15px; }
  .inner { margin: -2px 0 4px 18px; border-left: 2px solid var(--stroke); }
  .dated { display: flex; align-items: center; }
  .day { width: 46px; flex: none; text-align: right; }
  .dated :global(.entry) { flex: 1; min-width: 0; }
</style>
