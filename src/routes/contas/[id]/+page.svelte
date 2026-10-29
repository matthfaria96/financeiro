<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { store } from '$lib/data/store.svelte';
  import { ui } from '$lib/ui/ui.svelte';
  import { addMonths, dayMonth, monthInitial, monthOf, monthTitle, shortDate, today } from '$lib/core/dates';
  import { money } from '$lib/core/money';
  import Icon from '$lib/ui/Icon.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import PersonChip from '$lib/ui/PersonChip.svelte';
  import SectionTitle from '$lib/ui/SectionTitle.svelte';
  import { hint } from '$lib/ui/hint';
  import { kindName } from '$lib/ui/look';
  import EntryRow from '$lib/screens/EntryRow.svelte';
  import AccountEditor from '$lib/screens/accounts/AccountEditor.svelte';
  import ConfigureLink from '$lib/ui/ConfigureLink.svelte';
  import { filter } from '$lib/screens/transactions/filter.svelte';
  import { balanceOf, billDueOf, kindOf, lastEntryDate } from '$lib/features/model';
  import LineChart from '$lib/ui/charts/LineChart.svelte';
  import BarChart from '$lib/ui/charts/BarChart.svelte';
  import { seriesColor } from '$lib/ui/charts/scale';
  import { bankColor } from '$lib/ui/look';
  import { lastDay, shortMonth } from '$lib/core/dates';

  const account = $derived(store.accountById.get(page.params.id ?? ''));
  const entries = $derived(account ? (store.entriesByAccount.get(account.id) ?? []).toSorted((a, b) => b.date.localeCompare(a.date)) : []);
  const months = $derived(Array.from({ length: 12 }, (_, i) => addMonths(monthOf(today()), i - 11)));
  const covered = $derived(new Set(entries.map((e) => monthOf(e.date))));
  const first = $derived([...covered].sort()[0]);
  // Faltando = depois do primeiro mês importado (antes disso é só histórico que não foi trazido).
  const missing = $derived(months.filter((m) => !covered.has(m) && first && m > first));
  const thisMonth = $derived(entries.filter((e) => monthOf(e.date) === monthOf(today()) && kindOf(e) !== 'transfer'));
  const batches = $derived(store.import_batches.filter((b) => b.account_id === account?.id).toSorted((a, b) => b.imported_at.localeCompare(a.imported_at)));
  let editing = $state(false);
  const labels = $derived(months.map((m) => shortMonth(m).slice(0, 3)));
  const now = today();
  const balances = $derived(account ? months.map((m) => (first && m >= first ? balanceOf(account, lastDay(m) < now ? lastDay(m) : now) : null)) : []);
  const perMonth = (sign: 1 | -1) => months.map((m) => entries.filter((e) => !e.is_mirror && monthOf(e.date) === m && kindOf(e) !== 'transfer' && Math.sign(e.amount_cents) === sign).reduce((s, e) => s + sign * e.amount_cents, 0));
  // Cartão: valor de cada fatura pelo mês de vencimento.
  const bills = $derived(months.map((m) => entries.filter((e) => !e.is_mirror && kindOf(e) === 'expense' && monthOf(billDueOf(e) ?? e.date) === m).reduce((s, e) => s - e.amount_cents, 0)));
</script>

