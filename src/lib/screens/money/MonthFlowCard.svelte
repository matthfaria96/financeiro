<script lang="ts">
  import { money, percent } from '$lib/core/money';
  import { shortDay } from '$lib/core/dates';
  import { store } from '$lib/data/store.svelte';
  import { ui } from '$lib/ui/ui.svelte';
  import Avatar from '$lib/ui/Avatar.svelte';
  import Tally from '$lib/ui/Tally.svelte';
  import { seriesColor } from '$lib/ui/charts/scale';
  import { categoryOf } from '$lib/features/model';
  import { spendCents, spendDate, type MonthAnalysis } from '$lib/features/analytics';

  /**
   * Fluxo do mês: anéis no estilo do Atividade da Apple — o de fora é o que entrou, o de dentro o que saiu
   * (o maior dos dois fecha o anel). No centro o saldo; embaixo as barras e as maiores compras do mês.
   */
  let { analysis }: { analysis: MonthAnalysis } = $props();
  const IN = seriesColor.income, OUT = seriesColor.expense;
  const top = $derived(Math.max(1, analysis.incomeTotal, analysis.expenseTotal));
  const inShare = $derived(analysis.incomeTotal / top);
  const outShare = $derived(analysis.expenseTotal / top);
  const outOfIn = $derived(analysis.incomeTotal ? analysis.expenseTotal / analysis.incomeTotal : null);
  const balance = $derived(analysis.balance);
  // As maiores compras do mês (já no valor da visão escolhida: parcela ou compra inteira).
  const biggest = $derived(analysis.expenses.flatMap((g) => g.entries).toSorted((a, b) => spendCents(a) - spendCents(b)).slice(0, 4));
  const ring = (r: number) => 2 * Math.PI * r;
</script>

