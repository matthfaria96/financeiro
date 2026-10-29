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
  import { balanceFixReason, lastBalanceFix } from '$lib/features/balanceFix';
  import { addMonths, dayMonth, monthOf, today } from '$lib/core/dates';
  import { monthEndTotal } from '$lib/features/analytics';

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
  const groups = $derived(bankGroups(store.accounts.filter((a) => !a.archived && !hidden.includes(a.id))).filter((g) => g.accounts.some((a) => a.kind !== 'creditCard') || g.cardOpen > 0));
  const groupBalance = (g: BankGroup) => g.accounts.reduce((s, a) => s + (shown.find((b) => b.account.id === a.id)?.cents ?? 0), 0);
  const isEstimated = (g: BankGroup) => g.accounts.some((a) => shown.find((b) => b.account.id === a.id)?.estimated);
  const cardsOpen = $derived(current ? groups.reduce((s, g) => s + g.cardOpen, 0) : 0);
  const free = $derived(total - cardsOpen);
  // Divisão do dinheiro por banco (só o que é positivo), na cor de cada banco.
  const slices = $derived(groups.map((g) => ({ key: g.key, name: g.name, cents: Math.max(0, groupBalance(g)), color: bankColor(g.main) })).filter((s) => s.cents > 0));
  let fixOpen = $state(false);
  // Desenho de fundo: o saldo dos últimos 6 meses como uma onda suave no canto.
  const history = $derived(Array.from({ length: 6 }, (_, i) => monthEndTotal(addMonths(monthOf(today()), i - 5), store.accounts)));
  const wave = $derived.by(() => {
    const lo = Math.min(...history), hi = Math.max(...history), span = hi - lo || 1;
    const pts = history.map((v, i) => [i * 20, 34 - ((v - lo) / span) * 26]);
    return pts.reduce((d, [x, y], i) => (i ? `${d} C${x - 10},${pts[i - 1][1]} ${x - 10},${y} ${x},${y}` : `M${x},${y}`), '');
  });
  const fix = $derived(lastBalanceFix());
</script>

