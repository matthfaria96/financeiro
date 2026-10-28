<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { money } from '$lib/core/money';
  import { dayMonth, diffDays, today } from '$lib/core/dates';
  import Icon from '$lib/ui/Icon.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import PersonChip from '$lib/ui/PersonChip.svelte';
  import WorkspaceBar from '$lib/ui/WorkspaceBar.svelte';
  import SectionTitle from '$lib/ui/SectionTitle.svelte';
  import { hint } from '$lib/ui/hint';
  import { kindName } from '$lib/ui/look';
  import SubHeader from '$lib/screens/more/SubHeader.svelte';
  import AccountEditor from '$lib/screens/accounts/AccountEditor.svelte';
  import { balanceOf, inScopeAccount, lastEntryDate } from '$lib/features/model';
  import type { AccountKind } from '$lib/data/types';

  /** Carteira: cada conta como um cartão, agrupadas por tipo, com saldo e se o extrato está em dia. */
  let creating = $state(false);
  const accounts = $derived(store.accounts.filter(inScopeAccount).toSorted((a, b) => Number(a.archived) - Number(b.archived) || a.sort_order - b.sort_order));
  const kinds: { kind: AccountKind; title: string }[] = [
    { kind: 'checking', title: 'Contas correntes' }, { kind: 'creditCard', title: 'Cartões de crédito' }, { kind: 'savings', title: 'Investimentos e caixinhas' }, { kind: 'cash', title: 'Dinheiro' }
  ];
  const groups = $derived(kinds.map((k) => ({ ...k, items: accounts.filter((a) => a.kind === k.kind) })).filter((g) => g.items.length));
  const total = (kind: AccountKind) => accounts.filter((a) => a.kind === kind && !a.archived).reduce((s, a) => s + balanceOf(a), 0);
</script>

<div class="page">
  <SubHeader title="Contas e cartões"><button class="btn primary" onclick={() => (creating = true)} use:hint={['Cadastrar', 'Conta, cartão, investimento ou dinheiro de qualquer banco.']}><Icon name="plus" size={16} />Cadastrar</button></SubHeader>
  <WorkspaceBar />
  {#each groups as group (group.kind)}
    {@const sum = total(group.kind)}
    <SectionTitle title={group.title}><span class="muted num small">{group.kind === 'creditCard' ? `${money(Math.max(0, -sum), { cents: false })} em aberto` : money(sum, { cents: false })}</span></SectionTitle>
    <div class="wallet">
      {#each group.items as account (account.id)}
        {@const balance = balanceOf(account)}
        {@const last = lastEntryDate(account)}
        {@const stale = account.kind !== 'cash' && (!last || diffDays(last, today()) > 40)}
        {@const person = account.default_person_id ? store.personById.get(account.default_person_id) : undefined}
        <a class="card item" class:archived={account.archived} href="#/contas/{account.id}">
          <BankCard {account} width={220} />
          <div class="info">
            <div class="row between"><b class="ellipsis">{account.name}</b>{#if person}<PersonChip {person} />{/if}</div>
            <div class="row between">
              <span class="value num" class:neg={balance < 0 && account.kind !== 'creditCard'}>{account.kind === 'creditCard' ? money(Math.max(0, -balance)) : money(balance)}</span>
              <span class="caption">{kindName[account.kind]}</span>
            </div>
            <span class="caption" class:warn={stale}>{account.archived ? 'Arquivada' : last ? `Extrato até ${dayMonth(last)}${stale ? ' · importar mais recente' : ''}` : 'Nenhum extrato importado'}</span>
          </div>
        </a>
      {/each}
    </div>
  {:else}
    <div class="card stack empty"><Icon name="card" size={34} class="faint" /><b>Nenhuma conta ainda</b><p class="muted small">Cadastre cada conta e cartão (seus, da esposa, da casa) para saber de onde vem cada extrato.</p></div>
  {/each}
  <button class="btn lg block dashed" onclick={() => (creating = true)}><Icon name="plus" size={18} />Cadastrar conta ou cartão</button>
</div>
<AccountEditor bind:open={creating} />

<style>
  .wallet { display: grid; grid-template-columns: repeat(auto-fill, minmax(252px, 1fr)); gap: 14px; }
  .item { display: flex; flex-direction: column; gap: 14px; align-items: center; color: inherit; padding: 16px; }
  .item:hover { transform: translateY(-2px); }
  .item :global(.bank) { transition: transform 0.3s var(--ease); }
  .item:hover :global(.bank) { transform: rotate(-1.2deg) scale(1.02); }
  .archived { opacity: 0.55; }
  .info { width: 100%; display: flex; flex-direction: column; gap: 6px; }
  .value { font: 600 18px var(--font-display); }
  .dashed { border-style: dashed; color: var(--accent); background: var(--accent-soft); }
  .empty { align-items: center; text-align: center; }
  .empty p { margin: 0; }
</style>
