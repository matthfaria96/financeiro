<script lang="ts">
  import { addMonths, dayMonth, monthOf, shortMonth, today } from '$lib/core/dates';
  import { logKindColor, logKindShort, type LogKind, type Vehicle } from '$lib/data/organizerTypes';
  import LineChart from '$lib/ui/charts/LineChart.svelte';
  import BarChart from '$lib/ui/charts/BarChart.svelte';
  import { fuelInfo, fuelsOf, logsOf } from '$lib/features/car';

  /** Consumo (km/L) e preço do litro por abastecimento, e gasto do carro por mês empilhado por tipo. */
  let { vehicle }: { vehicle: Vehicle } = $props();
  const fills = $derived(fuelsOf(vehicle).toReversed().slice(-24));
  const stats = $derived(fuelInfo(vehicle).stats);
  const efficiency = $derived(fills.map((f) => stats.get(f.id)?.kmPerLiter ?? null));
  const price = $derived(fills.map((f) => stats.get(f.id)?.pricePerLiter ?? null));
  const fillLabels = $derived(fills.map((f) => dayMonth(f.date).slice(0, 5)));
  const decimal = (digits: number, unit: string) => (v: number) => `${v.toFixed(digits).replace('.', ',')}${unit}`;

  const months = $derived(Array.from({ length: 12 }, (_, i) => addMonths(monthOf(today()), i - 11)));
  const series = $derived.by(() => {
    const logs = logsOf(vehicle).filter((l) => monthOf(l.date) >= months[0]);
    const kinds = [...new Set(logs.map((l) => l.kind))] as LogKind[];
    const totals = kinds.map((kind) => ({ kind, sum: logs.filter((l) => l.kind === kind).reduce((s, l) => s + l.amount_cents, 0) })).toSorted((a, b) => b.sum - a.sum);
    // Os 5 tipos que mais pesam; o resto vira "Outros".
    const main = totals.slice(0, 5).map((t) => t.kind);
    const rest = totals.slice(5).map((t) => t.kind);
    const sumFor = (filter: (kind: LogKind) => boolean) => months.map((m) => logs.filter((l) => filter(l.kind) && monthOf(l.date) === m).reduce((s, l) => s + l.amount_cents, 0));
    return [
      ...main.map((kind) => ({ id: kind, name: logKindShort[kind], color: logKindColor[kind], stack: 'all', values: sumFor((k) => k === kind) })),
      ...(rest.length ? [{ id: 'rest', name: 'Outros', color: '#5a6b75', stack: 'all', values: sumFor((k) => rest.includes(k)) }] : [])
    ];
  });
</script>

<section class="card">
  <div class="card-head"><h3>Gasto por mês</h3><span class="sub">últimos 12 meses</span></div>
  <BarChart labels={months.map((m) => shortMonth(m).slice(0, 3))} {series} current={11} height={210} title="Gasto do carro por mês e tipo" />
</section>
{#if efficiency.some((v) => v !== null)}
  <div class="grid-2">
    <section class="card"><div class="card-head"><h3>Consumo</h3><span class="sub">km/L a cada tanque cheio</span></div>
      <LineChart labels={fillLabels} height={180} area={false} format={decimal(1, ' km/L')} tick={decimal(1, '')} title="Consumo por abastecimento" series={[{ id: 'kml', name: 'km/L', color: '#2bd4a4', values: efficiency }]} /></section>
    <section class="card"><div class="card-head"><h3>Preço do litro</h3><span class="sub">R$ por litro</span></div>
      <LineChart labels={fillLabels} height={180} area={false} format={decimal(2, ' R$/L')} tick={decimal(2, '')} title="Preço do litro por abastecimento" series={[{ id: 'price', name: 'R$/L', color: '#ff9f1c', values: price }]} /></section>
  </div>
{/if}
