<script lang="ts">
  import { money, percent } from '$lib/core/money';
  import { addMonths, monthOf, monthTitle, shortMonth, today, type Month } from '$lib/core/dates';
  import type { Account, Entry } from '$lib/data/types';
  import AdjustSheet from './AdjustSheet.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import Donut from '$lib/ui/Donut.svelte';
  import Tally from '$lib/ui/Tally.svelte';
  import CornerButton from '$lib/ui/CornerButton.svelte';
  import Carousel from '$lib/ui/Carousel.svelte';
  import BarChart from '$lib/ui/charts/BarChart.svelte';
  import LineChart from '$lib/ui/charts/LineChart.svelte';
  import { seriesColor } from '$lib/ui/charts/scale';
  import { ui } from '$lib/ui/ui.svelte';
  import { adjustmentReason, analyzeMonth, expectedIncome, monthEndTotal, type MonthAnalysis } from '$lib/features/analytics';
  import { forecastSpending, spendKindColor, spendKindName } from '$lib/features/spending';

  /**
   * Panorama em três cartões do mesmo tamanho, lado a lado (arraste ou bolinhas), todos no mesmo desenho:
   * título, um número em destaque com uma frase de contexto e, embaixo, as barras ou o gráfico.
   * 1) O mês: balanço e entradas × saídas (nos meses futuros, a previsão). 2) Os últimos 6 meses. 3) O saldo nas contas.
   */
  let { month, analysis, entries, accounts, stale = [] }: { month: Month; analysis: MonthAnalysis; entries: Entry[]; accounts: Account[]; stale?: string[] } = $props();
  let shown = $state(0);
  let adjustOpen = $state(false);
  const name = $derived(monthTitle(month).split(' ')[0].toLowerCase());
  const future = $derived(month > monthOf(today()));
  // Mês futuro: entra a média recente, sai a previsão (fixas, variáveis e sazonais).
  const forecast = $derived(future ? forecastSpending([month], entries, accounts)[0] : null);
  const view = $derived(forecast ? { income: expectedIncome(entries, accounts).cents, expense: forecast.total } : { income: analysis.incomeTotal, expense: analysis.expenseTotal });
  // Onde mais foi o dinheiro: as 3 maiores categorias (mês futuro: fixas, variáveis e sazonais previstas).
  const highlights = $derived(forecast
    ? [{ key: 'fixed', label: spendKindName.fixed, color: spendKindColor.fixed, cents: forecast.fixed.total }, { key: 'variable', label: spendKindName.variable, color: spendKindColor.variable, cents: forecast.variable.total }, { key: 'seasonal', label: spendKindName.seasonal, color: spendKindColor.seasonal, cents: forecast.seasonal.cents }]
    : analysis.expenses.filter((g) => g.key !== 'none').slice(0, 3).map((g) => ({ key: g.key, label: g.label, color: g.color, cents: g.cents })));
  const balance = $derived(view.income - view.expense);
  const moved = $derived(view.income + view.expense);
  const context = $derived.by(() => {
    if (!view.income) return view.expense ? 'Sem entradas registradas neste mês.' : 'Nada registrado neste mês ainda.';
    const share = Math.abs(balance) / view.income;
    if (future) return balance >= 0 ? `${percent(share)} do que deve entrar` : `faltam ${percent(share)} do que deve entrar`;
    return balance >= 0 ? `sobrou ${percent(share)} do que entrou` : `faltou ${percent(share)} do que entrou`;
  });

  // Últimos 6 meses (até o mês escolhido, ou até hoje se for futuro).
  const months = $derived(Array.from({ length: 6 }, (_, i) => addMonths(future ? monthOf(today()) : month, i - 5)));
  const labels = $derived(months.map((m) => shortMonth(m).slice(0, 3)));
  const per = $derived(months.map((m) => analyzeMonth(m, entries, accounts)));
  const pastOut = $derived(per.slice(0, -1).map((p) => p.expenseTotal).filter((v) => v > 0));
  const average = $derived(pastOut.length ? Math.round(pastOut.reduce((a, b) => a + b, 0) / pastOut.length) : null);
  const lastOut = $derived(per.at(-1)?.expenseTotal ?? 0);
  const vsAverage = $derived(average ? (lastOut - average) / average : null);

  const balances = $derived(months.map((m) => monthEndTotal(m, accounts)));
  const growth = $derived(balances.at(-1)! - balances[0]);
  const titles = $derived([future ? `Previsão de ${name}` : `Panorama de ${name}`, 'Entradas × saídas', 'Saldo nas contas']);
