<script lang="ts">
  import { money, percent } from '$lib/core/money';
  import { ui } from '$lib/ui/ui.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import CategoryIcon from '$lib/ui/CategoryIcon.svelte';
  import EntryRow from '$lib/screens/EntryRow.svelte';
  import type { Group } from '$lib/features/analytics';

  /** Entradas ou saídas por categoria. Toque na categoria para ver os lançamentos dela. */
  let { title, groups, total, tone = '' }: { title: string; groups: Group[]; total: number; tone?: 'pos' | '' } = $props();
  let open = $state<Set<string>>(new Set());
  function toggle(key: string) {
    const next = new Set(open);
    next.has(key) ? next.delete(key) : next.add(key);
    open = next;
  }
</script>

<section class="card flush">
  <div class="card-head pad"><h3>{title}</h3></div>
  {#each groups as g (g.key)}
    <button class="row line" onclick={() => toggle(g.key)} aria-expanded={open.has(g.key)}>
      <Icon name={open.has(g.key) ? 'chevron-down' : 'chevron-right'} size={14} class="faint" />
      <CategoryIcon symbol={g.icon} color={g.color} size={32} />
      <span class="grow ellipsis">{g.label}</span>
      <span class="caption share">{percent(g.share)}</span>
      <span class="num value">{money(g.cents)}</span>
    </button>
    <div class="bar"><span style:width="{g.share * 100}%" style:background={g.color}></span></div>
    {#if open.has(g.key)}
      <div class="entries inner">{#each g.entries as entry (entry.id)}<EntryRow {entry} compact onclick={() => ui.editEntry(entry.id)} />{/each}</div>
    {/if}
  {:else}
    <p class="muted small pad">Nada neste mês.</p>
  {/each}
  <div class="row between total pad"><span class="muted">Total</span><b class="num {tone}">{money(total)}</b></div>
</section>

<style>
  .pad { padding: 18px 18px 6px; margin: 0; }
  .line { width: 100%; gap: 10px; padding: 10px 18px 6px 14px; background: none; border: 0; text-align: left; font-size: 15px; }
  .line:hover { background: rgba(255, 255, 255, 0.03); }
  .share { width: 44px; text-align: right; }
  .value { min-width: 96px; text-align: right; }
  .bar { height: 3px; margin: 0 18px 4px 70px; border-radius: 2px; background: rgba(255, 255, 255, 0.05); overflow: hidden; }
  .bar span { display: block; height: 100%; border-radius: 2px; }
  .inner { margin: 4px 12px 10px 40px; border-left: 2px solid var(--stroke); }
  .total { padding: 14px 18px 18px; border-top: 1px solid var(--stroke-strong); margin-top: 6px; }
  .total b { font: 600 20px var(--font-display); }
</style>
