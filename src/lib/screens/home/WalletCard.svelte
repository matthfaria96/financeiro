<script lang="ts">
  import { money } from '$lib/core/money';
  import { dayMonth } from '$lib/core/dates';
  import type { Account } from '$lib/data/types';
  import { ui } from '$lib/ui/ui.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import { hint } from '$lib/ui/hint';
  import { balanceOf, lastEntryDate } from '$lib/features/model';

  /** Carteira: os cartões das contas, grandes, com saldo e a data do último extrato. */
  let { accounts }: { accounts: Account[] } = $props();
</script>

<section class="card">
  <div class="card-head"><h3>Contas e cartões</h3>
    <button class="btn ghost" onclick={() => (ui.newAccountOpen = true)} use:hint={['Cadastrar conta', 'Qualquer banco: conta, cartão, investimento ou dinheiro.']}><Icon name="plus" size={15} />Cadastrar</button></div>
  <div class="wallet">
    {#each accounts as account (account.id)}
      {@const balance = balanceOf(account)}
      {@const last = lastEntryDate(account)}
      <a class="item" href="#/contas/{account.id}">
        <BankCard {account} width={168} />
        <span class="name ellipsis">{account.name}</span>
        <b class="num" class:neg={balance < 0 && account.kind !== 'creditCard'}>{account.kind === 'creditCard' ? `${money(Math.max(0, -balance), { cents: false })} em aberto` : money(balance, { cents: false })}</b>
        <span class="caption">{last ? `Extrato até ${dayMonth(last)}` : 'Sem extrato ainda'}</span>
      </a>
    {/each}
  </div>
</section>

<style>
  .wallet { display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); gap: 18px 14px; }
  .item { display: flex; flex-direction: column; gap: 4px; color: inherit; }
  .item :global(.bank) { margin-bottom: 6px; transition: transform 0.25s var(--ease), box-shadow 0.25s; }
  .item:hover :global(.bank) { transform: translateY(-3px) rotate(-0.6deg); }
  .name { font-size: 14px; }
  .item b { font-size: 15px; }
</style>
