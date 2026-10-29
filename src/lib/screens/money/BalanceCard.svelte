<script lang="ts">
  import { money } from '$lib/core/money';
  import Icon from '$lib/ui/Icon.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import ChartButton from '$lib/ui/ChartButton.svelte';
  import { hint } from '$lib/ui/hint';
  import BalanceFixSheet from './BalanceFixSheet.svelte';
  import type { MonthAnalysis } from '$lib/features/analytics';

  /** Saldo financeiro: cada conta e o total. Conta sem saldo de referência aparece como estimada. */
  let { analysis, onconfig, hidden = [], title = 'Saldo financeiro' }: { analysis: MonthAnalysis; onconfig?: () => void; hidden?: string[]; title?: string } = $props();
  const shown = $derived(analysis.balances.filter((b) => !hidden.includes(b.account.id)));
  const total = $derived(shown.reduce((s, b) => s + b.cents, 0));
  const estimated = $derived(shown.filter((b) => b.estimated).length);
  let fixOpen = $state(false);
</script>

<section class="card">
  <div class="card-head"><h3>{title}</h3>
    <div class="row" style="gap: 6px">
      <button class="btn close" onclick={() => (fixOpen = true)} use:hint={['Fechar o mês', 'Digite quanto tinha (conta + caixinha): acerta o saldo e lança o rendimento.']}>Fechar o mês</button>
      {#if onconfig}<ChartButton icon="settings" label="Escolher contas" detail="Quais contas, cartões e dinheiro aparecem aqui." onclick={onconfig} />{/if}
    </div>
  </div>
  {#if estimated}
    <button class="warnbox" onclick={() => (fixOpen = true)} use:hint={['Saldo estimado', 'O extrato não trouxe o saldo: o app somou só os lançamentos importados, começando do zero.']}>
      <Icon name="alert" size={16} /><span class="grow">{estimated === 1 ? 'Um saldo está estimado' : `${estimated} saldos estão estimados`}: o extrato não traz o saldo.</span><b>Informar</b>
    </button>
  {/if}
  <div class="rows">
    {#each shown as { account, cents, estimated: guess } (account.id)}
      <a class="row item" href="#/contas/{account.id}"><BankCard {account} width={38} /><span class="grow ellipsis">{account.name}</span>
        {#if guess}<span class="pill guess">estimado</span>{/if}<span class="num" class:neg={cents < 0} class:faint={guess}>{money(cents)}</span></a>
    {:else}
      <a class="muted small" href="#/mais/contas">{analysis.balances.length ? 'Todas as contas estão escondidas.' : 'Cadastre suas contas para ver o saldo.'}</a>
    {/each}
  </div>
  <div class="row between total"><span class="muted">Total{estimated ? ' (estimado)' : ''}</span><b class="num">{money(total)}</b></div>
</section>
<BalanceFixSheet bind:open={fixOpen} />

<style>
  .close { height: 32px; padding: 0 12px; font-size: 13px; }
  .warnbox { display: flex; align-items: center; gap: 10px; width: 100%; margin-bottom: 8px; padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(255, 166, 61, 0.35); background: rgba(255, 166, 61, 0.1); color: var(--warning); font-size: 13.5px; text-align: left; }
  .warnbox b { color: var(--text); white-space: nowrap; }
  .rows { display: flex; flex-direction: column; }
  .item { gap: 12px; padding: 8px 0; color: inherit; font-size: 15px; }
  .item + .item { border-top: 1px solid var(--stroke); }
  .guess { color: var(--warning); background: rgba(255, 166, 61, 0.12); }
  .total { margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--stroke-strong); }
  .total b { font: 600 22px var(--font-display); }
</style>
