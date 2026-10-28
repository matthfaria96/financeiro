<script lang="ts">
  import { money, percent } from '$lib/core/money';
  import { dayMonth, monthTitle, monthOf, today } from '$lib/core/dates';
  import Icon from '$lib/ui/Icon.svelte';
  import { hint } from '$lib/ui/hint';
  import { stillToPay, type Outlook } from '$lib/features/month';

  /** Este mês: entrou, já saiu e falta pagar, numa barra só (quanto da entrada já foi e quanto vai). */
  let { outlook }: { outlook: Outlook } = $props();
  const pending = $derived(stillToPay(outlook));
  const base = $derived(Math.max(outlook.incomeSoFar + outlook.expectedIncome, outlook.paidSoFar + pending, 1));
  const segments = $derived([
    { label: 'Já saiu', value: outlook.paidSoFar, color: '#3987e5' },
    { label: 'Falta pagar', value: pending, color: '#d95926' }
  ]);
  const left = $derived(outlook.incomeSoFar + outlook.expectedIncome - outlook.paidSoFar - pending);
</script>

<section class="card month" use:hint={['Este mês', '"Já saiu" é o que saiu da conta e do dinheiro (débito, Pix, boleto e fatura paga). Compras no crédito ficam para a fatura.']}>
  <div class="card-head"><h3>{monthTitle(monthOf(today()))}</h3><a class="sub link" href="#/a-pagar">Ver o que falta <Icon name="chevron-right" size={12} /></a></div>
  <div class="figures">
    <div><span class="caption">Entrou</span><b class="num pos">{money(outlook.incomeSoFar, { cents: false })}</b></div>
    <div><span class="caption">Já saiu</span><b class="num">{money(outlook.paidSoFar, { cents: false })}</b></div>
    <div><span class="caption">Falta pagar</span><b class="num warn">{money(pending, { cents: false })}</b></div>
  </div>
  <div class="meter" role="img" aria-label="Já saiu {money(outlook.paidSoFar)}, falta pagar {money(pending)}, de {money(base)}">
    {#each segments as s (s.label)}{#if s.value > 0}<span style:flex-basis="{(s.value / base) * 100}%" style:background={s.color} title="{s.label}: {money(s.value)}"></span>{/if}{/each}
  </div>
  <div class="row between caption">
    <span class="row" style="gap: 12px"><span class="row" style="gap: 5px"><i style:background="#3987e5"></i>Já saiu</span><span class="row" style="gap: 5px"><i style:background="#d95926"></i>Falta pagar</span></span>
    <span>{left >= 0 ? `Sobra prevista ${money(left, { cents: false })}` : `Faltam ${money(-left, { cents: false })}`}</span>
  </div>
  <div class="lines">
    {#each outlook.cardBillsDue as bill (bill.account.id + bill.due)}
      <div class="row between small"><span class="row grow" style="gap: 8px"><Icon name="card" size={15} class="faint" /><span class="ellipsis">Fatura {bill.account.name} · {dayMonth(bill.due)}</span></span><span class="num">{money(bill.cents)}</span></div>
    {/each}
    {#if outlook.fixedPending > 0}<div class="row between small"><span class="row" style="gap: 8px"><Icon name="pin" size={15} class="faint" />Contas fixas a sair</span><span class="num">{money(outlook.fixedPending)}</span></div>{/if}
    {#if outlook.variableRemaining > 0}<div class="row between small"><span class="row" style="gap: 8px"><Icon name="cart" size={15} class="faint" />Variável até o fim do mês</span><span class="num">{money(outlook.variableRemaining)}</span></div>{/if}
    {#if pending === 0}<div class="small pos row" style="gap: 6px"><Icon name="check-circle" size={15} />Nada pendente para este mês</div>{/if}
  </div>
  {#if outlook.incomeSoFar > 0}<span class="caption">Já saiu {percent(outlook.paidSoFar / outlook.incomeSoFar)} do que entrou.</span>{/if}
</section>

<style>
  .month { display: flex; flex-direction: column; gap: 14px; }
  .card-head { margin-bottom: 0; }
  .link { display: inline-flex; align-items: center; gap: 2px; color: var(--accent); font-weight: 600; }
  .figures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .figures > div { display: flex; flex-direction: column; gap: 2px; }
  .figures b { font: 600 21px var(--font-display); letter-spacing: -0.01em; }
  .meter { display: flex; gap: 2px; height: 12px; border-radius: 6px; background: rgba(255, 255, 255, 0.06); overflow: hidden; }
  .meter span { height: 100%; transition: flex-basis 0.6s var(--ease); }
  .meter span:last-child { border-radius: 0 4px 4px 0; }
  i { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
  .lines { display: flex; flex-direction: column; gap: 8px; padding-top: 12px; border-top: 1px solid var(--stroke); }
</style>
