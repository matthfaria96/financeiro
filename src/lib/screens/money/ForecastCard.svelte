<script lang="ts">
  import { goto } from '$app/navigation';
  import { money } from '$lib/core/money';
  import { addMonths, monthOf, shortMonth, today } from '$lib/core/dates';
  import type { Account, Entry } from '$lib/data/types';
  import Icon from '$lib/ui/Icon.svelte';
  import Tally from '$lib/ui/Tally.svelte';
  import { hint } from '$lib/ui/hint';
  import { ui } from '$lib/ui/ui.svelte';
  import LineChart from '$lib/ui/charts/LineChart.svelte';
  import BarChart from '$lib/ui/charts/BarChart.svelte';
  import Carousel from '$lib/ui/Carousel.svelte';
  import { seriesColor } from '$lib/ui/charts/scale';
  import ForecastInfo from '$lib/screens/forecast/ForecastInfo.svelte';
  import { analyzeMonth, expectedIncome, monthEndTotal } from '$lib/features/analytics';
  import { forecastSpending, monthSpend, spendKindColor, spendKindName, spendKinds } from '$lib/features/spending';

  /**
   * Previsão dos próximos 3 meses, simples: quanto você deve ter no fim de cada mês
   * (o dinheiro de hoje + o que costuma entrar − o que deve sair), num gráfico, e quanto sai em cada mês.
   */
  let { accounts, entries }: { accounts: Account[]; entries: Entry[] } = $props();
  const now = monthOf(today());
  const months = [1, 2, 3].map((i) => addMonths(now, i));
  const forecasts = $derived(forecastSpending(months, entries, accounts));
  const income = $derived(expectedIncome(entries, accounts));
  const start = $derived(monthEndTotal(now, accounts));
  // Saldo previsto no fim de cada mês, acumulando.
  const balances = $derived(forecasts.reduce<number[]>((list, f) => [...list, (list.at(-1) ?? start) + income.cents - f.total], []));
  const last = $derived(balances.at(-1) ?? start);
  let info = $state(false);
  // Para comparar: os 3 meses de antes (reais) e os 3 de depois (previstos, mais apagados no gráfico).
  const pastMonths = [-2, -1, 0].map((i) => addMonths(now, i));
  const axis = $derived([...pastMonths, ...months].map((m) => shortMonth(m).slice(0, 3)));
  const pastSpend = $derived(pastMonths.map((m) => monthSpend(m, entries)));
  const pastIncome = $derived(pastMonths.map((m) => analyzeMonth(m, entries, accounts).incomeTotal));
  const outNext = $derived(forecasts.reduce((s, f) => s + f.total, 0));
  const inNext = $derived(income.cents * 3);
  const kindValue = (f: (typeof forecasts)[number], k: (typeof spendKinds)[number]) => (k === 'fixed' ? f.fixed.total : k === 'variable' ? f.variable.total : f.seasonal.cents);

  function open(month: string | null) {
    ui.forecastMonth = month;
    void goto('#/previsao');
  }
  // Computador: o gráfico ocupa a metade direita do cartão, então pode ser mais alto.
  let wide = $state(false);
  $effect(() => {
    const mq = matchMedia('(min-width: 1100px)');
    wide = mq.matches;
    const on = () => (wide = mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<section class="card" onpointerleave={(e) => { if (e.pointerType === 'mouse') info = false; }}>
  <div class="head">
    <h3>Previsão</h3>
    <button class="icon-btn info" class:on={info} aria-label="Como a previsão é calculada" aria-expanded={info} onclick={() => (info = !info)}><Icon name="info" size={15} /></button>
    <button class="more" onclick={() => open(null)} use:hint={['Detalhes', 'Cada mês por fixas, variáveis e sazonais.']}>Detalhes <Icon name="chevron-right" size={14} /></button>
  </div>
  <ForecastInfo open={info} base={forecasts[0]?.base ?? 0} />
  <div class="lead">
    <span class="caption">Deve sobrar nos próximos 3 meses</span>
    <b class="big" class:pos={inNext - outNext >= 0} class:neg={inNext - outNext < 0}><Tally cents={inNext - outNext} showCents={false} /></b>
    <span class="caption">entra {money(inNext, { cents: false })} · sai {money(outNext, { cents: false })}</span>
  </div>
  <!-- Cada mês: a barra de ganhos previstos e, ao lado, as despesas empilhadas em fixas, variáveis e sazonais. -->
  <div class="chart"><BarChart labels={months.map((m) => shortMonth(m).slice(0, 3))} height={wide ? 220 : 170} title="Ganhos e despesas previstos por mês"
    series={[{ id: 'in', name: 'Ganhos', color: seriesColor.income, stack: 'in', values: months.map(() => income.cents) },
      ...spendKinds.map((k) => ({ id: k, name: spendKindName[k], color: spendKindColor[k], stack: 'out', values: forecasts.map((f) => kindValue(f, k)) }))]} /></div>
  <div class="months">
    {#each forecasts as f (f.month)}
      {@const left = income.cents - f.total}
      <button class="m" onclick={() => open(f.month)}><span class="caption">{shortMonth(f.month).slice(0, 3)}</span><b class="num" class:pos={left >= 0} class:neg={left < 0}>{left >= 0 ? '+' : '−'}{money(Math.abs(left), { cents: false })}</b><span class="caption faint">sai {money(f.total, { cents: false })}</span></button>
    {/each}
  </div>
  <p class="caption faint note">Ganhos pela média dos últimos meses; despesas: fixas pelo valor cadastrado, variáveis e sazonais pela média.</p>
</section>

<style>
  .head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .head h3 { flex: 1; margin: 0; font: 600 16px var(--font-display); letter-spacing: -0.01em; }
  .info { width: 30px; height: 30px; flex: none; color: var(--text-2); }
  .info.on { color: var(--accent); border-color: rgba(43, 212, 164, 0.4); background: var(--accent-soft); }
  .more { display: inline-flex; align-items: center; gap: 2px; padding: 0; border: 0; background: none; color: var(--accent); font-size: 13.5px; font-weight: 600; transition: gap 0.25s var(--ease); }
  .more:hover { gap: 6px; }
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
    .head, .card > :global(div.info) { grid-column: 1 / -1; }
    .lead, .months, .note { grid-column: 1; }
    .chart { grid-column: 2; grid-row: 2 / span 3; align-self: center; margin: 0; }
    .big { font-size: 42px; }
  }
</style>
