<script lang="ts">
  import { money } from '$lib/core/money';
  import { monthTitle, monthOf, today } from '$lib/core/dates';
  import Icon from '$lib/ui/Icon.svelte';
  import { hint } from '$lib/ui/hint';
  import type { Outlook } from '$lib/features/month';

  /** O mês em três números: entrou, saiu, sobrou. O cartão aparece à parte (vai para a fatura). */
  let { outlook }: { outlook: Outlook } = $props();
  const left = $derived(outlook.incomeSoFar - outlook.paidSoFar);
</script>

<section class="card month">
  <div class="caption title">{monthTitle(monthOf(today()))}</div>
  <div class="figures">
    <div use:hint={['Entrou', 'Salário, Pix recebidos e outras entradas deste mês.']}><span class="label">Entrou</span><b class="pos">{money(outlook.incomeSoFar, { cents: false })}</b></div>
    <div use:hint={['Saiu', 'O que saiu da conta e do dinheiro: débito, Pix, boletos e fatura paga.']}><span class="label">Saiu</span><b>{money(outlook.paidSoFar, { cents: false })}</b></div>
    <div use:hint={['Sobrou', 'Entrou menos saiu, até hoje.']}><span class="label">Sobrou</span><b class:pos={left >= 0} class:neg={left < 0}>{money(left, { cents: false })}</b></div>
  </div>
  <div class="foot">
    {#if outlook.creditThisMonth > 0}
      <span class="row" style="gap: 8px" use:hint={['No cartão', 'Compras no crédito deste mês. Não saíram da conta ainda: entram na próxima fatura.']}><Icon name="card" size={15} />No cartão este mês: <b>{money(outlook.creditThisMonth, { cents: false })}</b> <span class="faint">(vai para a fatura)</span></span>
    {/if}
    <span class="row" style="gap: 8px"><Icon name="bank" size={15} />Nas contas hoje: <b>{money(outlook.inAccount + outlook.cash, { cents: false })}</b>{#if outlook.invested > 0}<span class="faint">· investido {money(outlook.invested, { cents: false })}</span>{/if}</span>
  </div>
</section>

<style>
  .month { display: flex; flex-direction: column; gap: 18px; padding: 22px; }
  .title { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
  .figures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .figures > div { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .figures b { font: 600 clamp(22px, 2.6vw, 34px) var(--font-display); letter-spacing: -0.02em; white-space: nowrap; }
  .foot { display: flex; flex-direction: column; gap: 8px; padding-top: 14px; border-top: 1px solid var(--stroke); font-size: 14px; color: var(--text-2); }
  .foot b { color: var(--text); font-weight: 600; }
</style>
