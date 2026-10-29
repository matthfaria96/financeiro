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
  import ForecastCard from '$lib/screens/money/ForecastCard.svelte';
  import MeiCard from '$lib/screens/money/MeiCard.svelte';
  import { isBusiness } from '$lib/features/ambient';
  import AccountsSheet from '$lib/screens/money/AccountsSheet.svelte';
  import ChartsSheet from '$lib/screens/money/ChartsSheet.svelte';
  import { inScope, inScopeAccount } from '$lib/features/model';
  import { analyzeMonth } from '$lib/features/analytics';

  /** Início: sempre o mês atual, em três cartões empilhados: Saldo, o mês e a previsão dos próximos meses. */
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

  let configOpen = $state(false);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
</script>

<div class="page narrow">
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
    <div class="cards">
      <BalanceCard {analysis} hidden={store.household?.settings.home_hidden ?? []} onconfig={() => (configOpen = true)} onchart={() => charts('balance')} />
      <MonthCard {analysis} title={monthTitle(month)} link="#/transacoes" onchart={() => charts('flow')} />
      {#if isBusiness()}<MeiCard />{/if}
      <ForecastCard {accounts} />
    </div>
  {/if}

</div>
<AccountsSheet bind:open={configOpen} />
<ChartsSheet bind:open={chartsOpen} focus={chartFocus} {entries} {accounts} />

<style>
  .top h1 { margin: 6px 4px 2px; font: 700 30px var(--font-display); letter-spacing: -0.02em; }
  .top .small { margin-left: 4px; }
  .cards { display: flex; flex-direction: column; gap: 16px; }
</style>
