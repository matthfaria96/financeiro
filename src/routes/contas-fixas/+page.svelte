<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { addMonths, clampedDay, daysInMonth, monthOf, monthTitle, today, parts } from '$lib/core/dates';
  import { money } from '$lib/core/money';
  import Icon from '$lib/ui/Icon.svelte';
  import Avatar from '$lib/ui/Avatar.svelte';
  import WorkspaceBar from '$lib/ui/WorkspaceBar.svelte';
  import SectionTitle from '$lib/ui/SectionTitle.svelte';
  import { hint } from '$lib/ui/hint';
  import BillRow from '$lib/screens/bills/BillRow.svelte';
  import BillEditor from '$lib/screens/bills/BillEditor.svelte';
  import BillsPanel from '$lib/screens/bills/BillsPanel.svelte';
  import { merchantForBill } from '$lib/screens/bills/billLook';
  import { billStatus, dueDate, recurringSuggestions } from '$lib/features/bills';
  import { inScope, inScopeBill } from '$lib/features/model';
  import type { Bill } from '$lib/data/types';

  let month = $state(monthOf(today()));
  let editing = $state<Bill | null>(null);
  let open = $state(false);
  const entries = $derived(store.entries.filter(inScope));
  const bills = $derived(store.bills.filter((b) => b.active && inScopeBill(b)).toSorted((a, b) => a.day_of_month - b.day_of_month));
  const suggestions = $derived(recurringSuggestions(entries, store.bills).slice(0, 6));
  const [y, m] = $derived(month.split('-').map(Number));
  const leading = $derived((new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7);
  const days = $derived(daysInMonth(y, m));
  const now = today();

  function edit(bill: Bill | null) {
    editing = bill;
    open = true;
  }

  async function add(s: (typeof suggestions)[number]) {
    await store.insert('bills', [{ name: s.name, amount_cents: s.cents, day_of_month: s.day, match_pattern: s.name, active: true, category_id: s.categoryId, account_id: null, person_id: null, workspace_id: store.scopeId || null }]);
    store.toast(`${s.name} virou conta fixa.`);
  }
</script>

<div class="page">
  <header class="row between top">
    <h1>Contas fixas</h1>
    <button class="icon-btn" aria-label="Nova conta fixa" onclick={() => edit(null)} use:hint={['Nova conta fixa', 'Uma conta que se repete todo mês (aluguel, luz, assinatura).']}><Icon name="plus" /></button>
  </header>
  <WorkspaceBar />
  <div class="layout"><div class="main">
  <div class="row between">
    <button class="icon-btn" aria-label="Mês anterior" onclick={() => (month = addMonths(month, -1))}><Icon name="chevron-left" /></button>
    <button class="month" onclick={() => (month = monthOf(today()))}>{monthTitle(month)}</button>
    <button class="icon-btn" aria-label="Próximo mês" onclick={() => (month = addMonths(month, 1))}><Icon name="chevron-right" /></button>
  </div>
  <div class="cal">
    {#each ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as w}<span class="wd">{w}</span>{/each}
    {#each Array(leading) as _}<span></span>{/each}
    {#each Array(days) as _, index}
      {@const day = index + 1}
      {@const date = clampedDay(month, day)}
      {@const due = bills.filter((b) => parts(dueDate(b, month)).day === day)}
      <div class="cell" class:today={date === now} class:past={date < now}>
        <span class="d">{day}</span>
        <span class="dots">{#each due.slice(0, 2) as b (b.id)}<Avatar merchant={merchantForBill(b) ?? null} category={store.categoryById.get(b.category_id ?? '') ?? null} name={b.name} size={26} />{/each}</span>
      </div>
    {/each}
  </div>

  {#if bills.length}
    <div class="card stack">
      {#each bills as bill (bill.id)}
        <button class="plain" onclick={() => edit(bill)}><BillRow {bill} status={billStatus(bill, month, entries)} /></button>
      {/each}
    </div>
  {:else}
    <div class="card stack-sm" style="text-align: center; align-items: center; padding: 28px"><Icon name="calendar" size={30} class="faint" /><b>Nenhuma conta fixa</b><span class="small muted">Adicione aluguel, luz, internet e assinaturas para ver o que vence e o que já foi pago.</span></div>
  {/if}

  {#if suggestions.length}
    <SectionTitle title="Parece conta fixa" />
    <div class="card stack-sm">
      <span class="caption">Gastos que se repetiram nos últimos meses com valor parecido.</span>
      {#each suggestions as s (s.id)}
        <div class="row small"><span class="grow ellipsis">{s.name}</span><span class="muted num">dia {s.day} · {money(s.cents)}</span>
          <button class="icon-btn" aria-label="Adicionar" onclick={() => add(s)} use:hint={['Adicionar', 'Cria a conta fixa com este nome, valor e dia.']}><Icon name="plus" size={16} /></button></div>
      {/each}
    </div>
  {/if}
  </div>
  {#if bills.length}<aside class="side"><BillsPanel {bills} {month} {entries} /></aside>{/if}
  </div>
</div>

<BillEditor bind:open bill={editing} />

<style>
  .top h1 { margin: 6px 4px; font: 700 30px var(--font-display); letter-spacing: -0.02em; }
  .month { border: 0; padding: 8px 20px; border-radius: 999px; background: rgba(255, 255, 255, 0.07); font: 500 18px var(--font-display); }
  .layout { display: grid; gap: 18px; grid-template-columns: minmax(0, 1fr); align-items: start; }
  .main { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
  .side { display: flex; flex-direction: column; gap: 16px; }
  @media (min-width: 1100px) { .layout { grid-template-columns: minmax(0, 1fr) 340px; } .side { position: sticky; top: 22px; } }
  .cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
  .wd { text-align: center; font-size: 13px; color: var(--text-2); padding-bottom: 2px; }
  .cell { min-height: 72px; border-radius: 11px; background: rgba(255, 255, 255, 0.04); border: 1px solid var(--stroke); display: flex; flex-direction: column; align-items: center; padding-top: 7px; gap: 5px; }
  .cell.today { background: rgba(255, 255, 255, 0.09); }
  .cell.today .d { color: var(--accent); font-weight: 700; }
  .cell.past .d { color: var(--text-2); }
  .dots { display: flex; }
  .dots :global(.avatar + .avatar) { margin-left: -9px; }
  .plain { background: none; border: 0; text-align: left; padding: 0; }
  @media (max-width: 480px) { .cell { min-height: 58px; } }
</style>
