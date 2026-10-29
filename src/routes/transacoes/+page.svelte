<script lang="ts">
  import Select from '$lib/ui/Select.svelte';
  import { goto } from '$app/navigation';
  import { store } from '$lib/data/store.svelte';
  import { addMonths, monthOf, monthTitle, today, type Month } from '$lib/core/dates';
  import { money } from '$lib/core/money';
  import Icon from '$lib/ui/Icon.svelte';
  import ChartButton from '$lib/ui/ChartButton.svelte';
  import { hint } from '$lib/ui/hint';
  import CategoryDonut from '$lib/screens/money/CategoryDonut.svelte';
  import EntryListCard from '$lib/screens/money/EntryListCard.svelte';
  import CategoryRows from '$lib/screens/money/CategoryRows.svelte';
  import { filter } from '$lib/screens/transactions/filter.svelte';
  import { inScope, inScopeAccount } from '$lib/features/model';
  import { analyzeMonth } from '$lib/features/analytics';
  import { forecastSpending } from '$lib/features/spending';
  import ForecastBreakdown from '$lib/screens/forecast/ForecastBreakdown.svelte';
  import Tally from '$lib/ui/Tally.svelte';
  import { prefs } from '$lib/ui/prefs.svelte';
  import { ui } from '$lib/ui/ui.svelte';
  import { haptic } from '$lib/features/pwa.svelte';
  import ConfigureLink from '$lib/ui/ConfigureLink.svelte';

  /** Lançamentos (o "analítico"): o mês escolhido em saldo, entradas, saídas por categoria e balanço.
   *  Meses futuros mostram o que já está previsto (faturas e contas fixas). */
  const current = monthOf(today());
  let month = $state<Month>(current);
  const entries = $derived(store.entries.filter(inScope));
  const accounts = $derived(store.accounts.filter((a) => !a.archived && inScopeAccount(a)).toSorted((a, b) => a.sort_order - b.sort_order));
  const first = $derived(entries.map((e) => monthOf(e.date)).sort()[0] ?? current);
  const options = $derived(Array.from({ length: 64 }, (_, i) => addMonths(current, 3 - i)).filter((m) => m >= first || m >= current));
  const future = $derived(month > current);
  const analysis = $derived(analyzeMonth(month, entries, accounts));
  const previous = $derived(analyzeMonth(addMonths(month, -1), entries, accounts));
  // Saídas: por categoria (padrão) ou lista; fica lembrado no aparelho.
  let outView = $state<'categories' | 'list'>((() => { try { return localStorage.getItem('financeiro.saidas') === 'list' ? 'list' : 'categories'; } catch { return 'categories'; } })());
  function setOutView(v: 'categories' | 'list') {
    outView = v;
    try { localStorage.setItem('financeiro.saidas', v); } catch { /* aba privada */ }
  }
  const forecast = $derived(future ? forecastSpending([month], entries, accounts)[0] : null);

  function search() {
    filter.set({ month });
    goto('#/transacoes/todos');
  }
</script>

