<script lang="ts">
  import { money, percent } from '$lib/core/money';
  import Icon from '$lib/ui/Icon.svelte';
  import Ring from '$lib/ui/charts/Ring.svelte';
  import { hint } from '$lib/ui/hint';
  import { forecastEnd, type Outlook } from '$lib/features/month';

  /** Previsão do fim do mês × a média, e o que já está comprometido no crédito. */
  let { outlook, months }: { outlook: Outlook; months: number } = $props();
  const forecast = $derived(forecastEnd(outlook));
  const average = $derived(outlook.averageEndBalance);
  const change = $derived(average ? (forecast - average) / Math.abs(average) : null);
  const top = $derived(Math.max(Math.abs(forecast), Math.abs(average ?? 0), 1));
</script>

<section class="card stack" use:hint={['Previsão', 'Saldo em conta + entradas previstas − o que falta pagar (fixos cadastrados e média do variável).']}>
  <div class="card-head" style="margin: 0"><h3>Fim do mês</h3>
    {#if change !== null}<span class="pill" class:up={change >= 0} class:down={change < 0}>{percent(change)} {change >= 0 ? 'acima' : 'abaixo'} da média</span>{/if}</div>
  <div class="row" style="gap: 16px">
    <Ring value={average ? Math.max(0, forecast) / top : 1} size={84} color={forecast >= (average ?? 0) ? '#2bd4a4' : '#d95926'} label={average ? percent(Math.max(0, forecast) / Math.max(average, 1)) : '—'} sub="da média" />
    <div class="stack-sm grow">
      <span class="caption">Previsto na conta</span><span class="value-lg" class:neg={forecast < 0}>{money(forecast, { cents: false })}</span>
      <span class="caption">{average !== null ? `Média dos últimos ${Math.min(months, Math.max(outlook.monthsInAverage, 1))} meses: ${money(average, { cents: false })}` : 'Importe meses anteriores para comparar com a média.'}</span>
    </div>
  </div>
  {#if outlook.creditThisMonth > 0 || outlook.futureCommitted > 0}
    <a class="credit" href="#/a-pagar" use:hint={['Crédito', 'Só informativo: o que foi comprado no cartão vai para as próximas faturas.']}>
      <span class="ico"><Icon name="card" size={16} /></span>
      <span class="grow"><b>{money(outlook.creditThisMonth, { cents: false })}</b> no crédito este mês<br /><span class="caption">{money(outlook.futureCommitted, { cents: false })} já comprometido nas próximas faturas</span></span>
      <Icon name="chevron-right" size={14} class="faint" />
    </a>
  {/if}
</section>

<style>
  .pill.up { color: var(--positive); background: rgba(74, 222, 128, 0.14); }
  .pill.down { color: var(--negative); background: rgba(255, 107, 91, 0.14); }
  .credit { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 14px; background: rgba(217, 89, 38, 0.1); font-size: 14px; color: inherit; }
  .ico { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; background: linear-gradient(160deg, #d95926, #8a3210); color: #fff; flex: none; }
</style>
