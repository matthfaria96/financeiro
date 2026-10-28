<script lang="ts">
  import { addMonths, monthOf, today, type Month } from '$lib/core/dates';
  import { money } from '$lib/core/money';
  import type { Account, Entry } from '$lib/data/types';
  import Icon from '$lib/ui/Icon.svelte';
  import ChangeBadge from '$lib/ui/ChangeBadge.svelte';
  import Money from '$lib/ui/Money.svelte';
  import { hint } from '$lib/ui/hint';
  import { monthFlow, totalPaid } from '$lib/features/month';

  /** Resumo: entrou, saiu (com a fatura paga), crédito (informativo) e saldos no último dia. */
  let { month, entries, accounts }: { month: Month; entries: Entry[]; accounts: Account[] } = $props();
  const flow = $derived(monthFlow(month, entries, accounts));
  const before = $derived(monthFlow(addMonths(month, -1), entries, accounts));
  const paid = $derived(totalPaid(flow));
  const paidBefore = $derived(totalPaid(before));
  const net = $derived(flow.income - paid);
  const isCurrent = $derived(month === monthOf(today()));
</script>

<div class="two">
  <div class="card stack-sm"><span class="label">Entrou</span><span class="value-lg pos">{money(flow.income, { cents: false })}</span><ChangeBadge change={before.income ? (flow.income - before.income) / before.income : null} higherIsBetter /></div>
  <div class="card stack-sm"><span class="label">Saiu</span><span class="value-lg">{money(paid, { cents: false })}</span><ChangeBadge change={paidBefore ? (paid - paidBefore) / paidBefore : null} /></div>
</div>

<section class="card stack-sm" use:hint={['De onde saiu', 'Tudo que saiu da conta corrente e do dinheiro. Transferências entre suas contas e aplicações não contam.']}>
  <span class="label">De onde saiu</span>
  <div class="row between small"><span class="row" style="gap: 8px"><Icon name="bank" size={16} class="faint" />Débito, Pix, boletos e transferências</span><span class="num">{money(flow.paidFromAccount)}</span></div>
  <div class="row between small"><span class="row" style="gap: 8px"><Icon name="cash" size={16} class="faint" />Dinheiro</span><span class="num">{money(flow.paidCash)}</span></div>
  <div class="row between small"><span class="row" style="gap: 8px"><Icon name="card" size={16} class="faint" />Faturas de cartão pagas</span><span class="num">{money(flow.cardBillPaid)}</span></div>
  <div class="row between sep"><b>Resultado do mês</b><b class="num" class:pos={net >= 0} class:neg={net < 0}>{money(net)}</b></div>
</section>

<section class="card row">
  <Icon name="card" size={24} color="var(--purple)" />
  <span class="grow stack-sm" style="gap: 3px"><b>Comprado no crédito: <Money cents={flow.creditPurchases} colored={false} /></b><span class="caption">Informativo: compras feitas neste mês que são pagas nas próximas faturas.</span></span>
</section>

<section class="card stack" use:hint={['Saldos', 'Saldo das contas, dos investimentos e do dinheiro no fim do mês.']}>
  <span class="label">{isCurrent ? 'Hoje' : 'No último dia do mês'}</span>
  <div class="tiles">
    <div class="tile" style:--c="var(--blue)"><span>Parado em conta</span><b class="num">{money(flow.endInAccount, { cents: false })}</b></div>
    <div class="tile" style:--c="var(--accent)"><span>Investido</span><b class="num">{money(flow.endInvested, { cents: false })}</b></div>
    <div class="tile" style:--c="#A5D6A7"><span>Dinheiro</span><b class="num">{money(flow.endCash, { cents: false })}</b></div>
  </div>
  <div class="row between small"><span class="muted">Total</span><b class="num">{money(flow.endInAccount + flow.endInvested + flow.endCash)}</b></div>
</section>

<style>
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .sep { padding-top: 10px; margin-top: 4px; border-top: 1px solid var(--stroke); }
  .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .tile { padding: 11px 12px; border-radius: 14px; background: color-mix(in srgb, var(--c) 11%, transparent); display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .tile span { font-size: 12px; font-weight: 600; color: var(--c); }
  .tile b { font-size: 17px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
