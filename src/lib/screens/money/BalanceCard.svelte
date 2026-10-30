<script lang="ts">
  import { money } from '$lib/core/money';
  import Icon from '$lib/ui/Icon.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import Tally from '$lib/ui/Tally.svelte';
  import CornerButton from '$lib/ui/CornerButton.svelte';
  import { hint } from '$lib/ui/hint';
  import { bankColor } from '$lib/ui/look';
  import BalanceFixSheet from './BalanceFixSheet.svelte';
  import type { MonthAnalysis } from '$lib/features/analytics';
  import { store } from '$lib/data/store.svelte';
  import { bankGroups, type BankGroup } from '$lib/features/bankGroups';
  import { lastBalanceFix } from '$lib/features/balanceFix';
  import { addMonths, dayMonth, monthOf, shortMonth, today } from '$lib/core/dates';
  import { monthEndTotal } from '$lib/features/analytics';
  import LineChart from '$lib/ui/charts/LineChart.svelte';

  /**
   * Seu dinheiro: em destaque o que está LIVRE (contas + caixinhas + dinheiro, menos as faturas do cartão que ainda vão sair),
   * a conta por trás desse número, a divisão por banco e cada banco. O lápis no canto corrige os saldos à mão.
   */
  let { analysis, hidden = [], title = 'Seu dinheiro', current = true }: { analysis: MonthAnalysis; hidden?: string[]; title?: string; /** Mês atual: desconta as faturas em aberto (só faz sentido hoje). */ current?: boolean } = $props();
  const shown = $derived(analysis.balances.filter((b) => !hidden.includes(b.account.id)));
  // O que sobrou no fim do mês, quando informado no Ajustar, vale no lugar da soma.
  const informed = $derived(analysis.adjustment?.closing ?? null);
  const total = $derived(informed ?? shown.reduce((s, b) => s + b.cents, 0));
  const estimated = $derived(shown.filter((b) => b.estimated).length);
  // Uma linha por banco: saldo da conta (e caixinha) com o cartão do mesmo banco junto.
  const groups = $derived(bankGroups(store.accounts.filter((a) => !a.archived && !hidden.includes(a.id))).filter((g) => g.accounts.some((a) => a.kind !== 'creditCard')));
  const groupBalance = (g: BankGroup) => g.accounts.reduce((s, a) => s + (shown.find((b) => b.account.id === a.id)?.cents ?? 0), 0);
  const isEstimated = (g: BankGroup) => g.accounts.some((a) => shown.find((b) => b.account.id === a.id)?.estimated);
  // Divisão do dinheiro por banco (só o que é positivo), na cor de cada banco.
  const slices = $derived(groups.map((g) => ({ key: g.key, name: g.name, cents: Math.max(0, groupBalance(g)), color: bankColor(g.main) })).filter((s) => s.cents > 0));
  let fixOpen = $state(false);
  let showAll = $state(false);
  let rowsHeight = $state(0);
  // Como o dinheiro andou nos últimos 6 meses (fim de cada mês).
  const months = Array.from({ length: 6 }, (_, i) => addMonths(monthOf(today()), i - 5));
  const history = $derived(months.map((m) => monthEndTotal(m, store.accounts)));
  const growth = $derived(history.at(-1)! - history[0]);
  const fix = $derived(lastBalanceFix());
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

