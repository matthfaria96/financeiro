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
  import ForecastInfo from '$lib/screens/forecast/ForecastInfo.svelte';
  import { expectedIncome, monthEndTotal } from '$lib/features/analytics';
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
  const start = $derived(monthEndTotal(now, accounts));
  // Saldo previsto no fim de cada mês, acumulando.
  const balances = $derived(forecasts.reduce<number[]>((list, f) => [...list, (list.at(-1) ?? start) + income.cents - f.total], []));
  const last = $derived(balances.at(-1) ?? start);
  let info = $state(false);

  function open(month: string | null) {
    ui.forecastMonth = month;
    void goto('#/previsao');
  }
</script>

<section class="card">
  <div class="head">
    <h3>Previsão</h3>
    <button class="icon-btn info" class:on={info} aria-label="Como a previsão é calculada" aria-expanded={info} onclick={() => (info = !info)}><Icon name="info" size={15} /></button>
    <button class="more" onclick={() => open(null)} use:hint={['Detalhes', 'Cada mês por fixas, variáveis e sazonais.']}>Detalhes <Icon name="chevron-right" size={14} /></button>
  </div>
  <ForecastInfo open={info} base={forecasts[0]?.base ?? 0} />

  <div class="lead">
    <span class="caption">Você deve ter no fim de {shortMonth(months[2]).slice(0, 3).toLowerCase()}</span>
    <b class="big" class:neg={last < 0}><Tally cents={last} showCents={false} /></b>
    <span class="caption">hoje {money(start, { cents: false })} · {last >= start ? '+' : '−'}{money(Math.abs(last - start), { cents: false })} em 3 meses</span>
  </div>

  <div class="chart"><LineChart labels={['Hoje', ...months.map((m) => shortMonth(m).slice(0, 3))]} height={150} title="Dinheiro previsto no fim de cada mês" series={[{ id: 'bal', name: 'Previsto', color: '#2bd4a4', values: [start, ...balances] }]} /></div>

  <div class="months">
    {#each forecasts as f, i (f.month)}
      <button class="m" onclick={() => open(f.month)}>
        <span class="caption">{shortMonth(f.month).slice(0, 3)}</span>
        <b class="num">−{money(f.total, { cents: false })}</b>
        <span class="caption faint">sai no mês</span>
      </button>
    {/each}
  </div>
  <p class="caption faint note">Entra o que costuma entrar ({money(income.cents, { cents: false })}/mês); sai o que deve sair em contas, cartão e gastos do dia a dia.</p>
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
  .chart { margin: 4px 0 10px; }
  .months { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .m { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; padding: 10px 12px; border-radius: 14px; border: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.03); text-align: left; color: inherit; transition: background 0.2s, transform 0.2s var(--spring); }
  .m:hover { background: rgba(255, 255, 255, 0.06); }
  .m:active { transform: scale(0.97); }
  .m b { font-size: 15px; font-weight: 600; white-space: nowrap; }
  .note { margin: 10px 0 0; }
</style>
