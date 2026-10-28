<script lang="ts">
  import { addMonths, monthOf, today, type Month } from '$lib/core/dates';
  import { money } from '$lib/core/money';
  import type { Account, Entry } from '$lib/data/types';
  import Icon from '$lib/ui/Icon.svelte';
  import ChangeBadge from '$lib/ui/ChangeBadge.svelte';
  import Money from '$lib/ui/Money.svelte';
  import Donut from '$lib/ui/Donut.svelte';
  import { hint } from '$lib/ui/hint';
  import { seriesColor } from '$lib/ui/charts/scale';
  import { monthFlow, totalPaid } from '$lib/features/month';

  /** Resumo: entrou, saiu (com a fatura paga), crédito (informativo) e saldos no último dia. */
  let { month, entries, accounts }: { month: Month; entries: Entry[]; accounts: Account[] } = $props();
  const flow = $derived(monthFlow(month, entries, accounts));
  const before = $derived(monthFlow(addMonths(month, -1), entries, accounts));
  const paid = $derived(totalPaid(flow));
  const paidBefore = $derived(totalPaid(before));
  const net = $derived(flow.income - paid);
  const isCurrent = $derived(month === monthOf(today()));
  const sources = $derived([
    { id: 'conta', label: 'Débito, Pix e boletos', icon: 'bank', value: flow.paidFromAccount, color: seriesColor.account },
    { id: 'fatura', label: 'Faturas pagas', icon: 'card', value: flow.cardBillPaid, color: seriesColor.credit },
    { id: 'dinheiro', label: 'Dinheiro', icon: 'cash', value: flow.paidCash, color: seriesColor.income }
  ]);
  const balances = $derived([
    { label: 'Parado em conta', value: flow.endInAccount, color: '#3987e5' },
    { label: 'Investido', value: flow.endInvested, color: '#199e70' },
    { label: 'Dinheiro', value: flow.endCash, color: '#8bc34a' }
  ]);
</script>

<div class="grid-3 stretch">
  <div class="card stack-sm"><span class="label">Entrou</span><span class="value-lg pos">{money(flow.income, { cents: false })}</span><ChangeBadge change={before.income ? (flow.income - before.income) / before.income : null} higherIsBetter /></div>
  <div class="card stack-sm"><span class="label">Saiu</span><span class="value-lg">{money(paid, { cents: false })}</span><ChangeBadge change={paidBefore ? (paid - paidBefore) / paidBefore : null} /></div>
  <div class="card stack-sm"><span class="label">Resultado do mês</span><span class="value-lg" class:pos={net >= 0} class:neg={net < 0}>{money(net, { cents: false })}</span><span class="caption">Entrou − saiu da conta e do dinheiro</span></div>
</div>

<div class="grid-2 stretch">
  <section class="card" use:hint={['De onde saiu', 'Tudo que saiu da conta corrente e do dinheiro. Transferências entre suas contas e aplicações não contam.']}>
    <div class="card-head"><h3>De onde saiu</h3></div>
    <div class="row" style="gap: 20px">
      <Donut size={150} slices={sources.map((s) => ({ id: s.id, value: s.value, color: s.color, label: s.label }))} center={money(paid, { cents: false })} caption="Saiu" />
      <div class="grow stack">
        {#each sources as s (s.id)}<div class="row between small"><span class="row" style="gap: 8px"><i style:background={s.color}></i>{s.label}</span><span class="num">{money(s.value)}</span></div>{/each}
      </div>
    </div>
  </section>
  <section class="card stack" use:hint={['Saldos', 'Saldo das contas, dos investimentos e do dinheiro no fim do mês.']}>
    <div class="card-head" style="margin: 0"><h3>{isCurrent ? 'Hoje' : 'No último dia do mês'}</h3><b class="num">{money(flow.endInAccount + flow.endInvested + flow.endCash, { cents: false })}</b></div>
    <div class="stack">
      {#each balances as b (b.label)}
        {@const total = Math.max(flow.endInAccount + flow.endInvested + flow.endCash, 1)}
        <div class="stack-sm" style="gap: 5px"><div class="row between small"><span class="row" style="gap: 8px"><i style:background={b.color}></i>{b.label}</span><b class="num">{money(b.value, { cents: false })}</b></div>
          <div class="track"><span style:width="{Math.max(0, b.value / total) * 100}%" style:background={b.color}></span></div></div>
      {/each}
    </div>
    <div class="credit row"><Icon name="card" size={20} color={seriesColor.credit} /><span class="grow small"><b>Comprado no crédito: <Money cents={flow.creditPurchases} colored={false} showCents={false} /></b><br /><span class="caption">Informativo: pago nas próximas faturas.</span></span></div>
  </section>
</div>

<style>
  i { width: 9px; height: 9px; border-radius: 3px; display: inline-block; flex: none; }
  .track { height: 8px; border-radius: 4px; background: rgba(255, 255, 255, 0.06); overflow: hidden; }
  .track span { display: block; height: 100%; border-radius: 4px; transition: width 0.5s var(--ease); }
  .credit { gap: 10px; padding-top: 12px; border-top: 1px solid var(--stroke); }
</style>
