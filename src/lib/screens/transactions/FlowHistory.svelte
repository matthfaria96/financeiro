<script lang="ts">
  import { addMonths, monthOf, shortMonth, today, type Month } from '$lib/core/dates';
  import { money } from '$lib/core/money';
  import type { Account, Entry } from '$lib/data/types';
  import BarChart from '$lib/ui/charts/BarChart.svelte';
  import { seriesColor } from '$lib/ui/charts/scale';
  import { analyzeMonth } from '$lib/features/analytics';

  /**
   * Entradas × saídas, compacto: 24 meses numa faixa que se arrasta para os lados (começa no mês atual).
   * Tocar numa coluna filtra a lista por aquele mês.
   */
  let { entries, accounts, selected, onpick }: { entries: Entry[]; accounts: Account[]; selected: Month | null; onpick: (month: Month) => void } = $props();
  const now = monthOf(today());
  const first = $derived(entries.reduce((m, e) => (e.date < m ? e.date : m), now + '-31').slice(0, 7));
  const months = $derived(Array.from({ length: 24 }, (_, i) => addMonths(now, i - 23)).filter((m) => m >= first || m >= addMonths(now, -5)));
  const per = $derived(months.map((m) => analyzeMonth(m, entries, accounts)));
  const active = $derived(months.indexOf(selected ?? now));
  const sel = $derived(per[active]);
  const COL = 56;
  let box = $state<HTMLDivElement>();
  $effect(() => {
    void months.length;
    if (box) box.scrollLeft = box.scrollWidth;
  });
</script>

<section class="card flow">
  <div class="head">
    <h3>Entradas × saídas</h3>
    {#if sel}<span class="caption">{shortMonth(months[active]).slice(0, 3)}: <b class="pos">{money(sel.incomeTotal, { cents: false })}</b> · <b class="neg">{money(sel.expenseTotal, { cents: false })}</b></span>{/if}
  </div>
  <div class="scroll" bind:this={box}>
    <div style:width="{Math.max(months.length * COL, 300)}px">
      <BarChart labels={months.map((m) => shortMonth(m).slice(0, 3))} current={active} height={130} title="Entradas e saídas por mês" onselect={(i) => onpick(months[i])}
        series={[{ id: 'in', name: 'Entradas', color: seriesColor.income, values: per.map((p) => p.incomeTotal) }, { id: 'out', name: 'Saídas', color: seriesColor.expense, values: per.map((p) => p.expenseTotal) }]} />
    </div>
  </div>
  <p class="caption faint hint-line">Arraste para ver meses anteriores · toque para filtrar</p>
</section>

<style>
  .flow { padding: 14px 16px 10px; }
  .head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
  .head h3 { margin: 0; font: 600 15px var(--font-display); }
  .head b { font-weight: 600; }
  .scroll { overflow-x: auto; scrollbar-width: none; -webkit-mask-image: linear-gradient(90deg, transparent, #000 24px); mask-image: linear-gradient(90deg, transparent, #000 24px); }
  .scroll::-webkit-scrollbar { display: none; }
  .hint-line { margin: 4px 0 0; font-size: 11.5px; }
</style>
