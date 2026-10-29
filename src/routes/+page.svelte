<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { ui } from '$lib/ui/ui.svelte';
  import { dayHeader, monthOf, monthTitle, today } from '$lib/core/dates';
  import Icon from '$lib/ui/Icon.svelte';
  import { hint } from '$lib/ui/hint';
  import Welcome from '$lib/screens/home/Welcome.svelte';
  import BalanceCard from '$lib/screens/money/BalanceCard.svelte';
  import MonthStrip from '$lib/screens/money/MonthStrip.svelte';
  import PanoramaCard from '$lib/screens/money/PanoramaCard.svelte';
  import ForecastCard from '$lib/screens/money/ForecastCard.svelte';
  import { lastEntryDate } from '$lib/features/model';
  import { dayMonth } from '$lib/core/dates';
  import AccountsSheet from '$lib/screens/money/AccountsSheet.svelte';
  import { inScope, inScopeAccount } from '$lib/features/model';
  import { analyzeMonth } from '$lib/features/analytics';

  /** Início: meses no topo (o atual em destaque), Saldo, Panorama mensal e Previsão dos próximos meses. */
  const entries = $derived(store.entries.filter(inScope));
  const accounts = $derived(store.accounts.filter((a) => !a.archived && inScopeAccount(a)).toSorted((a, b) => a.sort_order - b.sort_order));
  let month = $state(monthOf(today()));
  const first = $derived(entries.map((e) => monthOf(e.date)).sort()[0] ?? null);
  const analysis = $derived(analyzeMonth(month, entries, accounts));
  const empty = $derived(!store.accounts.length || !store.entries.length);

  let configOpen = $state(false);
  // Contas cujo extrato ainda não chegou neste mês (as entradas do mês parecem zeradas por isso).
  const stale = $derived(accounts.filter((a) => a.kind === 'checking').map((a) => ({ account: a, last: lastEntryDate(a) })).filter((x) => x.last && x.last < `${month}-01` && month === monthOf(today()))
    .map((x) => `${x.account.name} até ${dayMonth(x.last!)}`));
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
</script>

<div class="page narrow">
  <header class="row between top">
    <div><h1>{greeting}</h1><span class="muted small">{dayHeader(today())}</span></div>
    <div class="row" style="gap: 8px">
      <button class="icon-btn" aria-label="Novo lançamento" onclick={() => (ui.newEntryOpen = true)} use:hint={['Novo lançamento', 'Anote um gasto ou entrada à mão (dinheiro, por exemplo).']}><Icon name="plus" /></button>
      <button class="btn primary" onclick={() => ui.startImport()} use:hint={['Importar extrato', 'Escolha a conta e o arquivo do banco. Você confere antes de gravar.']}><Icon name="import" size={16} /><span class="hide-m">Importar</span></button>
    </div>
  </header>

  {#if empty}
    <Welcome />
  {:else}
    <MonthStrip bind:value={month} {first} />
    <div class="cards">
      <BalanceCard {analysis} current={month === monthOf(today())} title={month === monthOf(today()) ? 'Saldo financeiro' : month > monthOf(today()) ? 'Saldo hoje' : `Saldo no fim de ${monthTitle(month).split(' ')[0].toLowerCase()}`} hidden={store.household?.settings.home_hidden ?? []} />
      <PanoramaCard {month} {analysis} {entries} {accounts} {stale} />
      <ForecastCard {accounts} />
    </div>
    <button class="btn settings" onclick={() => (configOpen = true)} use:hint={['Configurações do Início', 'Quais contas, cartões e dinheiro aparecem no Saldo.']}><Icon name="settings" size={16} />Configurações</button>
  {/if}

</div>
<AccountsSheet bind:open={configOpen} />

<style>
  .top h1 { margin: 6px 4px 2px; font: 700 30px var(--font-display); letter-spacing: -0.02em; }
  .top .small { margin-left: 4px; white-space: nowrap; }
  .top { gap: 10px; }
  .top > div:first-child { min-width: 0; }
  .cards { display: flex; flex-direction: column; gap: 16px; }
  .settings { align-self: center; margin-top: 10px; height: 38px; padding: 0 16px; color: var(--text-2); font-weight: 500; }
  .settings:hover { color: var(--text); }
</style>
