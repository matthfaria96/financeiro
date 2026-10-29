<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { money } from '$lib/core/money';
  import { dayMonth, diffDays, today } from '$lib/core/dates';
  import Icon from '$lib/ui/Icon.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import PersonChip from '$lib/ui/PersonChip.svelte';
  import { hint } from '$lib/ui/hint';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';
  import AccountEditor from '$lib/screens/accounts/AccountEditor.svelte';
  import { balanceOf, lastEntryDate } from '$lib/features/model';
  import { accountRole, bankGroups } from '$lib/features/bankGroups';
  import type { Account } from '$lib/data/types';

  /** Contas por banco: conta corrente, cartão de crédito e cartões virtuais lado a lado, num bloco só. */
  let creating = $state(false);
  let editing = $state<Account | null>(null);
  let editOpen = $state(false);
  const active = $derived(store.accounts.filter((a) => !a.archived));
  const groups = $derived(bankGroups(active));
  const archived = $derived(store.accounts.filter((a) => a.archived));
  let showArchived = $state(false);
  const stale = (a: Account) => { const last = lastEntryDate(a); return a.kind !== 'cash' && (!last || diffDays(last, today()) > 40); };
  function edit(account: Account) {
    editing = account;
    editOpen = true;
  }
</script>

<div class="page">
  <SubHeader title="Contas e cartões" back="#/configurar"><button class="btn primary" onclick={() => (creating = true)} use:hint={['Cadastrar', 'Conta, cartão (inclusive virtual), investimento ou dinheiro.']}><Icon name="plus" size={16} /><span class="hide-m">Cadastrar</span></button></SubHeader>
  {#each groups as group (group.key)}
    {@const person = group.main.default_person_id ? store.personById.get(group.main.default_person_id) : undefined}
    <section class="card bank">
      <div class="head">
        <div><b class="name">{group.name}</b>{#if person}<PersonChip {person} />{/if}</div>
        <div class="sums">
          {#if group.accounts.some((a) => a.kind !== 'creditCard')}<span><span class="caption">Saldo</span><b class="num" class:neg={group.balance < 0}>{money(group.balance)}</b></span>{/if}
          {#if group.cards}<span><span class="caption">Em aberto no cartão</span><b class="num warn">{money(group.cardOpen)}</b></span>{/if}
        </div>
      </div>
      <div class="items">
        {#each group.accounts as account (account.id)}
          {@const balance = balanceOf(account)}
          {@const last = lastEntryDate(account)}
          <button class="item" onclick={() => edit(account)} use:hint={[account.name, 'Toque para editar banco, tipo, fechamento da fatura, dono e saldo.']}>
            <BankCard {account} width={150} />
            <span class="role caption">{accountRole(account)}{account.last_digits ? ` · ${account.last_digits}` : ''}</span>
            <b class="num">{account.kind === 'creditCard' ? money(Math.max(0, -balance)) : money(balance)}</b>
            <span class="caption" class:warn={stale(account)}>{last ? `Extrato até ${dayMonth(last)}` : 'Sem extrato'}{account.kind === 'creditCard' ? ` · fecha dia ${account.closing_day}` : ''}</span>
          </button>
        {/each}
        <button class="item add" onclick={() => (creating = true)} use:hint={['Adicionar a este banco', 'Outro cartão (virtual, adicional) ou conta deste banco.']}>
          <span class="plus"><Icon name="plus" size={22} /></span><span class="caption">Outro cartão ou conta deste banco</span>
        </button>
      </div>
    </section>
  {:else}
    <div class="card stack empty"><Icon name="card" size={34} class="faint" /><b>Nenhuma conta ainda</b><p class="muted small">Cadastre a conta e o cartão de cada banco. Eles aparecem juntos aqui.</p></div>
  {/each}
  {#if archived.length}
    <button class="btn ghost" style="align-self: flex-start" onclick={() => (showArchived = !showArchived)}><Icon name={showArchived ? 'chevron-up' : 'chevron-down'} size={15} />Arquivadas ({archived.length})</button>
    {#if showArchived}<div class="card flush list">{#each archived as a (a.id)}<button class="list-row" onclick={() => edit(a)}><BankCard account={a} width={44} /><span class="grow">{a.name}</span><span class="caption">{accountRole(a)}</span></button>{/each}</div>{/if}
  {/if}
</div>
<AccountEditor bind:open={creating} />
<AccountEditor bind:open={editOpen} account={editing} />

<style>
  .bank { display: flex; flex-direction: column; gap: 14px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
  .head > div:first-child { display: flex; align-items: center; gap: 8px; }
  .name { font: 600 19px var(--font-display); }
  .sums { display: flex; gap: 20px; }
  .sums > span { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
  .sums b { font-size: 16px; }
  .items { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; }
  .item { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 12px; border-radius: 16px; border: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.03); text-align: left; min-width: 0; }
  .item:hover { border-color: var(--stroke-strong); }
  .item :global(.bank) { margin-bottom: 6px; max-width: 100%; }
  .role { margin-top: 2px; }
  .add { align-items: center; justify-content: center; border-style: dashed; min-height: 150px; color: var(--accent); }
  .plus { width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; background: var(--accent-soft); }
  .empty { align-items: center; text-align: center; }
  .empty p { margin: 0; }
  @media (max-width: 600px) { .add { min-height: 0; flex-direction: row; grid-column: 1 / -1; padding: 10px; } .plus { width: 32px; height: 32px; } .items { grid-template-columns: repeat(2, minmax(0, 1fr)); } .item :global(.bank) { width: 100% !important; height: auto !important; aspect-ratio: 1.58; } }
</style>
