<script lang="ts">
  import { shortMonth, type Month } from '$lib/core/dates';
  import BarChart from '$lib/ui/charts/BarChart.svelte';
  import { seriesColor } from '$lib/ui/charts/scale';
  import { totalPaid, type MonthFlow } from '$lib/features/month';

  /** Entrou × saiu da conta × comprado no crédito, mês a mês. */
  let { history, onselect, selected = null, title = 'Entrou e saiu' }: { history: { month: Month; flow: MonthFlow }[]; onselect?: (month: Month) => void; selected?: Month | null; title?: string } = $props();
  const current = $derived(selected ? history.findIndex((h) => h.month === selected) : history.length - 1);
</script>

<section class="card">
  <div class="card-head"><h3>{title}</h3><a class="sub link" href="#/relatorios/planilha">Mês a mês</a></div>
  <BarChart
    labels={history.map((h) => shortMonth(h.month).slice(0, 3))}
    {current}
    onselect={onselect ? (i) => onselect!(history[i].month) : undefined}
    title="Entrou, saiu da conta e comprado no crédito por mês"
    series={[
      { id: 'in', name: 'Entrou', color: seriesColor.income, values: history.map((h) => h.flow.income) },
      { id: 'out', name: 'Saiu da conta', color: seriesColor.account, values: history.map((h) => totalPaid(h.flow)) },
      { id: 'credit', name: 'Comprado no crédito', color: seriesColor.credit, values: history.map((h) => h.flow.creditPurchases) }
    ]} />
  <p class="caption note">"Saiu da conta" já inclui a fatura paga; o crédito é informativo (vai para as próximas faturas).</p>
</section>

<style>
  .link { color: var(--accent); font-weight: 600; }
  .note { margin: 10px 0 0; }
</style>
