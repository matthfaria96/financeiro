<script lang="ts">
  import { money } from '$lib/core/money';
  import type { MonthReport } from '$lib/core/reports';
  import { store } from '$lib/data/store.svelte';
  import Donut from '$lib/ui/Donut.svelte';
  import HBars from '$lib/ui/charts/HBars.svelte';
  import ChangeBadge from '$lib/ui/ChangeBadge.svelte';

  /** Para onde foi o dinheiro do mês (pela data da compra, inclusive no cartão). */
  let { report }: { report: MonthReport } = $props();
  const rows = $derived(report.slices.map((s) => {
    const category = store.categoryByKey.get(s.groupId);
    return { id: s.groupId, label: category?.name ?? 'Outros', value: s.totalCents, color: category?.color ?? '#78909C', icon: category?.symbol ?? 'tag', href: '#/relatorios' };
  }));
  // Até 6 fatias; o resto vira "Outros" (mais cores que isso deixa de ser legível).
  const slices = $derived([
    ...rows.slice(0, 6).map((r) => ({ id: r.id, value: r.value, color: r.color, label: r.label })),
    ...(rows.length > 6 ? [{ id: 'resto', label: 'Outros', color: '#5a6b75', value: rows.slice(6).reduce((s, r) => s + r.value, 0) }] : [])
  ]);
</script>

<section class="card">
  <div class="card-head"><h3>Para onde foi este mês</h3><ChangeBadge change={report.change} /></div>
  <div class="body">
    <Donut size={176} {slices} center={money(report.totalCents, { cents: false })} caption="Gasto no mês" />
    <div class="grow"><HBars {rows} total={report.totalCents} limit={5} /></div>
  </div>
</section>

<style>
  .body { display: flex; gap: 22px; align-items: center; }
  @media (max-width: 560px) { .body { flex-direction: column; align-items: stretch; } .body :global(.donut) { align-self: center; } }
  .grow { min-width: 0; }
</style>
