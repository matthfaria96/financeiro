<script lang="ts">
  import Select from '$lib/ui/Select.svelte';
  import { store } from '$lib/data/store.svelte';
  import type { Account, AccountKind } from '$lib/data/types';
  import { bankList, bankName, type Bank } from '$lib/core/banks';
  import { centsToInput, parseCents } from '$lib/core/money';
  import { today } from '$lib/core/dates';
  import Sheet from '$lib/ui/Sheet.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import Segmented from '$lib/ui/Segmented.svelte';
  import Toggle from '$lib/ui/Toggle.svelte';
  import { hint } from '$lib/ui/hint';
  import { kindShort, roleName } from '$lib/ui/look';
  import { balanceOf } from '$lib/features/model';
  import { newAccount } from '$lib/features/imports.svelte';
  import { reconcileMirrors } from '$lib/features/mirrors';

  /** Cadastro/edição de conta: banco, tipo, de quem é, área, fatura (cartão), investimento e saldo de hoje. */
  let { open = $bindable(), account = null, onsaved }: { open: boolean; account?: Account | null; onsaved?: (account: Account) => void } = $props();

  let name = $state('');
  let nameEdited = $state(false);
  let bank = $state<Bank>('nubank');
  let kind = $state<AccountKind>('checking');
  let digits = $state('');
  let person = $state<string>('');
  let workspace = $state<string>('');
  let closing = $state(2);
  let due = $state(10);
  let source = $state('');
  let balanceText = $state('');
  let initialBalance = '';
  let archived = $state(false);
  let confirmDelete = $state(false);

  $effect(() => {
    if (!open) return;
    confirmDelete = false;
    if (account) {
      name = account.name; nameEdited = true; bank = account.bank; kind = account.kind; digits = account.last_digits;
      person = account.default_person_id ?? ''; workspace = account.workspace_id ?? ''; closing = account.closing_day; due = account.due_day;
      source = account.investment_source_id ?? ''; archived = account.archived;
      const b = balanceOf(account);
      balanceText = centsToInput(account.kind === 'creditCard' ? -b : b);
    } else {
      allBanks = false; nameEdited = false; bank = 'nubank'; kind = 'checking'; digits = ''; workspace = store.scopeId; closing = 2; due = 10; source = ''; archived = false; balanceText = '';
      person = store.people.find((p) => p.role === 'me')?.id ?? '';
      autoName();
    }
    initialBalance = balanceText;
  });

  function autoName() {
    if (nameEdited) return;
    const owner = store.personById.get(person);
    const suffix = owner && owner.role !== 'me' && owner.role !== 'house' ? ` (${owner.name})` : '';
    name = (bank === 'other' ? kindShort[kind] : `${bankName[bank]} ${kindShort[kind].toLowerCase()}`) + suffix;
  }

  async function save() {
    const fields: Partial<Account> = {
      name: name.trim(), bank, kind, last_digits: digits.replace(/\D/g, '').slice(-4), default_person_id: person || null,
      workspace_id: workspace || null, closing_day: closing, due_day: due, investment_source_id: kind === 'savings' ? source || null : null, archived
    };
    // Saldo de hoje: só se mudou; vira o saldo de referência (cartão: em aberto = negativo).
    const typed = balanceText !== initialBalance ? parseCents(balanceText) : null;
    if (typed !== null) {
      const cents = kind === 'creditCard' ? -Math.abs(typed) : typed;
      const current = account ?? null;
      Object.assign(fields, { prev_anchor_balance_cents: current?.anchor_balance_cents ?? null, prev_anchor_date: current?.anchor_date ?? null, anchor_balance_cents: cents, anchor_date: today(), anchor_batch_id: null });
    }
    let saved: Account;
    if (account) {
      await store.update('accounts', account.id, fields);
      saved = store.accountById.get(account.id)!;
    } else {
      [saved] = await store.insert('accounts', [newAccount({ ...fields, sort_order: store.accounts.length })]);
    }
    await reconcileMirrors();
    open = false;
    store.toast(account ? 'Conta salva.' : 'Conta cadastrada.');
    onsaved?.(saved);
  }

  async function remove() {
    if (!account) return;
    await store.remove('accounts', [account.id]);
    open = false;
    store.toast('Conta apagada.');
    history.back();
  }

  const preview = $derived({ bank, kind, color: '', name: name || 'Nova conta', last_digits: digits.replace(/\D/g, '').slice(-4) });
  const popular: Bank[] = ['nubank', 'inter', 'itau', 'bradesco', 'santander', 'bb', 'caixa', 'c6'];
  let allBanks = $state(false);
  const shownBanks = $derived(allBanks || !popular.includes(bank) ? bankList : bankList.filter((b) => popular.includes(b.id) || b.id === 'other'));
</script>