<section class="card flow">
  <div class="card-head"><div><h3>Fluxo do mês</h3><span class="caption">Entradas × saídas</span></div></div>

  <div class="top">
    <div class="rings" role="img" aria-label="Entrou {money(analysis.incomeTotal)}, saiu {money(analysis.expenseTotal)}, saldo {money(balance)}">
      <svg viewBox="0 0 120 120">
        <defs>
          <linearGradient id="g-in" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5ff0c0" /><stop offset="1" stop-color={IN} /></linearGradient>
          <linearGradient id="g-out" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffa08f" /><stop offset="1" stop-color={OUT} /></linearGradient>
        </defs>
        <circle cx="60" cy="60" r="54" class="track" stroke-width="9" />
        <circle cx="60" cy="60" r="42" class="track" stroke-width="9" />
        <circle cx="60" cy="60" r="54" class="arc in" stroke="url(#g-in)" stroke-width="9" stroke-dasharray={ring(54)} stroke-dashoffset={ring(54) * (1 - inShare)} />
        <circle cx="60" cy="60" r="42" class="arc out" stroke="url(#g-out)" stroke-width="9" stroke-dasharray={ring(42)} stroke-dashoffset={ring(42) * (1 - outShare)} />
      </svg>
      <div class="mid"><b class:pos={balance >= 0} class:neg={balance < 0}><Tally cents={balance} showCents={false} /></b><span>saldo</span></div>
    </div>
    <div class="nums">
      <div><span class="key"><i style:background={IN}></i>Entrou</span><b class="num pos"><Tally cents={analysis.incomeTotal} /></b></div>
      <div><span class="key"><i style:background={OUT}></i>Saiu</span><b class="num"><Tally cents={analysis.expenseTotal} /></b>
        {#if outOfIn !== null}<span class="caption" class:neg={outOfIn > 1}>{outOfIn > 1 ? `${percent(outOfIn - 1)} a mais do que entrou` : `${percent(outOfIn)} do que entrou`}</span>{/if}</div>
    </div>
  </div>

  {#if biggest.length}
    <div class="big-head"><h4>Maiores gastos</h4></div>
    <div class="tiles">
      {#each biggest as entry (entry.id)}
        {@const merchant = entry.merchant_id ? store.merchantById.get(entry.merchant_id) ?? null : null}
        <button class="tile" onclick={() => ui.editEntry(entry.id)}>
          <Avatar {merchant} category={categoryOf(entry) ?? null} name={entry.title} size={32} />
          <span class="grow txt"><span class="ellipsis name">{entry.title}</span>
            <span class="line"><b class="num val">{money(-spendCents(entry), { cents: false })}</b><span class="caption">{shortDay(spendDate(entry))}{entry.installment_total > 1 ? ` · ${entry.installment_current}/${entry.installment_total}` : ''}</span></span></span>
        </button>
      {/each}
    </div>
  {:else}
    <!-- Sem gastos: o mesmo desenho, vazio, para o layout não pular. -->
    <div class="big-head"><h4>Maiores gastos</h4></div>
    <div class="tiles ghost">
      {#each [0, 1, 2, 3] as k (k)}<div class="tile"><span class="sk-av"></span><span class="grow txt"><span class="sk w1"></span><span class="sk w2"></span></span></div>{/each}
    </div>
    <p class="caption none">Ainda não há saídas neste mês.</p>
  {/if}
</section>

<style>
  .flow { overflow: hidden; background: radial-gradient(120% 80% at 20% 0%, rgba(34, 197, 139, 0.12), transparent 60%), var(--card); }
  .card-head h3 { margin: 0; font: 600 18px var(--font-display); }
  .top { display: flex; align-items: center; gap: 22px; }
  .rings { position: relative; width: 168px; height: 168px; flex: none; container-type: inline-size; }
  .rings svg { width: 100%; height: 100%; transform: rotate(-90deg); overflow: visible; }
  .track { fill: none; stroke: rgba(255, 255, 255, 0.06); }
  .arc { fill: none; stroke-linecap: round; transition: stroke-dashoffset 0.9s cubic-bezier(0.22, 1, 0.36, 1); animation: draw 1.1s cubic-bezier(0.22, 1, 0.36, 1) both; }
  .arc.in { filter: drop-shadow(0 0 6px rgba(34, 197, 139, 0.45)); }
  .arc.out { filter: drop-shadow(0 0 6px rgba(255, 107, 91, 0.45)); animation-delay: 0.12s; }
  @keyframes draw { from { stroke-dashoffset: 400; } }
  .mid { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .mid b { font: 650 clamp(14px, 11cqw, 19px) var(--font-display); letter-spacing: -0.01em; }
  .mid span { font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-3); margin-top: 2px; }
  .nums { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 14px; }
  .nums > div { display: flex; flex-direction: column; gap: 2px; }
  .key { display: flex; align-items: center; gap: 7px; font-size: 13.5px; color: var(--text-2); }
  .nums b { font: 600 20px var(--font-display); white-space: nowrap; }
  i { width: 9px; height: 9px; border-radius: 50%; flex: none; }
  .big-head { margin: 18px 0 8px; padding-top: 14px; border-top: 1px solid var(--stroke); }
  .big-head h4 { margin: 0; font: 600 15px var(--font-display); }
  .tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .tile { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 14px; border: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.03); text-align: left; color: inherit; min-width: 0; transition: background 0.2s, transform 0.2s var(--spring); }
  .tile:hover { background: rgba(255, 255, 255, 0.06); }
  .tile:active { transform: scale(0.97); }
  .txt { display: flex; flex-direction: column; min-width: 0; gap: 1px; }
  .name { font-size: 13.5px; }
  .line { display: flex; align-items: baseline; gap: 6px; white-space: nowrap; overflow: hidden; }
  .val { font-size: 14px; font-weight: 600; white-space: nowrap; }
  .none { margin: 10px 0 0; text-align: center; color: var(--text-3); }
  .ghost .tile { pointer-events: none; }
  .sk-av { width: 32px; height: 32px; border-radius: 50%; background: rgba(255, 255, 255, 0.06); flex: none; }
  .sk { display: block; height: 9px; border-radius: 5px; background: rgba(255, 255, 255, 0.06); margin: 3px 0; }
  .w1 { width: 70%; } .w2 { width: 40%; }
  @media (max-width: 420px) {
    .rings { width: 140px; height: 140px; }
    .top { gap: 16px; }
    .nums b { font-size: 18px; }
  }
</style>
