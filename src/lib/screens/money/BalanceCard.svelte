<script lang="ts">
  import { money } from '$lib/core/money';
  import BankCard from '$lib/ui/BankCard.svelte';
  import ChartButton from '$lib/ui/ChartButton.svelte';
  import type { MonthAnalysis } from '$lib/features/analytics';

  /** Saldo financeiro: cada conta (Nubank, Dinheiro, Investimentos…) e o total. */
  let { analysis, onchart, title = 'Saldo financeiro' }: { analysis: MonthAnalysis; onchart?: () => void; title?: string } = $props();
</script>

<section class="card">
  <div class="card-head"><h3>{title}</h3>{#if onchart}<ChartButton onclick={onchart} detail="Evolução do saldo nos últimos meses." />{/if}</div>
  <div class="rows">
    {#each analysis.balances as { account, cents } (account.id)}
      <a class="row item" href="#/contas/{account.id}"><BankCard {account} width={38} /><span class="grow ellipsis">{account.name}</span><span class="num" class:neg={cents < 0}>{money(cents)}</span></a>
    {:else}
      <a class="muted small" href="#/mais/contas">Cadastre suas contas para ver o saldo.</a>
    {/each}
  </div>
  <div class="row between total"><span class="muted">Total</span><b class="num">{money(analysis.balanceTotal)}</b></div>
</section>

<style>
  .rows { display: flex; flex-direction: column; }
  .item { gap: 12px; padding: 8px 0; color: inherit; font-size: 15px; }
  .item + .item { border-top: 1px solid var(--stroke); }
  .total { margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--stroke-strong); }
  .total b { font: 600 22px var(--font-display); }
</style>
