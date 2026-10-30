<script lang="ts">
  import { goto } from '$app/navigation';
  import { money } from '$lib/core/money';
  import { addMonths, monthOf, shortMonth, today } from '$lib/core/dates';
  import type { Account, Entry } from '$lib/data/types';
  import Icon from '$lib/ui/Icon.svelte';
  import Tally from '$lib/ui/Tally.svelte';
  import { ui } from '$lib/ui/ui.svelte';
  import BarChart from '$lib/ui/charts/BarChart.svelte';
  import CornerButton from '$lib/ui/CornerButton.svelte';
  import Sheet from '$lib/ui/Sheet.svelte';
  import { seriesColor } from '$lib/ui/charts/scale';
  import ForecastInfo from '$lib/screens/forecast/ForecastInfo.svelte';
  import { expectedIncome } from '$lib/features/analytics';
  import { forecastSpending } from '$lib/features/spending';

  /**
   * Previsão dos próximos 3 meses, simples: quanto você deve ter no fim de cada mês
   * (o dinheiro de hoje + o que costuma entrar − o que deve sair), num gráfico, e quanto sai em cada mês.
   */
  let { accounts, entries }: { accounts: Account[]; entries: Entry[] } = $props();
  const now = monthOf(today());
  const months = [1, 2, 3].map((i) => addMonths(now, i));
  const forecasts = $derived(forecastSpending(months, entries, accounts));
  const income = $derived(expectedIncome(entries, accounts));
  let info = $state(false);
  const outNext = $derived(forecasts.reduce((s, f) => s + f.total, 0));
  const inNext = $derived(income.cents * 3);

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

<!-- Minimalista: quanto deve sobrar, ganhos × gastos por mês (toque num mês para ver o detalhe) e o link de detalhes. -->
<section class="card">
  <div class="head">
    <h3>Previsão</h3>
    <CornerButton icon="info" label="Como a previsão é calculada" detail="De onde vêm os ganhos e os gastos previstos." onclick={() => (info = true)} />
  </div>
  <div class="lead">
    <span class="caption">Deve sobrar nos próximos 3 meses</span>
    <b class="big" class:pos={inNext - outNext >= 0} class:neg={inNext - outNext < 0}><Tally cents={inNext - outNext} showCents={false} /></b>
    <span class="caption">entra {money(inNext, { cents: false })} · sai {money(outNext, { cents: false })}</span>
  </div>
  <div class="chart"><BarChart labels={months.map((m) => shortMonth(m).slice(0, 3))} height={wide ? 220 : 170} title="Ganhos e gastos previstos por mês" onselect={(i) => open(months[i])}
    series={[{ id: 'in', name: 'Ganhos', color: seriesColor.income, values: months.map(() => income.cents) }, { id: 'out', name: 'Gastos', color: '#f06a7e', values: forecasts.map((f) => f.total) }]} /></div>
  <div class="foot"><button class="more" onclick={() => open(null)}>Ver detalhes <Icon name="chevron-right" size={13} /></button></div>
</section>
<Sheet bind:open={info} title="Como a previsão é calculada"><div class="sheet-info"><ForecastInfo open base={forecasts[0]?.base ?? 0} /></div></Sheet>

<style>
  .head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .foot { margin-top: auto; padding-top: 12px; }
  .more { font-size: 13.5px; }
  .sheet-info { padding-top: 10px; }
  .head h3 { flex: 1; margin: 0; font: 600 16px var(--font-display); letter-spacing: -0.01em; }
  .more { display: inline-flex; align-items: center; gap: 2px; padding: 0; border: 0; background: none; color: var(--accent); font-size: 13.5px; font-weight: 600; transition: gap 0.25s var(--ease); }
  .more:hover { gap: 6px; }
  .lead { display: flex; flex-direction: column; gap: 3px; margin-bottom: 6px; }
  .big { font: 600 32px/1.1 var(--font-display); letter-spacing: -0.02em; margin: 2px 0; }
  /* Os 4 cartões têm a altura do maior: o gráfico estica e a folga não sobra embaixo. */
  .card { display: flex; flex-direction: column; }
  .chart { margin: 4px 0 10px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
  @container home (min-width: 860px) {
    .card { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); column-gap: 40px; padding: 24px 26px; }
    .head { grid-column: 1 / -1; }
    .lead, .foot { grid-column: 1; }
    .foot { align-self: end; }
    .chart { grid-column: 2; grid-row: 2 / span 2; align-self: center; margin: 0; }
    .big { font-size: 42px; }
  }
</style>
