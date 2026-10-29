<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { money } from '$lib/core/money';
  import { addMonths, monthOf, monthTitle, shortMonth, today } from '$lib/core/dates';
  import { ui } from '$lib/ui/ui.svelte';
  import Tally from '$lib/ui/Tally.svelte';
  import BarChart from '$lib/ui/charts/BarChart.svelte';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';
  import ForecastBreakdown from '$lib/screens/forecast/ForecastBreakdown.svelte';
  import ForecastInfo from '$lib/screens/forecast/ForecastInfo.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import { inScope, inScopeAccount } from '$lib/features/model';
  import { expectedIncome } from '$lib/features/analytics';
  import { closedMonths, forecastSpending, monthSpend, spendKindColor, spendKindName, spendKinds } from '$lib/features/spending';

  /** Previsão (subtela do Início): o que deve sair em cada um dos próximos 6 meses, em fixas, variáveis e sazonais. */
  const entries = $derived(store.entries.filter(inScope));
  const accounts = $derived(store.accounts.filter((a) => !a.archived && inScopeAccount(a)));
  const now = monthOf(today());
  const months = [1, 2, 3, 4, 5, 6].map((i) => addMonths(now, i));
  let month = $state(ui.forecastMonth && months.includes(ui.forecastMonth) ? ui.forecastMonth : months[0]);
  const forecasts = $derived(forecastSpending(months, entries, accounts));
  const current = $derived(forecasts.find((f) => f.month === month) ?? forecasts[0]);
  const income = $derived(expectedIncome(entries, accounts));
  const left = $derived(income.cents - current.total);
  const parts = $derived([current.fixed.total, current.variable.total, current.seasonal.cents]);
  let info = $state(false);

  // Histórico real (meses fechados): o mesmo critério da previsão, para comparar.
  const past = $derived(closedMonths());
  const spent = $derived(past.map((m) => monthSpend(m, entries)));
  const label = (m: string) => shortMonth(m).slice(0, 3);
</script>

<div class="page narrow">
  <SubHeader title="Previsão" back="#/" />

  <div class="months scroll-x" role="tablist" aria-label="Mês">
    {#each months as m (m)}<button role="tab" aria-selected={m === month} class="chip" class:active={m === month} onclick={() => (month = m)}>{label(m)}{m.endsWith('-01') ? ` ${m.slice(2, 4)}` : ''}</button>{/each}
  </div>

  <section class="card summary">
    <div class="row between"><span class="caption">Deve sair em {monthTitle(month).split(' ')[0].toLowerCase()}</span>
      <button class="icon-btn info" class:on={info} aria-label="Como a previsão é calculada" aria-expanded={info} onclick={() => (info = !info)}><Icon name="info" size={15} /></button></div>
    <b class="big"><Tally cents={current.total} showCents={false} /></b>
    <span class="caption">base {money(current.base, { cents: false })}{#each current.extras as x (x.label)}{' '}<span class="extra">+ {x.kind === 'yearly' ? x.label : 'fatura acima da média'} {money(x.cents, { cents: false })}</span>{/each}</span>
    <ForecastInfo open={info} base={current.base} />
    <div class="stack-bar" aria-hidden="true">
      {#each spendKinds as kind, i (kind)}{#if parts[i] > 0}<span style:flex-grow={parts[i]} style:background={spendKindColor[kind]}></span>{/if}{/each}
    </div>
    <div class="parts">
      {#each spendKinds as kind, i (kind)}
        <span><i style:background={spendKindColor[kind]}></i>{spendKindName[kind]}<b class="num">{money(parts[i], { cents: false })}</b></span>
      {/each}
    </div>
    <div class="flow">
      <div><span class="caption">Deve entrar</span><b class="num pos">{money(income.cents, { cents: false })}</b><span class="caption faint">{income.months ? `média de ${income.months} ${income.months === 1 ? 'mês' : 'meses'}` : 'sem histórico'}</span></div>
      <div class="right"><span class="caption">Deve sobrar</span><b class="num" class:pos={left >= 0} class:neg={left < 0}>{money(left, { cents: false })}</b></div>
    </div>
  </section>

  <ForecastBreakdown forecast={current} />

  <section class="card">
    <div class="card-head"><h3>Como foi nos últimos meses</h3><span class="sub">gasto real</span></div>
    <BarChart labels={past.map(label)} current={-1} height={190} title="Fixas, variáveis e sazonais por mês"
      series={spendKinds.map((kind) => ({ id: kind, name: spendKindName[kind], color: spendKindColor[kind], stack: 'all', values: spent.map((s) => s[kind]) }))} />
  </section>

</div>

<style>
  .months { margin: 0 -2px; }
  .summary { display: flex; flex-direction: column; gap: 6px; }
  .big { font: 600 40px/1.05 var(--font-display); letter-spacing: -0.03em; }
  .stack-bar { display: flex; gap: 3px; height: 14px; margin: 10px 0 4px; border-radius: 7px; overflow: hidden; background: rgba(255, 255, 255, 0.06); }
  .stack-bar span { display: block; min-width: 4px; transition: flex-grow 0.6s cubic-bezier(0.22, 1, 0.36, 1); }
  .parts { display: flex; flex-wrap: wrap; gap: 8px 18px; font-size: 13.5px; color: var(--text-2); }
  .parts span { display: inline-flex; align-items: center; gap: 6px; }
  .parts b { color: var(--text); font-weight: 600; }
  i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; flex: none; }
  .flow { display: flex; justify-content: space-between; gap: 12px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--stroke-strong); }
  .flow > div { display: flex; flex-direction: column; gap: 2px; }
  .flow b { font: 600 20px var(--font-display); }
  .right { text-align: right; }
  .info { width: 30px; height: 30px; color: var(--text-2); }
  .info.on { color: var(--accent); border-color: rgba(43, 212, 164, 0.4); background: var(--accent-soft); }
  .extra { color: #f2a35e; white-space: nowrap; }
</style>
