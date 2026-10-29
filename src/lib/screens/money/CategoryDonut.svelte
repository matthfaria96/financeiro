<script lang="ts">
  import { money } from '$lib/core/money';
  import Donut from '$lib/ui/Donut.svelte';
  import type { Group } from '$lib/features/analytics';

  /** Rosca de um lado (saídas ou entradas) com o nome de cada cor; o total fica no centro e os valores ao passar o mouse. */
  let { title, groups, total, empty }: { title: string; groups: Group[]; total: number; empty: string } = $props();
  const slices = $derived([
    ...groups.slice(0, 6).map((g) => ({ id: g.key, label: g.label, value: g.cents, color: g.color })),
    ...(groups.length > 6 ? [{ id: 'resto', label: 'Outros', value: groups.slice(6).reduce((s, g) => s + g.cents, 0), color: '#5a6b75' }] : [])
  ]);
</script>

<section class="card side">
  <div class="card-head"><h3>{title}</h3></div>
  {#if slices.length}
    <div class="center"><Donut size={190} {slices} center={money(total, { cents: false })} caption={title} /></div>
    <div class="legend">{#each slices as s (s.id)}<span class="chip-l"><i style:background={s.color}></i>{s.label}</span>{/each}</div>
  {:else}
    <p class="muted small">{empty}</p>
  {/if}
</section>

<style>
  .side { display: flex; flex-direction: column; gap: 14px; min-width: 0; height: 100%; }
  .legend { margin-top: auto; }
  .card-head { margin-bottom: 0; }
  .center { display: grid; place-items: center; }
  .legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 14px; }
  .chip-l { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--text-2); white-space: nowrap; }
  i { width: 10px; height: 10px; border-radius: 3px; flex: none; }
</style>