<Sheet bind:open title={account ? 'Editar conta' : 'Cadastrar conta'}>
  {#snippet actions()}<button class="btn primary" disabled={!name.trim()} onclick={save}>{account ? 'Salvar' : 'Cadastrar'}</button>{/snippet}
  <div class="preview"><BankCard account={preview} width={220} /><b>{name || 'Nova conta'}</b></div>

  <div class="form-title">Banco</div>
  <div class="banks">
    {#each shownBanks as b (b.id)}
      <button class="bank" class:on={bank === b.id} aria-pressed={bank === b.id} onclick={() => { bank = b.id; autoName(); }}
        use:hint={[b.name, 'Banco da conta: dá as cores do cartão e ajuda a reconhecer os arquivos importados.']}>
        <span class="swatch" style:background="linear-gradient(135deg, {b.colors[0]}, {b.colors[1]})"></span><span class="ellipsis">{b.name}</span>
      </button>
    {/each}
  </div>
  {#if popular.includes(bank)}
    <button class="btn ghost more" onclick={() => (allBanks = !allBanks)} use:hint={[allBanks ? 'Menos bancos' : 'Mais bancos', 'Mostra todos os bancos e cartões conhecidos.']}>
      {allBanks ? 'Mostrar menos' : `Mais bancos (${bankList.length - popular.length - 1})`}</button>
  {/if}
  <div style="margin-top: 10px"><Segmented label="Tipo" bind:value={kind} options={(['checking', 'creditCard', 'savings', 'cash'] as AccountKind[]).map((k) => ({ value: k, label: kindShort[k] }))} /></div>
  <div class="form-group" style="margin-top: 10px">
    <label class="form-row"><span class="field-label">Nome</span><input class="field" bind:value={name} oninput={() => (nameEdited = true)} /></label>
    <label class="form-row"><span class="field-label">Últimos 4 dígitos</span><input class="field" inputmode="numeric" placeholder="opcional" bind:value={digits} /></label>
  </div>

  <div class="form-title">Organização</div>
  <div class="form-group">
    <label class="form-row" use:hint={['De quem é', 'Tudo que for importado nesta conta já vem marcado para esta pessoa.']}><span class="field-label">De quem é</span>
      <span class="field"><Select bind:value={person} label="De quem é" onchange={autoName} options={[{ value: '', label: 'Ninguém' }, ...store.people.map((p) => ({ value: p.id, label: p.name, color: p.color }))]} /></span></label>
    {#if store.workspacesEnabled}
      <label class="form-row" use:hint={['Área de trabalho', 'A conta, seus lançamentos e relatórios só aparecem nesta área (e em Tudo).']}><span class="field-label">Área de trabalho</span>
        <span class="field"><Select bind:value={workspace} label="Área de trabalho" options={[{ value: '', label: 'Nenhuma' }, ...store.workspaces.map((w) => ({ value: w.id, label: w.name, color: w.color }))]} /></span></label>
    {/if}
  </div>

  {#if kind === 'creditCard'}
    <div class="form-title">Fatura</div>
    <div class="form-group">
      <label class="form-row" use:hint={['Fechamento', 'Compras a partir deste dia vão para a fatura seguinte. Se variar, você ajusta ao importar.']}><span class="field-label">Fecha por volta do dia</span><input class="field" type="number" min="1" max="31" bind:value={closing} /></label>
      <label class="form-row"><span class="field-label">Vence no dia</span><input class="field" type="number" min="1" max="31" bind:value={due} /></label>
    </div>
  {/if}
  {#if kind === 'savings'}
    <div class="form-title">Investimento</div>
    <div class="form-group">
      <label class="form-row" use:hint={['Acompanhar', 'Aplicações e resgates (caixinha, RDB) dessa conta entram e saem deste investimento sozinhos.']}><span class="field-label">Acompanhar aplicações de</span>
        <span class="field"><Select bind:value={source} label="Acompanhar aplicações de" options={[{ value: '', label: 'Nenhuma' }, ...store.accounts.filter((a) => a.kind === 'checking').map((a) => ({ value: a.id, label: a.name }))]} /></span></label>
    </div>
    <p class="form-footer">O rendimento não aparece no extrato: de vez em quando, informe o saldo de hoje abaixo.</p>
  {/if}

  <div class="form-title">Saldo</div>
  <div class="form-group">
    <label class="form-row" use:hint={['Saldo de hoje', kind === 'creditCard' ? 'Quanto está em aberto no cartão agora.' : 'O saldo que aparece no app do banco agora. Importar extratos antigos depois não estraga este valor.']}>
      <span class="field-label">{kind === 'creditCard' ? 'Em aberto hoje' : 'Saldo de hoje no banco'}</span><input class="field num" inputmode="decimal" placeholder="opcional" bind:value={balanceText} /></label>
  </div>
  <p class="form-footer">Pode deixar em branco: o extrato em OFX traz o saldo e acerta sozinho.</p>

  {#if account}
    <div class="form-group" style="margin-top: 18px">
      <div class="form-row"><span class="field-label grow">Arquivada (some da tela inicial)</span><Toggle label="Arquivada" bind:checked={archived} /></div>
      {#if confirmDelete}
        <div class="form-row"><span class="grow small neg">Apagar a conta e os lançamentos dela? Não dá para desfazer.</span><button class="btn danger" onclick={remove}>Apagar</button></div>
      {:else}
        <button class="form-row btn-row neg" onclick={() => (confirmDelete = true)}>Apagar conta e lançamentos</button>
      {/if}
    </div>
  {/if}
</Sheet>

<style>
  .preview { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 14px 0 4px; }
  .banks { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 8px; }
  .bank { display: flex; align-items: center; gap: 9px; height: 44px; padding: 0 10px; border-radius: 12px; border: 1px solid var(--stroke);
    background: var(--card-2); font-weight: 600; font-size: 14px; text-align: left; transition: background 0.2s, border-color 0.2s; }
  .bank:hover { background: rgba(255, 255, 255, 0.07); }
  .bank.on { border-color: var(--accent); background: var(--accent-soft); }
  .swatch { flex: none; width: 26px; height: 17px; border-radius: 4px; box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.25); }
  .more { margin-top: 6px; }
  .btn-row { background: none; border: 0; width: 100%; text-align: left; }
</style>
