<script lang="ts">
  import { money } from '$lib/core/money';
  import { addMonths, monthOf, shortMonth, today } from '$lib/core/dates';
  import type { Account, Entry } from '$lib/data/types';
  import Tally from '$lib/ui/Tally.svelte';
  import LineChart from '$lib/ui/charts/LineChart.svelte';
  import { expectedIncome, monthEndTotal } from '$lib/features/analytics';
  import { forecastSpending } from '$lib/features/spending';

  /** Saldo previsto (2º cartão do Seu dinheiro): quanto você deve ter no fim de cada um dos próximos 3 meses. */
  let { accounts, entries }: { accounts: Account[]; entries: Entry[] } = $props();
  const now = monthOf(today());
  const months = [1, 2, 3].map((i) => addMonths(now, i));
  const forecasts = $derived(forecastSpending(months, entries, accounts));
  const income = $derived(expectedIncome(entries, accounts));
  const start = $derived(monthEndTotal(now, accounts));
  const balances = $derived(forecasts.reduce<number[]>((list, f) => [...list, (list.at(-1) ?? start) + income.cents - f.total], []));
  const last = $derived(balances.at(-1) ?? start);
  let wide = $state(false);
  $effect(() => {
    const mq = matchMedia('(min-width: 1100px)');
    wide = mq.matches;
    const on = () => (wide = mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  });
</script>

<section class="card">
  <div class="head"><h3>Saldo previsto</h3></div>
  <div class="lead">
    <span class="caption">Você deve ter no fim de {shortMonth(months[2]).slice(0, 3).toLowerCase()}</span>
    <b class="big" class:neg={last < 0}><Tally cents={last} showCents={false} /></b>
    <span class="caption">hoje {money(start, { cents: false })} · {last >= start ? '+' : '−'}{money(Math.abs(last - start), { cents: false })} em 3 meses</span>
  </div>
  <div class="chart"><LineChart labels={['Hoje', ...months.map((m) => shortMonth(m).slice(0, 3))]} height={wide ? 210 : 150} title="Dinheiro previsto no fim de cada mês" series={[{ id: 'bal', name: 'Previsto', color: '#2bd4a4', values: [start, ...balances] }]} /></div>
  <div class="months">
    {#each months as m, i (m)}<div class="m"><span class="caption">Fim de {shortMonth(m).slice(0, 3).toLowerCase()}</span><b class="num">{money(balances[i], { cents: false })}</b></div>{/each}
  </div>
  <p class="caption faint note">Hoje + o que costuma entrar − o que deve sair a cada mês.</p>
</section>

<style>
  .head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .head h3 { flex: 1; margin: 0; font: 600 16px var(--font-display); letter-spacing: -0.01em; }
  .lead { display: flex; flex-direction: column; gap: 3px; margin-bottom: 6px; }
  .big { font: 600 32px/1.1 var(--font-display); letter-spacing: -0.02em; margin: 2px 0; }
  /* Os 4 cartões têm a altura do maior: o gráfico estica e a folga não sobra embaixo. */
  .card { display: flex; flex-direction: column; }
  .chart { margin: 4px 0 10px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
  .months { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .m { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; padding: 10px 12px; border-radius: 14px; border: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.03); text-align: left; color: inherit; transition: background 0.2s, transform 0.2s var(--spring); }
  .m:hover { background: rgba(255, 255, 255, 0.06); }
  .m:active { transform: scale(0.97); }
  .m b { font-size: 15px; font-weight: 600; white-space: nowrap; }
  .note { margin: 10px 0 0; }
  @container home (min-width: 860px) {
    .card { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); column-gap: 40px; padding: 24px 26px; }
    .head { grid-column: 1 / -1; }
    .lead, .months, .note { grid-column: 1; }
    .chart { grid-column: 2; grid-row: 2 / span 3; align-self: center; margin: 0; }
    .big { font-size: 42px; }
  }
</style>
