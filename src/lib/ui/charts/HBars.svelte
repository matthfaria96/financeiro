<script lang="ts">
  import { money, percent } from '$lib/core/money';
  import CategoryIcon from '$lib/ui/CategoryIcon.svelte';
  import { rowPath } from './scale';

  /** Ranking em barras horizontais: ícone, nome, barra (cor da entidade) e valor na ponta. */
  interface Row {
    id: string;
    label: string;
    value: number;
    color: string;
    icon?: string;
    detail?: string;
    href?: string;
  }
  let { rows, total = 0, format = (v: number) => money(v, { cents: false }), limit = 6 }: { rows: Row[]; total?: number; format?: (v: number) => string; limit?: number } = $props();
  const shown = $derived(rows.filter((r) => r.value > 0).slice(0, limit));
  const max = $derived(Math.max(1, ...shown.map((r) => r.value)));
  const sum = $derived(total || rows.reduce((s, r) => s + Math.max(0, r.value), 0));
</script>

<div class="bars">
  {#each shown as row (row.id)}
    <svelte:element this={row.href ? 'a' : 'div'} class="item" href={row.href}>
      {#if row.icon}<CategoryIcon symbol={row.icon} color={row.color} size={30} />{/if}
      <div class="body">
        <div class="top"><span class="ellipsis">{row.label}</span><b class="num">{format(row.value)}</b></div>
        <svg width="100%" height="8" preserveAspectRatio="none" viewBox="0 0 100 8" aria-hidden="true">
          <rect x="0" y="0" width="100" height="8" rx="4" fill="rgba(255,255,255,0.06)" />
          <path d={rowPath(0, 0, Math.max(1.5, (row.value / max) * 100), 8, 4)} fill={row.color} />
        </svg>
        <span class="caption">{row.detail ?? `${percent(row.value / (sum || 1))} do total`}</span>
      </div>
    </svelte:element>
  {/each}
</div>

<style>
  .bars { display: flex; flex-direction: column; gap: 12px; }
  .item { display: flex; gap: 12px; align-items: center; color: inherit; border-radius: 12px; }
  a.item:hover .top span { color: var(--accent); }
  .body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
  .top { display: flex; justify-content: space-between; gap: 10px; font-size: 14px; }
  svg { display: block; border-radius: 4px; }
</style>
