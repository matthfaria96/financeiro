<script lang="ts">
  import { goto } from '$app/navigation';
  import { money } from '$lib/core/money';
  import { addMonths, monthOf, monthTitle, today } from '$lib/core/dates';
  import type { Account, Entry } from '$lib/data/types';
  import Icon from '$lib/ui/Icon.svelte';
  import { hint } from '$lib/ui/hint';
  import { ui } from '$lib/ui/ui.svelte';
  import { forecastSpending, spendKindColor, spendKindName, spendKinds, type SpendForecast } from '$lib/features/spending';
  import { expectedIncome } from '$lib/features/analytics';
  import Tally from '$lib/ui/Tally.svelte';
  import ForecastInfo from '$lib/screens/forecast/ForecastInfo.svelte';

  /** Previsão dos próximos meses: fixas + variáveis + sazonais em cada barra. Toque abre a tela de Previsão. */
  let { accounts, entries }: { accounts: Account[]; entries: Entry[] } = $props();
  const now = monthOf(today());
  const forecasts = $derived(forecastSpending([1, 2, 3, 4, 5, 6].map((i) => addMonths(now, i)), entries, accounts));
  const top = $derived(Math.max(1, ...forecasts.map((f) => f.total)));
  const income = $derived(expectedIncome(entries, accounts));
  const next = $derived(forecasts[0]);
  const left = $derived(income.cents - (next?.total ?? 0));
  let info = $state(false);
  const why = (f: SpendForecast) => f.extras.map((x) => (x.kind === 'yearly' ? x.label : 'fatura alta')).join(' · ');
  const part = (f: SpendForecast, kind: (typeof spendKinds)[number]) => (kind === 'fixed' ? f.fixed.total : kind === 'variable' ? f.variable.total : f.seasonal.cents);

  function open(month: string | null) {
    ui.forecastMonth = month;
    void goto('#/previsao');
  }
</script>

<section class="card">
  <div class="head">
    <button class="title" onclick={() => open(null)} use:hint={['Previsão', 'Como cada mês foi calculado: fixas, variáveis e sazonais.']}><h3>Previsão dos próximos meses</h3></button>
    <button class="icon-btn info" class:on={info} aria-label="Como a previsão é calculada" aria-expanded={info} onclick={() => (info = !info)}><Icon name="info" size={15} /></button>
    <button class="more" onclick={() => open(null)}>Detalhes <Icon name="chevron-right" size={14} /></button>
  </div>
  <ForecastInfo open={info} base={next?.base ?? 0} />
  {#if next}
    <div class="lead">
      <span class="caption">Em {monthTitle(next.month).split(' ')[0].toLowerCase()} deve sair</span>
      <b class="big"><Tally cents={next.total} showCents={false} /></b>
      {#if income.months}<span class="caption">{left >= 0 ? `e sobrar ${money(left, { cents: false })}` : `faltam ${money(-left, { cents: false })}`} do que costuma entrar ({money(income.cents, { cents: false })})</span>{/if}
    </div>
  {/if}
  <div class="legend">{#each spendKinds as kind (kind)}<span><i style:background={spendKindColor[kind]}></i>{spendKindName[kind]}</span>{/each}</div>
  <div class="months">
    {#each forecasts as f, k (f.month)}
      <button class="bar-row" style:--d="{k * 50}ms" onclick={() => open(f.month)} aria-label="{monthTitle(f.month)}: {money(f.total, { cents: false })}">
        <span class="m">{monthTitle(f.month).split(' ')[0]}{#if f.extras.length}<span class="why ellipsis">+ {why(f)}</span>{/if}</span>
        <span class="track" style:--w="{(f.total / top) * 100}%">
          {#each spendKinds as kind (kind)}{@const cents = part(f, kind)}{#if cents > 0}<span class="seg" style:flex-grow={cents} style:background={spendKindColor[kind]}></span>{/if}{/each}
        </span>
        <b class="num">{money(f.total, { cents: false })}</b>
        <span class="chev"><Icon name="chevron-right" size={14} /></span>
      </button>
    {/each}
  </div>
  <p class="caption faint note">Todo mês parte da mesma base ({money(next?.base ?? 0, { cents: false })}); conta anual ou fatura acima da média aumentam o mês. Toque no <b>i</b> para ver como é calculado.</p>
</section>

<style>
  .head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .title { flex: 1; min-width: 0; padding: 0; border: 0; background: none; text-align: left; color: inherit; }
  .head h3 { margin: 0; font: 600 16px var(--font-display); letter-spacing: -0.01em; }
  .info { width: 30px; height: 30px; flex: none; color: var(--text-2); }
  .info.on { color: var(--accent); border-color: rgba(43, 212, 164, 0.4); background: var(--accent-soft); }
  .more { display: inline-flex; align-items: center; gap: 2px; padding: 0; border: 0; background: none; color: var(--accent); font-size: 13.5px; font-weight: 600; transition: gap 0.25s var(--ease); }
  .more:hover { gap: 6px; }
  .lead { display: flex; flex-direction: column; gap: 3px; margin-bottom: 14px; }
  .big { font: 600 32px/1.1 var(--font-display); letter-spacing: -0.02em; margin: 2px 0; }
  .legend { display: flex; gap: 14px; margin-bottom: 8px; font-size: 12.5px; color: var(--text-2); }
  .legend span { display: inline-flex; align-items: center; gap: 6px; }
  i { width: 9px; height: 9px; border-radius: 3px; display: inline-block; }
  .months { display: flex; flex-direction: column; gap: 2px; }
  .bar-row { display: grid; grid-template-columns: 104px 1fr auto 14px; align-items: center; gap: 12px; padding: 8px 10px; margin: 0 -10px; border-radius: 12px; background: none; border: 0; text-align: left; font-size: 15px; transition: background 0.2s; }
  .bar-row:hover { background: rgba(255, 255, 255, 0.04); }
  .bar-row:active { background: rgba(255, 255, 255, 0.07); }
  .m { color: var(--text-2); display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
  .why { font-size: 11px; color: #f2a35e; }
  /* A barra ocupa a fração do maior mês (--w); dentro dela, um pedaço por tipo, com 2 px de folga entre eles. */
  .track { display: flex; gap: 2px; height: 12px; border-radius: 6px; overflow: hidden; background: rgba(255, 255, 255, 0.06);
    padding-right: calc(100% - var(--w)); transition: padding 0.6s cubic-bezier(0.22, 1, 0.36, 1); }
  .seg { display: block; height: 100%; min-width: 3px; transform-origin: left; animation: fill 0.9s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: var(--d); }
  .seg:first-child { border-radius: 6px 0 0 6px; }
  .seg:last-child { border-radius: 0 6px 6px 0; }
  .seg:only-child { border-radius: 6px; }
  @keyframes fill { from { transform: scaleX(0); } }
  .chev { display: grid; color: var(--text-3); }
  .note { margin: 10px 0 0; }
</style>
