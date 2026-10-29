<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { addMonths, monthOf, monthTitle, today } from '$lib/core/dates';
  import { money } from '$lib/core/money';
  import Icon from '$lib/ui/Icon.svelte';
  import Segmented from '$lib/ui/Segmented.svelte';
  import { hint } from '$lib/ui/hint';
  import { inScopeAccount, visibleEntries } from '$lib/features/model';
  import MonthSummary from '$lib/screens/reports/MonthSummary.svelte';
  import CategoryReport from '$lib/screens/reports/CategoryReport.svelte';
  import Breakdown from '$lib/screens/reports/Breakdown.svelte';
  import { exportCSV } from '$lib/screens/reports/exportCsv';
  import FlowCard from '$lib/screens/home/FlowCard.svelte';
  import { flowHistory } from '$lib/features/month';
  import { prefs } from '$lib/ui/prefs.svelte';

  type Tab = 'summary' | 'categories' | 'cost' | 'payment';
  let tab = $state<Tab>('summary');
  // Visão simples: só "para onde foi" (categorias, pessoas, contas); o resto fica na completa.
  const view = $derived<Tab>(prefs.full ? tab : 'categories');
  let month = $state(monthOf(today()));
  const entries = $derived(visibleEntries());
  const accounts = $derived(store.accounts.filter(inScopeAccount));
  const current = monthOf(today());
  const history = $derived(flowHistory(12, entries, accounts));
</script>

<div class="page">
  <header class="row between top" style="gap: 10px">
    <h1>Relatórios</h1>
    <div class="row" style="gap: 8px">
      <a class="btn" href="#/relatorios/planilha" use:hint={['Mês a mês', 'Tabela com todos os meses lado a lado: entradas, crédito, débito, balanço e saldo — como numa planilha.']}><Icon name="table" size={16} /><span class="hide-m">Mês a mês</span></a>
      <button class="icon-btn" aria-label="Imprimir ou salvar PDF" onclick={() => print()} use:hint={['PDF', 'Abre a impressão: escolha "Salvar como PDF" para guardar o relatório deste mês.']}><Icon name="file" /></button>
      <button class="icon-btn" aria-label="Exportar planilha" onclick={() => exportCSV(month, entries)} use:hint={['Planilha CSV', 'Baixa os lançamentos do mês para abrir no Excel, Numbers ou Google Planilhas.']}><Icon name="export" /></button>
    </div>
  </header>
  {#if prefs.full}<div class="no-print"><FlowCard {history} selected={month} title="Últimos 12 meses" onselect={(m) => (month = m)} /></div>{/if}
  <div class="row between monthbar">
    <button class="icon-btn" aria-label="Mês anterior" onclick={() => (month = addMonths(month, -1))}><Icon name="chevron-left" /></button>
    <button class="month" onclick={() => (month = current)} use:hint={['Mês', 'Toque para voltar ao mês atual.']}>{monthTitle(month)}</button>
    <button class="icon-btn" aria-label="Próximo mês" disabled={month >= current} onclick={() => (month = addMonths(month, 1))}><Icon name="chevron-right" /></button>
  </div>
  {#if prefs.full}<Segmented label="Relatório" bind:value={tab} options={[{ value: 'summary', label: 'Resumo' }, { value: 'categories', label: 'Categorias' }, { value: 'cost', label: 'Fixo e sazonal' }, { value: 'payment', label: 'Pagamento' }]} />{/if}
  <div class="print-title">Financeiro · {monthTitle(month)} · {store.household?.name}</div>
  {#if view === 'summary'}
    <MonthSummary {month} {entries} {accounts} />
  {:else if view === 'categories'}
    <CategoryReport {month} {entries} />
  {:else}
    <Breakdown {month} {entries} mode={view === 'payment' ? 'payment' : 'cost'} />
  {/if}
</div>

<style>
  .top h1 { margin: 6px 4px; font: 700 30px var(--font-display); letter-spacing: -0.02em; }
  .month { border: 0; padding: 8px 20px; border-radius: 999px; background: rgba(255, 255, 255, 0.07); font: 500 18px var(--font-display); }
  .icon-btn:disabled { opacity: 0.35; }
  .print-title { display: none; }
  @media print {
    :global(body) { background: #fff !important; color: #000; }
    :global(.sidebar), :global(.tabbar), .top, .monthbar, .no-print { display: none !important; }
    .print-title { display: block; font: 700 20px var(--font-display); margin-bottom: 12px; }
    :global(.card) { background: #fff !important; border-color: #ddd !important; color: #000; break-inside: avoid; }
  }
</style>
