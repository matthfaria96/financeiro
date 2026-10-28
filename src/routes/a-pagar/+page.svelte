<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { ui } from '$lib/ui/ui.svelte';
  import { addDays, lastDay, monthOf, shortDate, today, dayMonth } from '$lib/core/dates';
  import { money } from '$lib/core/money';
  import Icon from '$lib/ui/Icon.svelte';
  import Avatar from '$lib/ui/Avatar.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import WorkspaceBar from '$lib/ui/WorkspaceBar.svelte';
  import SectionTitle from '$lib/ui/SectionTitle.svelte';
  import BillRow from '$lib/screens/bills/BillRow.svelte';
  import { payableGroups, type PayableGroup } from '$lib/features/payables';
  import { isBillPaid } from '$lib/features/month';
  import { billStatus } from '$lib/features/bills';
  import { accountOf, categoryOf, inScope, inScopeAccount, inScopeBill } from '$lib/features/model';

  const month = monthOf(today());
  const now = today();
  const groups = $derived(payableGroups(store.accounts.filter((a) => a.kind === 'creditCard' && inScopeAccount(a))));
  const thisMonth = $derived(groups.filter((g) => monthOf(g.due) === month));
  const upcoming = $derived(groups.filter((g) => g.due > lastDay(month)));
  const cash = $derived(store.entries.filter((e) => inScope(e) && ['checking', 'cash'].includes(accountOf(e)?.kind ?? '')));
  const bills = $derived(store.bills.filter((b) => b.active && inScopeBill(b)).toSorted((a, b) => a.day_of_month - b.day_of_month));
  let open = $state<Set<string>>(new Set());
  const key = (g: PayableGroup) => `${g.account.id}-${g.due}`;
  function toggle(id: string) {
    const next = new Set(open);
    next.has(id) ? next.delete(id) : next.add(id);
    open = next;
  }
  function subtitle(g: PayableGroup) {
    const count = `${g.entries.length} compras${g.installments.length ? ` + ${g.installments.length} parcelas previstas` : ''}`;
    if (isBillPaid(g.account, g.due, g.imported, cash)) return `${count} · paga`;
    return g.due < now ? `${count} · venceu (pagamento não encontrado nos extratos)` : count;
  }
</script>

{#snippet group(g: PayableGroup)}
  <div class="card stack-sm">
    <button class="row head" onclick={() => toggle(key(g))}>
      <BankCard account={g.account} width={56} />
      <span class="grow stack-sm" style="gap: 2px"><b>{g.account.name} · vence {dayMonth(g.due)}</b><span class="caption">{subtitle(g)}</span></span>
      <span class="stack-sm" style="gap: 1px; align-items: flex-end"><b class="num">{money(g.imported + g.projected)}</b>{#if g.projected}<span class="caption" style="color: var(--purple)">{money(g.projected)} previsto</span>{/if}</span>
      <Icon name={open.has(key(g)) ? 'chevron-up' : 'chevron-down'} size={16} class="faint" />
    </button>
    {#if open.has(key(g))}
      {#each g.entries as entry (entry.id)}
        <button class="row line" onclick={() => ui.editEntry(entry.id)}>
          <Avatar merchant={store.merchantById.get(entry.merchant_id ?? '') ?? null} category={categoryOf(entry) ?? null} name={entry.title} size={28} />
          <span class="grow stack-sm" style="gap: 0"><span class="small ellipsis">{entry.title}</span><span class="caption">Comprado em {shortDate(entry.date)}{entry.installment_total > 1 ? ` · ${entry.installment_current}/${entry.installment_total}` : ''}</span></span>
          <span class="small num">{money(entry.amount_cents)}</span>
        </button>
      {/each}
      {#each g.installments as item, i (i)}
        <div class="row line"><span class="clock"><Icon name="clock" size={16} /></span><span class="grow small">{item.title} · parcela {item.label}</span><span class="small num" style="color: var(--purple)">{money(item.cents)}</span></div>
      {/each}
    {/if}
  </div>
{/snippet}

<div class="page">
  <header class="row top"><a class="icon-btn" href="#/" aria-label="Voltar"><Icon name="chevron-left" /></a><h1>A pagar</h1></header>
  <WorkspaceBar />
  <SectionTitle title="Faturas deste mês" />
  {#each thisMonth as g (key(g))}{@render group(g)}{:else}<div class="card small muted">Nenhuma fatura vence neste mês.</div>{/each}
  <SectionTitle title="Próximas faturas" />
  {#each upcoming as g (key(g))}{@render group(g)}{:else}<div class="card small muted">Nada comprometido nas próximas faturas.</div>{/each}
  {#if bills.length}
    <SectionTitle title="Contas fixas deste mês" />
    <div class="card stack">{#each bills as bill (bill.id)}<BillRow {bill} status={billStatus(bill, month, store.entries.filter(inScope))} />{/each}</div>
  {/if}
</div>

<style>
  .top { gap: 10px; }
  .top h1 { margin: 6px 0; font: 700 30px var(--font-display); letter-spacing: -0.02em; }
  .head, .line { background: none; border: 0; padding: 0; text-align: left; width: 100%; }
  .line { padding-top: 6px; }
  .clock { width: 28px; display: grid; place-items: center; color: var(--purple); }
</style>
