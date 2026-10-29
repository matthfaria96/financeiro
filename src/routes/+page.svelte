<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { ui } from '$lib/ui/ui.svelte';
  import { dayHeader, monthOf, monthTitle, today } from '$lib/core/dates';
  import Icon from '$lib/ui/Icon.svelte';
  import WorkspaceBar from '$lib/ui/WorkspaceBar.svelte';
  import { hint } from '$lib/ui/hint';
  import Welcome from '$lib/screens/home/Welcome.svelte';
  import BalanceCard from '$lib/screens/money/BalanceCard.svelte';
  import MonthCard from '$lib/screens/money/MonthCard.svelte';
  import PayCard from '$lib/screens/money/PayCard.svelte';
  import ChartsSheet from '$lib/screens/money/ChartsSheet.svelte';
  import { inScope, inScopeAccount } from '$lib/features/model';
  import { analyzeMonth } from '$lib/features/analytics';

  /** Início: sempre o mês atual. Saldo, entradas × saídas e o que falta pagar (com a previsão). */
  const entries = $derived(store.entries.filter(inScope));
  const accounts = $derived(store.accounts.filter((a) => !a.archived && inScopeAccount(a)).toSorted((a, b) => a.sort_order - b.sort_order));
  const month = monthOf(today());
  const analysis = $derived(analyzeMonth(month, entries, accounts));
  const empty = $derived(!store.accounts.length || !store.entries.length);
  let chartsOpen = $state(false);
  let chartFocus = $state<'balance' | 'flow'>('flow');
  function charts(focus: 'balance' | 'flow') {
    chartFocus = focus;
    chartsOpen = true;
  }

  // Carrossel do celular: qual cartão está à vista (os pontinhos embaixo).
  let slide = $state(0);
  let track = $state<HTMLDivElement>();
  const onScroll = () => {
    if (track) slide = Math.round(track.scrollLeft / track.clientWidth);
  };
  const goTo = (index: number) => track?.scrollTo({ left: index * track.clientWidth, behavior: 'smooth' });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
</script>

<div class="page">
  <header class="row between top">
    <div><h1>{greeting}</h1><span class="muted small">{dayHeader(today())}</span></div>
    <div class="row" style="gap: 8px">
      <button class="icon-btn" aria-label="Novo lançamento" onclick={() => (ui.newEntryOpen = true)} use:hint={['Novo lançamento', 'Anote um gasto ou entrada à mão (dinheiro, por exemplo).']}><Icon name="plus" /></button>
      <button class="btn primary" onclick={() => ui.startImport()} use:hint={['Importar extrato', 'Escolha a conta e o arquivo do banco. Você confere antes de gravar.']}><Icon name="import" size={16} />Importar</button>
    </div>
  </header>
  <WorkspaceBar />

  {#if empty}
    <Welcome />
  {:else}
    <div class="cards" bind:this={track} onscroll={onScroll}>
      <div class="slide"><BalanceCard {analysis} onchart={() => charts('balance')} /></div>
      <div class="slide"><MonthCard {analysis} title={monthTitle(month)} link="#/transacoes" onchart={() => charts('flow')} /></div>
      <div class="slide"><PayCard {accounts} /></div>
    </div>
    <div class="dots" role="tablist" aria-label="Cartões">
      {#each ['Saldo', 'Mês', 'A pagar'] as label, i (label)}<button class:on={slide === i} role="tab" aria-selected={slide === i} aria-label={label} onclick={() => goTo(i)}></button>{/each}
    </div>
  {/if}

  <a class="btn lg block settings" href="#/mais"><Icon name="settings" size={18} />Configuração</a>
</div>
<ChartsSheet bind:open={chartsOpen} focus={chartFocus} {entries} {accounts} />

<style>
  .top h1 { margin: 6px 4px 2px; font: 700 30px var(--font-display); letter-spacing: -0.02em; }
  .top .small { margin-left: 4px; }
  /* Celular: carrossel com encaixe. Computador: três colunas. */
  .cards { display: flex; align-items: flex-start; gap: 14px; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; margin: 0 -16px; padding: 2px 16px; }
  .cards::-webkit-scrollbar { display: none; }
  .slide { flex: 0 0 100%; scroll-snap-align: center; min-width: 0; }
  .dots { display: flex; justify-content: center; gap: 8px; }
  .dots button { width: 8px; height: 8px; border-radius: 50%; border: 0; padding: 0; background: rgba(255, 255, 255, 0.22); transition: width 0.25s var(--ease), background 0.2s; }
  .dots button.on { width: 22px; border-radius: 4px; background: var(--accent); }
  .settings { margin-top: 8px; }
  @media (min-width: 960px) {
    .cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); overflow: visible; margin: 0; padding: 0; align-items: start; gap: 16px; }
    .dots, .settings { display: none; }
  }
</style>