</script>

<Carousel count={3} bind:index={shown} labels={titles}>
  {#snippet slide(i)}
    <section class="card panel">
      {#if i === 0}
        <div class="card-head"><h3>{titles[0]}</h3>{#if !future}<CornerButton label="Ajustar o mês" detail="Se não bate com o banco: quanto ganhou, quanto gastou e quanto sobrou, com o motivo (juros, antecipação…)." onclick={() => (adjustOpen = true)} />{:else}<span class="pill soon">previsão</span>{/if}</div>
        <!-- 100% = tudo o que passou pelo mês (entradas + saídas); cada fatia mostra quanto foi de cada lado. -->
        <div class="month">
          <Donut size={132} thickness={0.26} center={money(moved, { cents: false })} caption={future ? 'previsto' : 'movimentado'} format={(v) => `${money(v, { cents: false })} · ${percent(v / (moved || 1))}`}
            slices={[{ id: 'in', label: future ? 'Deve entrar' : 'Entradas', value: view.income, color: seriesColor.income }, { id: 'out', label: future ? 'Deve sair' : 'Saídas', value: view.expense, color: seriesColor.credit }]} />
          <div class="legend">
            <div class="line"><span class="key"><i style:background={seriesColor.income}></i>{future ? 'Deve entrar' : 'Entradas'}<span class="pct">{percent(view.income / (moved || 1))}</span></span><b class="num pos"><Tally cents={view.income} showCents={false} /></b></div>
            <div class="line"><span class="key"><i style:background={seriesColor.credit}></i>{future ? 'Deve sair' : 'Saídas'}<span class="pct">{percent(view.expense / (moved || 1))}</span></span><b class="num"><Tally cents={view.expense} showCents={false} /></b></div>
            <div class="balance">
              <span class="caption">{future ? 'Deve sobrar' : 'Balanço'}</span>
              <b class="num" class:pos={balance >= 0} class:neg={balance < 0}><Tally cents={balance} /></b>
              <span class="caption">{context}</span>
            </div>
          </div>
        </div>
        {#if highlights.some((h) => h.cents > 0)}
          <div class="tops">
            <span class="caption">{future ? 'O que deve sair' : 'Onde mais gastou'}</span>
            {#each highlights as h (h.key)}
              <div class="top"><i style:background={h.color}></i><span class="grow ellipsis">{h.label}</span><span class="caption pct">{view.expense ? percent(h.cents / view.expense) : ''}</span><b class="num">{money(h.cents, { cents: false })}</b></div>
            {/each}
          </div>
        {/if}
        {#if stale.length}<button class="stale" onclick={() => ui.startImport()}><Icon name="import" size={15} /><span class="grow">Extrato só {stale.join(', ')}. Importe o de {name} para ver as entradas.</span><b>Importar</b></button>{/if}
        {#if analysis.adjustment && !future}<p class="caption note">Inclui ajuste ({adjustmentReason[analysis.adjustment.reason].toLowerCase()}){analysis.adjustment.note ? `: ${analysis.adjustment.note}` : ''}{analysis.adjustment.closing != null ? ` · sobrou nas contas ${money(analysis.adjustment.closing)}` : ''}</p>{/if}
        <div class="foot">
          {#if future}<a class="more" href="#/previsao" onclick={() => (ui.forecastMonth = month)}>Ver a previsão <Icon name="chevron-right" size={13} /></a>
          {:else}<a class="more" href="#/transacoes">Ver lançamentos <Icon name="chevron-right" size={13} /></a>{/if}
        </div>
      {:else if i === 1}
        <div class="card-head"><h3>{titles[1]}</h3><span class="caption">últimos 6 meses</span></div>
        <div class="lead">
          <span class="caption">Saídas em {shortMonth(months.at(-1)!).slice(0, 3).toLowerCase()}</span>
          <b class="big"><Tally cents={lastOut} showCents={false} /></b>
          <span class="caption">{vsAverage === null ? 'Ainda sem meses anteriores para comparar.' : Math.abs(vsAverage) < 0.03 ? 'na média dos meses anteriores' : `${percent(Math.abs(vsAverage))} ${vsAverage > 0 ? 'acima' : 'abaixo'} da média (${money(average!, { cents: false })})`}</span>
        </div>
        <div class="chart"><BarChart {labels} current={5} height={200} title="Entradas e saídas por mês"
          series={[{ id: 'in', name: 'Entradas', color: seriesColor.income, values: per.map((p) => p.incomeTotal) }, { id: 'out', name: 'Saídas', color: seriesColor.credit, values: per.map((p) => p.expenseTotal) }]}
          reference={average ? { value: average, label: '' } : null} /></div>
        {#if average}<p class="caption faint note"><span class="dash"></span>média das saídas</p>{/if}
      {:else}
        <div class="card-head"><h3>{titles[2]}</h3><span class="caption">fim de cada mês</span></div>
        <div class="lead">
          <span class="caption">{future || month === monthOf(today()) ? "Hoje nas contas" : `No fim de ${name}`}</span>
          <b class="big"><Tally cents={balances.at(-1) ?? 0} showCents={false} /></b>
          <span class="caption">{growth === 0 ? 'igual a 6 meses atrás' : `${growth > 0 ? '+' : '−'}${money(Math.abs(growth), { cents: false })} em 6 meses`}</span>
        </div>
        <div class="chart"><LineChart {labels} height={200} title="Saldo nas contas no fim de cada mês" series={[{ id: 'bal', name: 'Saldo', color: '#2bd4a4', values: balances }]} /></div>
        <p class="caption faint note">Contas, caixinhas e dinheiro somados.</p>
      {/if}
    </section>
  {/snippet}
</Carousel>
<AdjustSheet bind:open={adjustOpen} {month} {analysis} />

<style>
  /* Os três cartões têm a mesma altura (o carrossel estica) e o mesmo desenho: cabeçalho, destaque, conteúdo. */
  .panel { display: flex; flex-direction: column; min-height: 360px; }
  .card-head { margin-bottom: 10px; }
  .soon { color: #8fc0ff; background: rgba(57, 135, 229, 0.14); }
  .lead { display: flex; flex-direction: column; gap: 2px; margin-bottom: 14px; }
  .big { font: 600 32px/1.1 var(--font-display); letter-spacing: -0.02em; margin: 2px 0; }
  .panel { container-type: inline-size; }
  .month { display: flex; align-items: center; gap: 22px; }
  .legend { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 9px; }
  .line { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .key { display: flex; align-items: center; gap: 8px; color: var(--text-2); font-size: 14.5px; white-space: nowrap; }
  .pct { font-size: 12px; color: var(--text-3); font-variant-numeric: tabular-nums; }
  .line b { font-size: 16px; font-weight: 600; white-space: nowrap; }
  .balance { display: flex; flex-direction: column; gap: 1px; margin-top: 4px; padding-top: 10px; border-top: 1px solid var(--stroke); }
  .balance b { font: 600 24px/1.15 var(--font-display); letter-spacing: -0.015em; }
  i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; flex: none; }
  .tops { display: flex; flex-direction: column; gap: 2px; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--stroke); }
  .tops > .caption { margin-bottom: 4px; }
  .top { display: flex; align-items: center; gap: 10px; padding: 3px 0; font-size: 14px; }
  .top b { font-weight: 600; min-width: 64px; text-align: right; }
  .pct { min-width: 34px; text-align: right; }
  .stale { display: flex; align-items: center; gap: 10px; width: 100%; margin-top: 14px; padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(57, 135, 229, 0.35); background: rgba(57, 135, 229, 0.1); color: #8fc0ff; font-size: 13.5px; text-align: left; }
  .stale b { color: var(--text); }
  .note { margin: 10px 0 0; }
  .foot { margin-top: auto; padding-top: 14px; }
  .more { display: inline-flex; align-items: center; gap: 3px; color: var(--accent); font-weight: 600; font-size: 13.5px; transition: gap 0.25s var(--ease); }
  .more:hover { gap: 7px; }
  .chart { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; }
  .dash { display: inline-block; width: 16px; border-top: 1.5px dashed rgba(255, 255, 255, 0.5); vertical-align: middle; margin-right: 6px; }
  /* Cartão estreito (celular): nome em cima, valor embaixo, para nada passar da borda. */
  @container (max-width: 440px) {
    .month { gap: 16px; }
    .line { flex-direction: column; align-items: flex-start; justify-content: flex-start; gap: 0; }
    .line b { align-self: flex-start; text-align: left; }
    .balance b { font-size: 21px; }
  }
</style>
