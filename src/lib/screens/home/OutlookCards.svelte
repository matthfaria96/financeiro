<script lang="ts">
  import { money, percent } from '$lib/core/money';
  import { dayMonth } from '$lib/core/dates';
  import Icon from '$lib/ui/Icon.svelte';
  import Money from '$lib/ui/Money.svelte';
  import { hint } from '$lib/ui/hint';
  import { forecastEnd, outlookTotal, stillToPay, type Outlook } from '$lib/features/month';

  let { outlook, months }: { outlook: Outlook; months: number } = $props();
  const forecast = $derived(forecastEnd(outlook));
  const pending = $derived(stillToPay(outlook));
  const change = $derived(outlook.averageEndBalance ? (forecast - outlook.averageEndBalance) / Math.abs(outlook.averageEndBalance) : null);
  const top = $derived(Math.max(Math.abs(forecast), Math.abs(outlook.averageEndBalance ?? 0), 1));
</script>

<section class="card stack" use:hint={['Quanto tenho agora', 'Contas, investimentos e dinheiro em espécie. O cartão em aberto aparece embaixo e não está descontado.']}>
  <div>
    <div class="label">Quanto tenho agora</div>
    <div class="value-xl">{money(outlookTotal(outlook))}</div>
  </div>
  <div class="tiles">
    <div class="tile" style:--c="var(--blue)"><span><Icon name="bank" size={13} />Em conta</span><b class="num">{money(outlook.inAccount, { cents: false })}</b></div>
    <div class="tile" style:--c="var(--accent)"><span><Icon name="invest" size={13} />Investido</span><b class="num">{money(outlook.invested, { cents: false })}</b></div>
    <div class="tile" style:--c="#A5D6A7"><span><Icon name="cash" size={13} />Dinheiro</span><b class="num">{money(outlook.cash, { cents: false })}</b></div>
  </div>
  {#if outlook.cardsOpen > 0}
    <div class="row between small"><span class="row" style="gap: 8px"><Icon name="card" size={15} color="var(--purple)" /><span class="muted">Nos cartões, em aberto</span></span><b class="num">{money(outlook.cardsOpen)}</b></div>
  {/if}
</section>

<section class="card stack" use:hint={['Este mês', '"Já saiu" é o que saiu da conta e do dinheiro (débito, Pix, boleto e fatura paga). Compras no crédito ficam para a fatura.']}>
  <div class="label">Este mês</div>
  <div class="row between figures">
    <div><span class="caption">Entrou</span><b class="num pos">{money(outlook.incomeSoFar, { cents: false })}</b></div>
    <div><span class="caption">Já saiu</span><b class="num">{money(outlook.paidSoFar, { cents: false })}</b></div>
    <div style="text-align: right"><span class="caption">Falta pagar</span><b class="num warn">{money(pending, { cents: false })}</b></div>
  </div>
  <div class="lines">
    {#each outlook.cardBillsDue as bill (bill.account.id + bill.due)}
      <div class="row between small"><span class="row grow" style="gap: 8px"><Icon name="card" size={15} class="faint" /><span class="ellipsis">Fatura {bill.account.name} · vence {dayMonth(bill.due)}</span></span><span class="num">{money(bill.cents)}</span></div>
    {/each}
    {#if outlook.fixedPending > 0}
      <div class="row between small"><span class="row" style="gap: 8px"><Icon name="pin" size={15} class="faint" />Contas fixas que ainda não saíram</span><span class="num">{money(outlook.fixedPending)}</span></div>
    {/if}
    {#if outlook.variableRemaining > 0}
      <div class="row between small"><span class="row" style="gap: 8px"><Icon name="cart" size={15} class="faint" />Variável previsto até o fim do mês</span><span class="num">{money(outlook.variableRemaining)}</span></div>
    {/if}
    {#if pending === 0}<div class="small pos row" style="gap: 6px"><Icon name="check-circle" size={15} />Nada pendente para este mês</div>{/if}
  </div>
  <a class="link" href="#/a-pagar"><Icon name="list" size={15} />Ver tudo que tenho para pagar</a>
</section>

<section class="card stack" use:hint={['Previsão', 'Saldo em conta + entradas previstas − o que falta pagar (fixos cadastrados e média do variável).']}>
  <div class="label">Previsão para o fim do mês</div>
  <div class="row" style="align-items: baseline; gap: 10px; flex-wrap: wrap">
    <span class="value-lg" class:neg={forecast < 0}>{money(forecast, { cents: false })}</span>
    {#if change !== null}
      <span class="pill" class:up={change >= 0} class:down={change < 0}>{percent(change)} {change >= 0 ? 'acima' : 'abaixo'} da média</span>
    {/if}
  </div>
  {#if outlook.averageEndBalance !== null}
    <div class="bars">
      <span class="caption">Previsto</span><div class="track"><div style:width="{Math.max(2, (Math.max(forecast, 0) / top) * 100)}%" style:background="var(--accent)"></div></div>
      <span class="caption">Média</span><div class="track"><div style:width="{Math.max(2, (Math.max(outlook.averageEndBalance, 0) / top) * 100)}%" style:background="rgba(255,255,255,0.35)"></div></div>
    </div>
    <span class="caption">Média do fim do mês nos últimos {Math.min(months, Math.max(outlook.monthsInAverage, 1))} meses: {money(outlook.averageEndBalance, { cents: false })}</span>
  {:else}
    <span class="caption">Importe extratos de meses anteriores para comparar com a sua média.</span>
  {/if}
</section>

{#if outlook.creditThisMonth > 0 || outlook.futureCommitted > 0}
  <a class="card row credit" href="#/a-pagar" use:hint={['Crédito', 'Só informativo: o que foi comprado no cartão vai para as próximas faturas.']}>
    <Icon name="card" size={24} color="var(--purple)" />
    <span class="grow stack-sm" style="gap: 3px">
      <b>Comprado no crédito este mês: <Money cents={outlook.creditThisMonth} showCents={false} colored={false} /></b>
      <span class="caption">Não saiu da conta agora: entra nas próximas faturas. Já comprometido depois deste mês: {money(outlook.futureCommitted, { cents: false })} (inclui parcelas).</span>
    </span>
    <Icon name="chevron-right" size={16} class="faint" />
  </a>
{/if}

<style>
  .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .tile { padding: 11px 12px; border-radius: 14px; background: color-mix(in srgb, var(--c) 11%, transparent); display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .tile span { display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: var(--c); }
  .tile b { font-size: 17px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .figures > div { display: flex; flex-direction: column; gap: 2px; }
  .figures b { font: 600 20px var(--font-display); }
  .lines { display: flex; flex-direction: column; gap: 8px; padding-top: 12px; border-top: 1px solid var(--stroke); }
  .link { display: inline-flex; align-items: center; gap: 6px; color: var(--accent); font-weight: 600; font-size: 14.5px; }
  .pill.up { color: var(--positive); background: rgba(74, 222, 128, 0.14); }
  .pill.down { color: var(--negative); background: rgba(255, 107, 91, 0.14); }
  .bars { display: grid; grid-template-columns: 64px 1fr; gap: 8px 10px; align-items: center; }
  .track { height: 8px; border-radius: 4px; background: rgba(255, 255, 255, 0.06); overflow: hidden; }
  .track div { height: 100%; border-radius: 4px; transition: width 0.6s var(--ease); }
  .credit { transition: background 0.2s; }
  .credit:hover { background: rgba(26, 34, 31, 0.95); }
</style>
