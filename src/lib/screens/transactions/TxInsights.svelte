<script lang="ts">
  import { money } from '$lib/core/money';
  import { dayMonth, monthOf, shortMonth, addDays, diffDays, type Day } from '$lib/core/dates';
  import { store } from '$lib/data/store.svelte';
  import type { Entry } from '$lib/data/types';
  import BarChart from '$lib/ui/charts/BarChart.svelte';
  import HBars from '$lib/ui/charts/HBars.svelte';
  import Avatar from '$lib/ui/Avatar.svelte';
  import { hint } from '$lib/ui/hint';
  import { seriesColor } from '$lib/ui/charts/scale';
  import { categoryOf, kindOf, rootOf } from '$lib/features/model';
  import { matchKey } from '$lib/features/rules';

  /** Painel ao lado da lista: o que está filtrado em números e gráficos (dia a dia, categorias, lugares). */
  let { entries }: { entries: Entry[] } = $props();
  const counted = $derived(entries.filter((e) => !e.is_mirror && kindOf(e) !== 'transfer'));
  const income = $derived(counted.filter((e) => e.amount_cents > 0).reduce((s, e) => s + e.amount_cents, 0));
  const out = $derived(-counted.filter((e) => e.amount_cents < 0).reduce((s, e) => s + e.amount_cents, 0));
  const expenses = $derived(counted.filter((e) => kindOf(e) === 'expense'));

  // Até ~2 meses: barras por dia; mais que isso: por mês.
  const timeline = $derived.by(() => {
    const dates = expenses.map((e) => e.date).sort();
    if (!dates.length) return null;
    const first = dates[0] as Day;
    const last = dates.at(-1) as Day;
    const daily = diffDays(first, last) <= 62;
    const keys: string[] = [];
    if (daily) for (let d = first; d <= last; d = addDays(d, 1)) keys.push(d);
    else for (let m = monthOf(first); m <= monthOf(last); m = shortNext(m)) keys.push(m);
    const totals = new Map(keys.map((k) => [k, 0]));
    for (const e of expenses) {
      const key = daily ? e.date : monthOf(e.date);
      totals.set(key, (totals.get(key) ?? 0) - e.amount_cents);
    }
    return { daily, labels: keys.map((k) => (daily ? dayMonth(k).slice(0, 5) : shortMonth(k).slice(0, 3))), values: keys.map((k) => Math.max(0, totals.get(k) ?? 0)) };
  });
  function shortNext(month: string): string {
    const [y, m] = month.split('-').map(Number);
    return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  }

  const categories = $derived.by(() => {
    const map = new Map<string, { id: string; label: string; value: number; color: string; icon: string }>();
    for (const e of expenses) {
      const root = rootOf(categoryOf(e));
      const id = root ? matchKey(root) : 'none';
      const row = map.get(id) ?? { id, label: root?.name ?? 'Sem categoria', value: 0, color: root?.color ?? '#78909C', icon: root?.symbol ?? 'tag' };
      row.value -= e.amount_cents;
      map.set(id, row);
    }
    return [...map.values()].toSorted((a, b) => b.value - a.value);
  });
  const places = $derived.by(() => {
    const map = new Map<string, { id: string; cents: number; count: number }>();
    for (const e of expenses) {
      if (!e.merchant_id) continue;
      const row = map.get(e.merchant_id) ?? { id: e.merchant_id, cents: 0, count: 0 };
      row.cents -= e.amount_cents;
      row.count++;
      map.set(e.merchant_id, row);
    }
    return [...map.values()].toSorted((a, b) => b.cents - a.cents).slice(0, 5);
  });
</script>

<aside class="insights">
  <section class="card sums" use:hint={['Resumo', 'Somas do que está filtrado. Transferências entre suas contas e pagamento de fatura ficam de fora.']}>
    <div><span class="caption">Entradas</span><b class="num pos">{money(income, { cents: false })}</b></div>
    <div><span class="caption">Saídas</span><b class="num">{money(out, { cents: false })}</b></div>
    <div><span class="caption">Resultado</span><b class="num" class:pos={income - out >= 0} class:neg={income - out < 0}>{money(income - out, { cents: false })}</b></div>
  </section>
  {#if timeline}
    <section class="card">
      <div class="card-head"><h3>Gastos {timeline.daily ? 'por dia' : 'por mês'}</h3><span class="sub">{expenses.length} lançamentos</span></div>
      <BarChart labels={timeline.labels} height={170} title="Gastos {timeline.daily ? 'por dia' : 'por mês'}" series={[{ id: 'out', name: 'Gastos', color: seriesColor.expense, values: timeline.values }]} />
    </section>
  {/if}
  {#if categories.length}
    <section class="card"><div class="card-head"><h3>Por categoria</h3></div><HBars rows={categories} limit={5} /></section>
  {/if}
  {#if places.length}
    <section class="card">
      <div class="card-head"><h3>Onde mais gastou</h3></div>
      <div class="places">
        {#each places as place (place.id)}
          {@const merchant = store.merchantById.get(place.id)}
          {#if merchant}
            <div class="row place"><Avatar {merchant} category={store.categoryById.get(merchant.category_id ?? '') ?? null} size={36} />
              <span class="grow ellipsis">{merchant.name}<span class="caption"> · {place.count}×</span></span><b class="num">{money(place.cents, { cents: false })}</b></div>
          {/if}
        {/each}
      </div>
    </section>
  {/if}
</aside>

<style>
  .insights { display: flex; flex-direction: column; gap: 16px; }
  @media (min-width: 1100px) { .insights { position: sticky; top: 22px; } }
  .sums { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .sums > div { display: flex; flex-direction: column; gap: 3px; }
  .sums b { font: 600 18px var(--font-display); }
  .places { display: flex; flex-direction: column; gap: 10px; }
  .place { gap: 12px; font-size: 14px; }
</style>
