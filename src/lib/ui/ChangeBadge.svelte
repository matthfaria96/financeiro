<script lang="ts">
  import { percent } from '$lib/core/money';
  import Icon from './Icon.svelte';
  /** ↘ 12% verde quando o gasto caiu; para receitas, subir é bom. */
  let { change, higherIsBetter = false }: { change: number | null; higherIsBetter?: boolean } = $props();
  const visible = $derived(change !== null && Math.abs(change) >= 0.005);
  const up = $derived((change ?? 0) > 0);
  const good = $derived(up === higherIsBetter);
</script>

{#if visible}
  <span class="badge num" class:pos={good} class:neg={!good} aria-label={`${up ? 'Subiu' : 'Caiu'} ${percent(change ?? 0)}`}>
    <Icon name={up ? 'trending-up' : 'trending-down'} size={13} stroke={2.5} />{percent(change ?? 0)}
  </span>
{/if}

<style>
  .badge { display: inline-flex; align-items: center; gap: 3px; font-size: 14px; font-weight: 600; }
</style>