<div class="page">
  <header class="row between top">
    <div class="month">
      <button class="icon-btn" aria-label="Mês anterior" disabled={month <= options.at(-1)!} onclick={() => (month = addMonths(month, -1))}><Icon name="chevron-left" /></button>
      <Select variant="title" bind:value={month} label="Mês" options={options.map((m) => ({ value: m, label: monthTitle(m), hint: m > current ? 'previsão' : undefined }))} />
      <button class="icon-btn" aria-label="Próximo mês" disabled={month >= options[0]} onclick={() => (month = addMonths(month, 1))}><Icon name="chevron-right" /></button>
    </div>
    <div class="row" style="gap: 8px">
      <ChartButton icon="calendar" label="Contas fixas" detail="Calendário do mês e do ano: aluguel, luz, escola, IPVA…" onclick={() => goto('#/contas-fixas')} />
      <ChartButton icon="search" label="Buscar" detail="Todos os lançamentos deste mês, com busca e filtros." onclick={search} />
    </div>
  </header>

  {#if forecast}
    <section class="card">
      <div class="card-head"><h3>Previsão de {monthTitle(month).split(' ')[0].toLowerCase()}</h3><b class="num warn big">{money(forecast.total, { cents: false })}</b></div>
      <p class="caption" style="margin: -6px 0 0">Fixas pelo valor cadastrado; variáveis e sazonais pela média dos últimos meses. <a class="link" href="#/previsao" onclick={() => (ui.forecastMonth = month)}>Ver detalhes</a></p>
    </section>
    <ForecastBreakdown {forecast} />
  {:else}
    <section class="card totals">
      <div><span class="caption">Entradas</span><b class="pos"><Tally cents={analysis.incomeTotal} /></b></div>
      <div><span class="caption">Saídas</span><b><Tally cents={analysis.expenseTotal} /></b></div>
      <div><span class="caption">Balanço</span><b class:pos={analysis.balance >= 0} class:neg={analysis.balance < 0}><Tally cents={analysis.balance} /></b></div>
    </section>
    <!-- Qual visão está ativa (muda em Configurar Lançamentos). -->
    <p class="view-note caption">
      {#if prefs.creditByPurchase}<b>O que você gastou em {monthTitle(month).split(' ')[0].toLowerCase()}</b>: cada compra no dia em que foi feita, com o valor inteiro — parcelada também (ex.: R$ 10.000 em 5x conta R$ 10.000 aqui).
      {:else}<b>O que você paga em {monthTitle(month).split(' ')[0].toLowerCase()}</b>: contas, Pix e as faturas que vencem no mês — de compra parcelada, só a parcela deste mês (ex.: R$ 10.000 em 5x conta R$ 2.000).{/if}
      <a class="link" href="#/transacoes/configurar">Mudar</a>
    </p>
    <!-- Sempre entradas antes de saídas. A rosca de entradas só aparece com 3 fontes ou mais (com menos, a lista já diz tudo). -->
    <div class="layout" class:single={analysis.income.length < 3}>
      {#if analysis.income.length >= 3}<CategoryDonut title="Entradas" groups={analysis.income} total={analysis.incomeTotal} empty="" />{/if}
      <CategoryDonut title="Saídas" groups={analysis.expenses} total={analysis.expenseTotal} empty="Nenhuma saída neste mês." />
    </div>
    <EntryListCard title="Entradas" entries={analysis.income.flatMap((g) => g.entries)} total={analysis.incomeTotal} tone="pos" />
    <section class="card flush out">
      <div class="card-head pad"><h3>Saídas <span class="caption">· {analysis.expenses.reduce((n, g) => n + g.entries.length, 0)}</span></h3>
        <div class="row" style="gap: 12px"><b class="num"><Tally cents={-analysis.expenseTotal} /></b>
          <div class="mode" role="radiogroup" aria-label="Visualização">
            <span class="pill-bg" class:right={outView === 'list'} aria-hidden="true"></span>
            <button role="radio" aria-checked={outView === 'categories'} class:on={outView === 'categories'} onclick={() => setOutView('categories')} aria-label="Por categoria" use:hint={['Por categoria', 'Agrupa as saídas por categoria; toque para abrir.']}><Icon name="reports" size={15} /></button>
            <button role="radio" aria-checked={outView === 'list'} class:on={outView === 'list'} onclick={() => setOutView('list')} aria-label="Lista" use:hint={['Lista', 'Todas as saídas, das mais novas para as mais antigas.']}><Icon name="list" size={15} /></button>
          </div>
        </div>
      </div>
      {#if outView === 'categories'}<CategoryRows flat groups={analysis.expenses} previous={previous.expenses} />
      {:else}<EntryListCard bare entries={analysis.expenses.flatMap((g) => g.entries)} />{/if}
    </section>
  {/if}
  <ConfigureLink href="#/transacoes/configurar" />
</div>
<button class="fab" aria-label="Novo lançamento" onclick={() => { haptic(); ui.newEntryOpen = true; }} use:hint={['Novo lançamento', 'Anote à mão um gasto ou uma entrada (dinheiro, Pix de alguém…).']}><Icon name="plus" size={24} stroke={2.4} /></button>

<style>
  .top { gap: 10px; flex-wrap: wrap; }
  .month { display: flex; align-items: center; gap: 8px; }
  .icon-btn:disabled { opacity: 0.3; }
  .layout { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); align-items: stretch; }
  @media (min-width: 1000px) { .layout:not(.single) { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .pad { padding: 16px 18px 10px; margin: 0; }
  .out .card-head b { font-size: 16px; }
  .mode { position: relative; display: flex; gap: 2px; padding: 3px; border-radius: 10px; background: rgba(255, 255, 255, 0.06); border: 1px solid var(--stroke); isolation: isolate; }
  .pill-bg { position: absolute; z-index: -1; left: 3px; top: 3px; width: 32px; height: 28px; border-radius: 8px; background: rgba(255, 255, 255, 0.14); transition: transform 0.4s var(--spring); }
  .pill-bg.right { transform: translateX(34px); }
  .mode button { width: 32px; height: 28px; border: 0; border-radius: 8px; background: none; color: var(--text-3); display: grid; place-items: center; transition: color 0.2s; }
  .mode button:hover:not(.on) { color: var(--text-2); }
  .mode button.on { color: var(--text); }
  /* Botão flutuante (novo lançamento): vidro, fixo no canto; no celular fica acima da barra de abas. */
  .fab { position: fixed; z-index: 45; right: 22px; bottom: calc(96px + env(safe-area-inset-bottom)); width: 58px; height: 58px; border-radius: 50%; display: grid; place-items: center;
    color: var(--accent); border: 1px solid rgba(255, 255, 255, 0.16); background: rgba(30, 46, 40, 0.55);
    backdrop-filter: blur(22px) saturate(1.8); -webkit-backdrop-filter: blur(22px) saturate(1.8);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14), 0 14px 36px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(43, 212, 164, 0.12);
    animation: fab-in 0.5s var(--spring) 0.2s backwards; transition: transform 0.25s var(--spring), background 0.2s, color 0.2s; }
  .fab:hover { transform: translateY(-2px) scale(1.04); background: rgba(43, 212, 164, 0.22); color: #b8ffe6; }
  .fab:active { transform: scale(0.92); }
  @keyframes fab-in { from { opacity: 0; transform: scale(0.6) translateY(12px); } }
  @media (min-width: 960px) { .fab { right: 32px; bottom: 32px; width: 60px; height: 60px; } }
  .view-note { margin: -2px 4px 2px; line-height: 1.45; }
  .view-note b { color: var(--text); font-weight: 600; }
  .totals { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .totals > div { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .totals b { font: 600 clamp(15px, 4vw, 22px) var(--font-display); white-space: nowrap; }
  .big { font: 600 24px var(--font-display); }
</style>
