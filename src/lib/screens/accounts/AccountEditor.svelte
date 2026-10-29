<script lang="ts">
  import { untrack } from 'svelte';
  import Select from '$lib/ui/Select.svelte';
  import { store } from '$lib/data/store.svelte';
  import type { Account } from '$lib/data/types';
  import { bankList, bankName, type Bank } from '$lib/core/banks';
  import { centsToInput, parseCents } from '$lib/core/money';
  import { today } from '$lib/core/dates';
  import Sheet from '$lib/ui/Sheet.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import Segmented from '$lib/ui/Segmented.svelte';
  import Toggle from '$lib/ui/Toggle.svelte';
  import { hint } from '$lib/ui/hint';
  import { balanceOf } from '$lib/features/model';
  import { newAccount } from '$lib/features/imports.svelte';
  import { reconcileMirrors } from '$lib/features/mirrors';

  /**
   * Cadastro em três tipos simples:
   * - Banco: a conta e o cartão do mesmo banco, juntos (o cartão é opcional);
   * - Investimento: aportes e resgates não são gasto nem entrada; no fim do mês você diz quanto vale e a diferença é rendimento (ou perda);
   * - Dinheiro: saque não é gasto; no fim do mês você diz quanto tem na carteira e a diferença vira "gastos em dinheiro".
   * Editando, mexe só na conta aberta.
   */
  type Group = 'bank' | 'savings' | 'cash';
  let { open = $bindable(), account = null, onsaved }: { open: boolean; account?: Account | null; onsaved?: (account: Account) => void } = $props();

  let group = $state<Group>('bank');
  let bank = $state<Bank>('nubank');
  let name = $state('');
  let nameEdited = $state(false);
  let digits = $state('');
  let withCard = $state(true);
  let cardDigits = $state('');
  let closing = $state(2);
  let due = $state(10);
  let person = $state('');
  let balanceText = $state('');
  let initialBalance = '';
  let archived = $state(false);
  let confirmDelete = $state(false);

  // Só reinicia ao abrir (ou ao trocar a conta aberta). Sem `untrack`, cada clique relia o formulário e voltava ao padrão.
  $effect(() => {
    if (!open) return;
    const current = account;
    untrack(() => {
      confirmDelete = false;
      if (current) {
        group = current.kind === 'savings' ? 'savings' : current.kind === 'cash' ? 'cash' : 'bank';
        bank = current.bank; name = current.name; nameEdited = true; digits = current.last_digits; withCard = false;
        closing = current.closing_day; due = current.due_day; person = current.default_person_id ?? ''; archived = current.archived;
        const b = balanceOf(current);
        balanceText = current.anchor_balance_cents === null ? '' : centsToInput(current.kind === 'creditCard' ? -b : b);
      } else {
        group = 'bank'; bank = 'nubank'; nameEdited = false; digits = ''; cardDigits = ''; withCard = true; closing = 2; due = 10; archived = false; balanceText = '';
        person = store.people.find((p) => p.role === 'me')?.id ?? '';
        name = defaultName('bank', 'nubank');
      }
      initialBalance = balanceText;
    });
  });

  function defaultName(g: Group, b: Bank): string {
    if (g === 'cash') return 'Dinheiro';
    if (g === 'savings') return b === 'other' ? 'Investimentos' : `${bankName[b]} investimentos`;
    return b === 'other' ? 'Meu banco' : bankName[b];
  }

  function choose(b: Bank) {
    bank = b;
    if (!nameEdited) name = defaultName(group, b);
  }

  $effect(() => {
    const g = group;
    untrack(() => {
      if (!account && !nameEdited) name = defaultName(g, bank);
    });
  });

  const isCardAccount = $derived(account?.kind === 'creditCard');

  async function save() {
    const owner = person || null;
    const typed = balanceText !== initialBalance && balanceText.trim() ? parseCents(balanceText) : null;
    const anchor = (cents: number, current: Account | null) => ({ prev_anchor_balance_cents: current?.anchor_balance_cents ?? null, prev_anchor_date: current?.anchor_date ?? null, anchor_balance_cents: cents, anchor_date: today(), anchor_batch_id: null });
    let saved: Account;
    if (account) {
      const fields: Partial<Account> = { name: name.trim(), bank, last_digits: digits.replace(/\D/g, '').slice(-4), default_person_id: owner, closing_day: closing, due_day: due, archived };
      if (typed !== null) Object.assign(fields, anchor(isCardAccount ? -Math.abs(typed) : typed, account));
      await store.update('accounts', account.id, fields);
      saved = store.accountById.get(account.id)!;
    } else {
      const base = { bank: group === 'cash' ? ('other' as Bank) : bank, default_person_id: owner, workspace_id: null };
      const kind = group === 'cash' ? 'cash' : group === 'savings' ? 'savings' : 'checking';
      const main: Partial<Account> = { ...base, kind, name: name.trim(), last_digits: digits.replace(/\D/g, '').slice(-4), sort_order: store.accounts.length };
      if (typed !== null) Object.assign(main, anchor(typed, null));
      const rows = [newAccount(main)];
      if (group === 'bank' && withCard) {
        rows.push(newAccount({ ...base, kind: 'creditCard', name: `${name.trim()} cartão`, last_digits: cardDigits.replace(/\D/g, '').slice(-4), closing_day: closing, due_day: due, sort_order: store.accounts.length + 1 }));
      }
      [saved] = await store.insert('accounts', rows);
    }
    await reconcileMirrors();
    open = false;
    store.toast(account ? 'Salvo.' : group === 'bank' && withCard ? 'Conta e cartão cadastrados.' : 'Cadastrado.');
    onsaved?.(saved);
  }

  async function remove() {
    if (!account) return;
    await store.remove('accounts', [account.id]);
    open = false;
    store.toast('Apagado.');
    history.back();
  }

  const preview = $derived({ bank: group === 'cash' ? ('other' as Bank) : bank, kind: account?.kind ?? (group === 'cash' ? 'cash' : group === 'savings' ? 'savings' : 'checking'), color: '', name: name || 'Nova conta', last_digits: digits.replace(/\D/g, '').slice(-4) } as const);
  const cardPreview = $derived({ bank, kind: 'creditCard', color: '', name: '', last_digits: cardDigits.replace(/\D/g, '').slice(-4) } as const);
  const popular: Bank[] = ['nubank', 'inter', 'itau', 'bradesco', 'santander', 'bb', 'caixa', 'c6'];
  let allBanks = $state(false);
  const shownBanks = $derived(allBanks || !popular.includes(bank) ? bankList : bankList.filter((b) => popular.includes(b.id) || b.id === 'other'));
  const typeNote = { bank: 'A conta corrente e o cartão de crédito do mesmo banco, juntos.', savings: 'Aplicar e resgatar não conta como gasto nem entrada. No fim do mês, diga quanto vale: a diferença vira rendimento (ou perda).', cash: 'Sacar não é gasto. No fim do mês, diga quanto tem na carteira: o que saiu vira "gastos em dinheiro".' } as const;
