<script lang="ts">
  import { money, percent } from '$lib/core/money';
  import { shortMonth } from '$lib/core/dates';
  import type { Account, Entry } from '$lib/data/types';
  import BarChart from '$lib/ui/charts/BarChart.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { seriesColor } from '$lib/ui/charts/scale';
  import { spendingScale } from '$lib/features/analytics';

  /** Gastos dos últimos 6 meses com a linha da média: este mês está acima ou abaixo do normal? */
  let { entries, accounts }: { entries: Entry[]; accounts: Account[] } = $props();
  const scale = $derived(spendingScale(entries, accounts, 6));
  const diff = $derived(scale.average ? (scale.current - scale.average) / scale.average : null);
</script>

<section class="card">
  <div class="card-head"><h3>Gastos por mês</h3>
    {#if diff !== null && Math.abs(diff) < 0.03}<span class="pill">Na média</span>
    {:else if diff !== null}<span class="pill" class:up={diff > 0} class:down={diff <= 0}><Icon name={diff > 0 ? 'trending-up' : 'trending-down'} size={12} />{percent(diff)} {diff > 0 ? 'acima' : 'abaixo'} da média</span>{/if}
  </div>
  <BarChart labels={scale.months.map((m) => shortMonth(m).slice(0, 3))} current={scale.months.length - 1} height={170} title="Gastos por mês com a média"
    series={[{ id: 'out', name: 'Gastos', color: seriesColor.credit, values: scale.values }]}
    reference={scale.average ? { value: scale.average, label: `média ${money(scale.average, { cents: false })}` } : null} />
  <p class="caption note">{scale.average === null ? 'Importe meses anteriores para comparar com a sua média.' : `Média dos ${scale.monthsInAverage} meses anteriores com dados. O mês atual ainda não terminou.`}</p>
</section>

<style>
  .pill { display: inline-flex; align-items: center; gap: 4px; color: var(--text-2); background: rgba(255, 255, 255, 0.07); }
  .pill.up { color: var(--negative); background: rgba(255, 107, 91, 0.14); }
  .pill.down { color: var(--positive); background: rgba(74, 222, 128, 0.14); }
  .note { margin: 8px 0 0; }
</style>
