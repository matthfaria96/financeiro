<script lang="ts">
  import { money, percent } from '$lib/core/money';
  import { shortMonth } from '$lib/core/dates';
  import type { Account, Entry } from '$lib/data/types';
  import BarChart from '$lib/ui/charts/BarChart.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { seriesColor } from '$lib/ui/charts/scale';
  import { analyzeMonth, spendingScale } from '$lib/features/analytics';

  /** Panorama mensal: entradas e saídas dos últimos 6 meses lado a lado, com a média das saídas. */
  let { entries, accounts }: { entries: Entry[]; accounts: Account[] } = $props();
  const scale = $derived(spendingScale(entries, accounts, 6));
  const income = $derived(scale.months.map((m) => analyzeMonth(m, entries, accounts).incomeTotal));
  const diff = $derived(scale.average ? (scale.current - scale.average) / scale.average : null);
</script>

<section class="card">
  <div class="card-head"><h3>Panorama mensal</h3>
    {#if diff !== null && Math.abs(diff) < 0.03}<span class="pill">Gastos na média</span>
    {:else if diff !== null}<span class="pill" class:up={diff > 0} class:down={diff <= 0}><Icon name={diff > 0 ? 'trending-up' : 'trending-down'} size={12} />Gastos {percent(diff)} {diff > 0 ? 'acima' : 'abaixo'} da média</span>{/if}
  </div>
  <BarChart labels={scale.months.map((m) => shortMonth(m).slice(0, 3))} current={scale.months.length - 1} height={190} title="Entradas e saídas por mês"
    series={[{ id: 'in', name: 'Entradas', color: seriesColor.income, values: income }, { id: 'out', name: 'Saídas', color: seriesColor.credit, values: scale.values }]}
    reference={scale.average ? { value: scale.average, label: `média das saídas ${money(scale.average, { cents: false })}` } : null} />
  <p class="caption note">{scale.average === null ? 'Importe meses anteriores para comparar com a sua média.' : `Média das saídas nos ${scale.monthsInAverage} meses anteriores com dados. O mês atual ainda não terminou.`}</p>
</section>

<style>
  .pill { display: inline-flex; align-items: center; gap: 4px; color: var(--text-2); background: rgba(255, 255, 255, 0.07); }
  .pill.up { color: var(--negative); background: rgba(255, 107, 91, 0.14); }
  .pill.down { color: var(--positive); background: rgba(74, 222, 128, 0.14); }
  .note { margin: 8px 0 0; }
</style>