</script>

<Sheet bind:open title={account ? 'Editar' : 'Cadastrar'}>
  {#snippet actions()}<button class="btn primary" disabled={!name.trim()} onclick={save}>{account ? 'Salvar' : 'Cadastrar'}</button>{/snippet}
  <div class="preview">
    <BankCard account={preview} width={190} />
    {#if !account && group === 'bank' && withCard}<span class="second"><BankCard account={cardPreview} width={150} /></span>{/if}
  </div>

  {#if !account}
    <Segmented label="Tipo" bind:value={group} options={[{ value: 'bank', label: 'Banco' }, { value: 'savings', label: 'Investimento' }, { value: 'cash', label: 'Dinheiro' }]} />
    <p class="form-footer">{typeNote[group]}</p>
  {:else}
    <p class="form-footer center">{account.kind === 'creditCard' ? 'Cartão de crédito' : account.kind === 'checking' ? 'Conta corrente' : account.kind === 'savings' ? 'Investimento' : 'Dinheiro'}</p>
  {/if}

  {#if group !== 'cash'}
    <div class="form-title">{group === 'savings' ? 'Onde está' : 'Banco'}</div>
    <div class="banks">
      {#each shownBanks as b (b.id)}
        <button type="button" class="bank" class:on={bank === b.id} aria-pressed={bank === b.id} onclick={() => choose(b.id)}>
          <span class="swatch" style:background="linear-gradient(135deg, {b.colors[0]}, {b.colors[1]})"></span><span class="ellipsis">{b.name}</span>
        </button>
      {/each}
    </div>
    {#if popular.includes(bank)}
      <button type="button" class="btn ghost more" onclick={() => (allBanks = !allBanks)}>{allBanks ? 'Mostrar menos' : `Mais bancos (${bankList.length - popular.length - 1})`}</button>
    {/if}
  {/if}

  <div class="form-group" style="margin-top: 12px">
    <label class="form-row"><span class="field-label">Nome</span><input class="field" bind:value={name} oninput={() => (nameEdited = true)} /></label>
    {#if group !== 'cash'}<label class="form-row"><span class="field-label">{isCardAccount ? 'Final do cartão' : 'Final da conta'}</span><input class="field" inputmode="numeric" placeholder="opcional" bind:value={digits} /></label>{/if}
    <label class="form-row" use:hint={['De quem é', 'Tudo que for importado aqui já vem marcado para esta pessoa.']}><span class="field-label">De quem é</span>
      <span class="field"><Select bind:value={person} label="De quem é" options={[{ value: '', label: 'Ninguém' }, ...store.people.map((p) => ({ value: p.id, label: p.name, color: p.color }))]} /></span></label>
  </div>

  {#if (!account && group === 'bank') || isCardAccount}
    <div class="form-title">Cartão de crédito</div>
    <div class="form-group">
      {#if !account}<div class="form-row"><span class="field-label grow">Tenho cartão neste banco</span><Toggle label="Cartão de crédito" bind:checked={withCard} /></div>{/if}
      {#if withCard || isCardAccount}
        {#if !account}<label class="form-row"><span class="field-label">Final do cartão</span><input class="field" inputmode="numeric" placeholder="opcional" bind:value={cardDigits} /></label>{/if}
        <label class="form-row" use:hint={['Fechamento', 'Compras a partir deste dia vão para a fatura seguinte.']}><span class="field-label">Fecha por volta do dia</span><input class="field" type="number" min="1" max="31" bind:value={closing} /></label>
        <label class="form-row"><span class="field-label">Vence no dia</span><input class="field" type="number" min="1" max="31" bind:value={due} /></label>
      {/if}
    </div>
    {#if !account}<p class="form-footer">Cartões virtuais entram na mesma fatura: não precisa cadastrar separado.</p>{/if}
  {/if}

  <div class="form-title">{isCardAccount ? 'Em aberto' : 'Quanto tem hoje'}</div>
  <div class="form-group">
    <label class="form-row"><span class="field-label">{isCardAccount ? 'Em aberto no cartão' : group === 'cash' ? 'Na carteira hoje' : group === 'savings' ? 'Valor hoje' : 'Saldo hoje (com a caixinha)'}</span>
      <input class="field num" inputmode="decimal" placeholder="opcional" bind:value={balanceText} /></label>
  </div>
  <p class="form-footer">Pode deixar em branco. Depois, no Início, use "Fechar o mês" para acertar o valor.</p>

  {#if account}
    <div class="form-group" style="margin-top: 18px">
      <div class="form-row"><span class="field-label grow">Arquivada (some das telas)</span><Toggle label="Arquivada" bind:checked={archived} /></div>
      {#if confirmDelete}
        <div class="form-row"><span class="grow small neg">Apagar e todos os lançamentos? Não dá para desfazer.</span><button class="btn danger" onclick={remove}>Apagar</button></div>
      {:else}
        <button class="form-row btn-row neg" onclick={() => (confirmDelete = true)}>Apagar e os lançamentos</button>
      {/if}
    </div>
  {/if}
</Sheet>

<style>
  .preview { position: relative; display: flex; justify-content: center; align-items: flex-end; padding: 14px 0 10px; min-height: 150px; }
  .second { margin-left: -60px; margin-bottom: -6px; transform: rotate(6deg); filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.4)); }
  .center { text-align: center; }
  .banks { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 8px; }
  .bank { display: flex; align-items: center; gap: 9px; height: 44px; padding: 0 10px; border-radius: 12px; border: 1px solid var(--stroke);
    background: var(--card-2); font-weight: 600; font-size: 14px; text-align: left; transition: background 0.2s, border-color 0.2s; }
  .bank:hover { background: rgba(255, 255, 255, 0.07); }
  .bank.on { border-color: var(--accent); background: var(--accent-soft); }
  .swatch { flex: none; width: 26px; height: 17px; border-radius: 4px; box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.25); }
  .more { margin-top: 6px; }
  .btn-row { background: none; border: 0; width: 100%; text-align: left; }
</style>