{#if account}
  <div class="page">
    <header class="row between top">
      <span class="row" style="gap: 10px; min-width: 0"><button class="icon-btn" aria-label="Voltar" onclick={() => history.back()}><Icon name="chevron-left" /></button><h1 class="ellipsis">{account.name}</h1></span>
      <button class="import" aria-label="Importar extrato" onclick={() => ui.startImport(account.id)} use:hint={['Importar extrato', `Solte o arquivo do banco: entra direto em ${account.name}.`]}><Icon name="import" size={16} /><span class="hide-m">Importar</span></button>
    </header>
    <section class="card row summary">
      <BankCard {account} width={140} />
      <div class="grow stack-sm" style="gap: 4px">
        <span class="caption">{kindName[account.kind]}</span>
        <span class="value-lg balance" class:neg={balanceOf(account) < 0}>{money(balanceOf(account))}</span>
        <span class="row" style="gap: 6px; flex-wrap: wrap">
          {#if account.default_person_id && store.personById.get(account.default_person_id)}<PersonChip person={store.personById.get(account.default_person_id)!} />{/if}
          {#if account.workspace_id && store.workspaceById.get(account.workspace_id)}{@const w = store.workspaceById.get(account.workspace_id)!}<span class="pill" style:color={w.color} style:background="color-mix(in srgb, {w.color} 15%, transparent)">{w.name}</span>{/if}
        </span>
      </div>
    </section>
    {#if entries.length}
      <div class="grid-2 stretch">
        {#if account.kind === 'creditCard'}
          <section class="card"><div class="card-head"><h3>Faturas</h3><span class="sub">por mês de vencimento</span></div>
            <BarChart {labels} current={11} height={200} title="Valor das faturas" series={[{ id: 'bill', name: 'Fatura', color: bankColor(account), values: bills }]} /></section>
        {:else}
          <section class="card"><div class="card-head"><h3>Saldo</h3><span class="sub">no fim de cada mês</span></div>
            <LineChart {labels} height={200} title="Saldo no fim de cada mês" series={[{ id: 'bal', name: 'Saldo', color: bankColor(account), values: balances }]} /></section>
        {/if}
        <section class="card"><div class="card-head"><h3>Entrou e saiu</h3><span class="sub">sem transferências entre contas</span></div>
          <BarChart {labels} current={11} height={200} title="Entrou e saiu por mês" series={[{ id: 'in', name: 'Entrou', color: seriesColor.income, values: perMonth(1) }, { id: 'out', name: 'Saiu', color: seriesColor.account, values: perMonth(-1) }]} /></section>
      </div>
    {/if}
    <section class="card stack" use:hint={['Meses com extrato', 'Quais dos últimos 12 meses já têm lançamentos nesta conta.']}>
      <div class="row between"><span class="label">Meses com extrato</span>{#if lastEntryDate(account)}<span class="caption">até {dayMonth(lastEntryDate(account)!)}</span>{/if}</div>
      <div class="months">{#each months as m (m)}<div class="mo" title={monthTitle(m)}><span class:on={covered.has(m)}></span><small>{monthInitial(m)}</small></div>{/each}</div>
      {#if missing.length}<button class="btn ghost warn" style="align-self: flex-start; padding: 0" onclick={() => ui.startImport(account.id)}>{missing.length === 1 ? `Falta ${monthTitle(missing[0]).toLowerCase()}: importar` : `Faltam ${missing.length} meses desde ${monthTitle(missing[0]).toLowerCase()}: importar`}</button>{/if}
    </section>
    <section class="card row between">
      <div><span class="caption">Entrou este mês</span><div class="value-md pos">{money(thisMonth.filter((e) => e.amount_cents > 0).reduce((s, e) => s + e.amount_cents, 0))}</div></div>
      <div style="text-align: right"><span class="caption">Saiu este mês</span><div class="value-md">{money(thisMonth.filter((e) => e.amount_cents < 0).reduce((s, e) => s + e.amount_cents, 0))}</div></div>
    </section>
    {#if entries.length}
      <SectionTitle title="Últimos lançamentos"><button class="btn ghost" onclick={() => { filter.set({ accountId: account.id, period: 'all' }); goto('#/transacoes/todos'); }}>Ver todos</button></SectionTitle>
      <div class="card flush entries">{#each entries.slice(0, 8) as entry (entry.id)}<EntryRow {entry} onclick={() => ui.editEntry(entry.id)} />{/each}</div>
    {/if}
    {#if batches.length}
      <SectionTitle title="Arquivos importados" />
      <div class="card flush list">
        {#each batches as batch (batch.id)}
          <div class="list-row"><Icon name="file" size={18} color="var(--accent)" /><span class="grow stack-sm" style="gap: 1px"><span class="small ellipsis">{batch.file_name}</span><span class="caption">{batch.first_date ? `${shortDate(batch.first_date)} a ${shortDate(batch.last_date ?? batch.first_date)} · ` : ''}importado em {shortDate(batch.imported_at.slice(0, 10))}</span></span><span class="caption num">{batch.added_count}</span></div>
        {/each}
      </div>
    {/if}
    <ConfigureLink onclick={() => (editing = true)} />
  </div>
  <AccountEditor bind:open={editing} {account} />
{:else}
  <div class="page"><p class="muted">Conta não encontrada.</p><a class="btn" href="#/">Voltar</a></div>
{/if}

<style>
  .top h1 { margin: 6px 0; font: 700 26px var(--font-display); letter-spacing: -0.02em; }
  .summary { gap: 18px; }
  .balance { white-space: nowrap; font-size: clamp(20px, 6.4vw, 28px); }
  @media (max-width: 600px) { .summary :global(.bank-card), .summary > :global(:first-child) { max-width: 120px; } }
  .import { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 40px; min-width: 40px; padding: 0 14px; border-radius: 999px; font-size: 14px; font-weight: 600; flex: none;
    color: var(--accent); border: 1px solid rgba(43, 212, 164, 0.3); background: var(--accent-soft); transition: background 0.2s, transform 0.2s var(--spring); }
  .import:hover { background: rgba(43, 212, 164, 0.22); }
  .import:active { transform: scale(0.94); }
  @media (max-width: 600px) { .import { padding: 0; width: 40px; } }
  .months { display: grid; grid-template-columns: repeat(12, 1fr); gap: 5px; }
  .mo { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .mo span { width: 100%; height: 26px; border-radius: 6px; background: rgba(255, 255, 255, 0.07); }
  .mo span.on { background: var(--accent); }
  .mo small { font-size: 11px; color: var(--text-2); }
</style>