<section class="card money">
  <svg class="wave" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="wave-g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2bd4a4" stop-opacity="0.35" /><stop offset="1" stop-color="#2bd4a4" stop-opacity="0" /></linearGradient></defs><path d={wave + ' L100,40 L0,40 Z'} fill="url(#wave-g)" /><path d={wave} fill="none" stroke="#2bd4a4" stroke-opacity="0.6" stroke-width="0.8" vector-effect="non-scaling-stroke" /></svg>
  <div class="card-head"><h3>{title}</h3>
    <CornerButton label="Corrigir saldos" detail="Digite quanto tem em cada conta, caixinha e dinheiro: o app acerta e lança o rendimento ou a diferença." onclick={() => (fixOpen = true)} />
  </div>

  <div class="lead">
    <span class="caption">{cardsOpen > 0 ? 'Livre, já descontando as faturas' : current ? 'Nas contas, caixinhas e dinheiro' : 'Nas contas no fim do mês'}{estimated && informed === null ? ' · estimado' : ''}</span>
    <b class="big" class:neg={free < 0}><Tally cents={free} /></b>
    {#if cardsOpen > 0}
      <div class="stats">
        <div class="stat"><span class="ic"><Icon name="wallet" size={16} /></span><span><span class="caption">Nas contas</span><b class="num">{money(total, { cents: false })}</b></span></div>
        <div class="stat" use:hint={['Faturas em aberto', 'Compras no cartão que ainda vão sair nas próximas faturas (com as parcelas já lançadas).']}><span class="ic warm"><Icon name="receipt" size={16} /></span><span><span class="caption">Faturas em aberto</span><b class="num">{money(cardsOpen, { cents: false })}</b></span></div>
      </div>
    {:else if informed !== null}
      <span class="caption">informado no ajuste do mês</span>
    {/if}
    {#if fix && current}<button class="fixed" onclick={() => (fixOpen = true)}><Icon name="pencil" size={11} />Corrigido à mão em {dayMonth(fix.day)} · {balanceFixReason[fix.reason].toLowerCase()}{fix.note ? `: ${fix.note}` : ''}</button>{/if}
  </div>

  {#if slices.length > 1}
    <div class="split" aria-hidden="true">{#each slices as s (s.key)}<span style:flex-grow={s.cents} style:background={s.color} title={s.name}></span>{/each}</div>
  {/if}

  {#if estimated && informed === null}
    <button class="warn" onclick={() => (fixOpen = true)} use:hint={['Saldo estimado', 'O extrato não trouxe o saldo: o app somou só os lançamentos importados. Informe o saldo real para acertar.']}>
      <Icon name="alert" size={14} /><span class="grow">{estimated === 1 ? 'Um saldo é estimado' : `${estimated} saldos são estimados`}: o extrato não traz o saldo.</span><b>Informar</b>
    </button>
  {/if}

  <div class="rows">
    {#each groups as group (group.key)}
      {@const guess = isEstimated(group)}
      {@const hasMoney = group.accounts.some((a) => a.kind !== 'creditCard')}
      <a class="row item" href="#/contas/{group.main.id}"><BankCard account={group.main} width={38} />
        <span class="grow" style="min-width: 0"><span class="ellipsis block">{group.name}</span>
          {#if current && group.cardOpen > 0}<span class="caption card-line"><Icon name="card" size={11} />fatura {money(group.cardOpen, { cents: false })}</span>{/if}</span>
        {#if hasMoney}<span class="num value" class:neg={groupBalance(group) < 0} class:faint={guess} title={guess ? 'Estimado: o extrato não trouxe o saldo' : undefined}>{guess ? '≈ ' : ''}<Tally cents={groupBalance(group)} /></span>
        {:else}<span class="caption only-card">só cartão</span>{/if}</a>
    {:else}
      <a class="muted small" href="#/configurar">{analysis.balances.length ? 'Todas as contas estão escondidas.' : 'Cadastre suas contas para ver o saldo.'}</a>
    {/each}
  </div>
</section>
<BalanceFixSheet bind:open={fixOpen} />

<style>
  .lead { display: flex; flex-direction: column; gap: 3px; }
  .big { font: 600 36px/1.08 var(--font-display); letter-spacing: -0.025em; margin: 2px 0;
    background: linear-gradient(120deg, #ffffff 20%, #c8fff0 70%, #9fe0ff); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .big.neg { background: none; color: var(--negative); }
  .money { position: relative; overflow: hidden; }
  .money > :global(*:not(.wave)) { position: relative; }
  .wave { position: absolute; right: 0; top: 0; width: 60%; height: 120px; pointer-events: none; opacity: 0.9;
    -webkit-mask-image: linear-gradient(90deg, transparent, #000 40%); mask-image: linear-gradient(90deg, transparent, #000 40%); }
  .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
  .stat { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 14px; background: rgba(255, 255, 255, 0.04); border: 1px solid var(--stroke); min-width: 0; }
  .stat > span:last-child { display: flex; flex-direction: column; min-width: 0; }
  .stat b { font-size: 15px; font-weight: 600; white-space: nowrap; }
  .ic { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; flex: none; color: var(--accent); background: var(--accent-soft); }
  .ic.warm { color: #ffb36b; background: rgba(255, 166, 61, 0.14); }
  .fixed { align-self: flex-start; display: inline-flex; align-items: center; gap: 5px; margin-top: 4px; padding: 0; border: 0; background: none; font-size: 12px; color: var(--text-3); text-align: left; }
  .fixed:hover { color: var(--text-2); }
  .split { display: flex; gap: 3px; height: 8px; margin: 14px 0 4px; border-radius: 4px; overflow: hidden; }
  .split span { display: block; min-width: 4px; transform-origin: left; animation: grow 0.9s var(--spring) both; transition: flex-grow 0.6s var(--spring); }
  @keyframes grow { from { transform: scaleX(0); } }
  .warn { display: flex; align-items: center; gap: 8px; width: 100%; margin-top: 12px; padding: 8px 12px; border-radius: 11px; border: 1px solid rgba(255, 166, 61, 0.3); background: rgba(255, 166, 61, 0.08); color: var(--warning); font-size: 13px; text-align: left; transition: background 0.2s; }
  .warn:hover { background: rgba(255, 166, 61, 0.14); }
  .warn b { color: var(--text); white-space: nowrap; }
  .rows { display: flex; flex-direction: column; margin-top: 8px; }
  .item { gap: 12px; padding: 9px 8px; margin: 0 -8px; border-radius: 12px; color: inherit; font-size: 15px; transition: background 0.2s; }
  .item:hover { background: rgba(255, 255, 255, 0.04); }
  .item + .item { border-top: 1px solid var(--stroke); border-radius: 0 0 12px 12px; }
  .block { display: block; }
  .card-line { display: inline-flex; align-items: center; gap: 4px; }
  .value { white-space: nowrap; }
  .only-card { white-space: nowrap; }
</style>