<section class="card">
  <div class="card-head"><h3>{title}</h3>
    <CornerButton label="Corrigir saldos" detail="Digite quanto tem em cada conta, caixinha e dinheiro: o app acerta e lança o rendimento ou a diferença." onclick={() => (fixOpen = true)} />
  </div>

  <div class="lead">
    <span class="caption">{current ? 'Somando contas, caixinhas e dinheiro' : 'Somando contas, caixinhas e dinheiro no fim do mês'}{estimated && informed === null ? ' · estimado' : ''}</span>
    <b class="big" class:neg={total < 0}><Tally cents={total} /></b>
    {#if current && history.some((v) => v !== history[0])}<span class="caption" class:pos={growth > 0} class:neg={growth < 0}>{growth >= 0 ? '+' : '−'}{money(Math.abs(growth), { cents: false })} em 6 meses</span>{/if}
    {#if informed !== null}<span class="caption">informado no ajuste do mês</span>{/if}
    {#if fix && current}<button class="fixed" onclick={() => (fixOpen = true)}><Icon name="pencil" size={11} />Corrigido à mão em {dayMonth(fix.day)}{fix.note ? `: ${fix.note}` : ''}</button>{/if}
  </div>

  {#if slices.length > 1}
    <div class="split" aria-hidden="true">{#each slices as s (s.key)}<span style:flex-grow={s.cents} style:background={s.color} title={s.name}></span>{/each}</div>
  {/if}


  {#if current}<div class="trend"><LineChart labels={months.map((m) => shortMonth(m).slice(0, 3))} height={wide ? 230 : 120} title="Seu dinheiro no fim de cada mês" series={[{ id: 'bal', name: 'Saldo', color: '#2bd4a4', values: history }]} /></div>{/if}
  <!-- Mais de 3 lugares: mostra 3 e um pedaço do 4º esmaecendo; "Ver mais" abre e fecha com animação. -->
  <div class="rows" class:solo={groups.length < 2} class:clamp={groups.length > 3 && !showAll} style:max-height={groups.length > 3 ? (showAll ? `${rowsHeight}px` : '168px') : undefined}>
    <div class="rows-in" bind:clientHeight={rowsHeight}>
    {#each groups as group (group.key)}
      {@const guess = isEstimated(group)}
      {@const hasMoney = group.accounts.some((a) => a.kind !== 'creditCard')}
      <a class="row item" href="#/contas/{group.main.id}"><BankCard account={group.main} width={38} />
        <span class="grow" style="min-width: 0"><span class="ellipsis block">{group.name}</span>
</span>
        <span class="num value" class:neg={groupBalance(group) < 0} class:faint={guess} title={guess ? 'Estimado: o extrato não trouxe o saldo' : undefined}>{guess ? '≈ ' : ''}<Tally cents={groupBalance(group)} /></span></a>
    {:else}
      <a class="muted small" href="#/configurar">{analysis.balances.length ? 'Todas as contas estão escondidas.' : 'Cadastre suas contas para ver o saldo.'}</a>
    {/each}
    </div>
  </div>
  {#if groups.length > 3}<button class="more-rows" onclick={() => (showAll = !showAll)} aria-expanded={showAll}>{showAll ? 'Ver menos' : `Ver mais (${groups.length - 3})`}<Icon name="chevron-down" size={14} /></button>{/if}
  {#if estimated && informed === null}
    <p class="foot-note"><Icon name="alert" size={12} />Saldo de {groups.filter((g) => isEstimated(g)).map((g) => g.name).join(', ')} estimado. Se não bater com o banco, toque no lápis para corrigir.</p>
  {/if}
</section>
<BalanceFixSheet bind:open={fixOpen} />

<style>
  .lead { display: flex; flex-direction: column; gap: 3px; }
  .big { font: 600 36px/1.08 var(--font-display); letter-spacing: -0.025em; margin: 2px 0;
    background: linear-gradient(120deg, #ffffff 20%, #c8fff0 70%, #9fe0ff); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .big.neg { background: none; color: var(--negative); }
  .fixed { align-self: flex-start; display: inline-flex; align-items: center; gap: 5px; margin-top: 4px; padding: 0; border: 0; background: none; font-size: 12px; color: var(--text-3); text-align: left; }
  .fixed:hover { color: var(--text-2); }
  .split { display: flex; gap: 3px; height: 8px; margin: 14px 0 4px; border-radius: 4px; overflow: hidden; }
  .split span { display: block; min-width: 4px; transform-origin: left; animation: grow 0.9s var(--spring) both; transition: flex-grow 0.6s var(--spring); }
  @keyframes grow { from { transform: scaleX(0); } }
  .foot-note { display: flex; align-items: center; gap: 6px; margin: 12px 0 0; padding-top: 10px; border-top: 1px solid var(--stroke); font-size: 12px; color: var(--text-3); }
  .foot-note :global(svg) { color: var(--warning); flex: none; }
  .rows { display: flex; flex-direction: column; margin-top: 8px; }
  .item { gap: 12px; padding: 9px 8px; margin: 0 -8px; border-radius: 12px; color: inherit; font-size: 15px; transition: background 0.2s; }
  .item:hover { background: rgba(255, 255, 255, 0.04); }
  .item + .item { border-top: 1px solid var(--stroke); border-radius: 0 0 12px 12px; }
  .block { display: block; }
  .value { white-space: nowrap; }
  .trend { margin: 10px 0 2px; }
  .solo .item { font-size: 14px; color: var(--text-2); }
  @container home (min-width: 860px) {
    .card { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); column-gap: 40px; padding: 24px 26px; }
    .card-head { grid-column: 1 / -1; }
    .lead, .split, .rows, .more-rows { grid-column: 1; }
    .foot-note { grid-column: 1 / -1; }
    .trend { grid-column: 2; grid-row: 2 / span 3; align-self: center; margin: 0; }
    .big { font-size: 42px; }
  }
  .rows { overflow: hidden; transition: max-height 0.45s cubic-bezier(0.22, 1, 0.36, 1); }
  .rows-in { display: flex; flex-direction: column; }
  .rows.clamp { -webkit-mask-image: linear-gradient(180deg, #000 62%, transparent); mask-image: linear-gradient(180deg, #000 62%, transparent); }
  .more-rows { display: flex; align-items: center; justify-content: center; gap: 4px; width: 100%; margin-top: 4px; padding: 6px; border: 0; background: none; color: var(--accent); font-size: 13px; font-weight: 600; }
  .more-rows :global(svg) { transition: transform 0.35s var(--ease); }
  .more-rows[aria-expanded='true'] :global(svg) { transform: rotate(180deg); }
</style>
