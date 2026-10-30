<script lang="ts">
  import { untrack } from 'svelte';
  import Select from '$lib/ui/Select.svelte';
  import { store } from '$lib/data/store.svelte';
  import { ui } from '$lib/ui/ui.svelte';
  import { parseCents } from '$lib/core/money';
  import { today } from '$lib/core/dates';
  import { UNCATEGORIZED } from '$lib/core/catalog';
  import Sheet from '$lib/ui/Sheet.svelte';
  import Segmented from '$lib/ui/Segmented.svelte';
  import CategoryPicker from '$lib/ui/CategoryPicker.svelte';
  import { seriesColor } from '$lib/ui/charts/scale';
  import { inScopeAccount } from '$lib/features/model';
  import { blankEntry, reconcileMirrors } from '$lib/features/mirrors';
  import { THIRD_CATEGORY, transferPlan } from '$lib/features/transfer';

  /** Lançamento manual (dinheiro, algo que não veio no extrato). Terceira aba: transferir entre contas suas
   *  (saque, guardar na caixinha, pagar a fatura): a categoria sai sozinha do tipo das contas. */
  let type = $state<'out' | 'in' | 'move'>('out');
  // "Para" começa em Terceiros (Pix para outra pessoa: é gasto); abaixo, as suas contas (só move o dinheiro).
  const THIRD = 'terceiros';
  let toId = $state(THIRD);
  let title = $state('');
  let amount = $state('');
  let date = $state(today());
  let accountId = $state('');
  let categoryId = $state<string | null>(null);
  let personId = $state<string | null>(null);

  const accounts = $derived(store.accounts.filter((a) => !a.archived && inScopeAccount(a)));
  $effect(() => {
    if (ui.newEntryOpen) {
      title = ''; amount = ''; date = today(); categoryId = null; personId = null;
      accountId = accounts.find((a) => a.kind === 'cash')?.id ?? accounts[0]?.id ?? '';
      toId = THIRD;
    }
  });
  // Trocou entre saída e entrada: a categoria do outro lado não serve mais.
  $effect(() => {
    if (type === 'move') return;
    const kind = type === 'out' ? 'expense' : 'income';
    const chosen = untrack(() => (categoryId ? store.categoryById.get(categoryId) : null));
    if (chosen && chosen.kind !== 'transfer' && chosen.kind !== kind) categoryId = null;
  });
  // Transferir: começa de uma conta (não do dinheiro) e vai para outra.
  $effect(() => {
    if (type !== 'move') return;
    untrack(() => {
      if (store.accountById.get(accountId)?.kind === 'cash' || store.accountById.get(accountId)?.kind === 'creditCard') accountId = accounts.find((a) => a.kind === 'checking')?.id ?? accountId;
      if (!toId || toId === accountId) toId = THIRD;
    });
  });
  const fromAccount = $derived(store.accountById.get(accountId));
  const toAccount = $derived(store.accountById.get(toId));
  const third = $derived(toId === THIRD);
  const plan = $derived(third ? null : fromAccount && toAccount && fromAccount.id !== toAccount.id ? transferPlan(fromAccount, toAccount) : null);
  const planLabel = $derived(plan ? store.categoryByKey.get(plan.category)?.name ?? '' : '');
  const moveValid = $derived(!!fromAccount && (third || !!plan) && (parseCents(amount) ?? 0) !== 0 && /^\d{4}-\d{2}-\d{2}$/.test(date));
  const cents = $derived(Math.abs(parseCents(amount) ?? 0) * (type === 'in' ? 1 : -1));
  // Sem data válida o lançamento ficava invisível (contava nos totais, mas não dava para abrir nem apagar).
  const valid = $derived(title.trim() && cents !== 0 && accountId && /^\d{4}-\d{2}-\d{2}$/.test(date));

  async function saveMove() {
    if (!moveValid || !fromAccount) return;
    const value = Math.abs(parseCents(amount) ?? 0);
    if (third) {
      const label = title.trim() || 'Transferência para terceiros';
      await store.insert('entries', [{
        ...blankEntry(), account_id: fromAccount.id, date, amount_cents: -value, title: label, original_title: label, import_key: `manual:${crypto.randomUUID()}`,
        category_id: store.categoryByKey.get(THIRD_CATEGORY)?.id ?? null, person_id: fromAccount.default_person_id, user_edited: true
      }]);
      ui.newEntryOpen = false;
      store.toast('Transferência registrada.');
      return;
    }
    if (!plan || !toAccount) return;
    const label = title.trim() || (planLabel === 'Transferência interna' ? `Transferência para ${toAccount.name}` : planLabel);
    const category = store.categoryByKey.get(plan.category)?.id ?? null;
    const base = { ...blankEntry(), date, title: label, original_title: label, category_id: category, user_edited: true };
    await store.insert('entries', [
      ...(plan.from ? [{ ...base, account_id: fromAccount.id, amount_cents: -value, import_key: `manual:${crypto.randomUUID()}`, person_id: fromAccount.default_person_id }] : []),
      ...(plan.to ? [{ ...base, account_id: toAccount.id, amount_cents: value, import_key: `manual:${crypto.randomUUID()}`, person_id: toAccount.default_person_id }] : [])
    ]);
    await reconcileMirrors();
    ui.newEntryOpen = false;
    store.toast('Transferência registrada.');
  }

  async function save() {
    if (type === 'move') return saveMove();
    const account = store.accountById.get(accountId);
    if (!valid || !account) return;
    const fallback = store.categoryByKey.get(type === 'out' ? UNCATEGORIZED : 'outras-receitas')?.id ?? null;
    await store.insert('entries', [{
      ...blankEntry(), account_id: accountId, date, amount_cents: cents, title: title.trim(), original_title: title.trim(),
      import_key: `manual:${crypto.randomUUID()}`, category_id: categoryId ?? fallback, person_id: personId ?? account.default_person_id, user_edited: true
    }]);
    await reconcileMirrors();
    ui.newEntryOpen = false;
    store.toast('Lançamento adicionado.');
  }
</script>

<Sheet bind:open={ui.newEntryOpen} title={type === 'move' ? 'Transferir' : 'Novo lançamento'}>
  {#snippet actions()}<button class="btn primary" disabled={type === 'move' ? !moveValid : !valid} onclick={save}>{type === 'move' ? 'Transferir' : 'Adicionar'}</button>{/snippet}
  <div style="padding-top: 10px"><Segmented label="Tipo" bind:value={type} options={[{ value: 'out', label: 'Saída', icon: 'trending-down', color: seriesColor.expense }, { value: 'in', label: 'Entrada', icon: 'trending-up', color: seriesColor.income }, { value: 'move', label: 'Transferir', icon: 'arrow.left.arrow.right', color: seriesColor.account }]} /></div>
  {#if type === 'move'}
    <div class="form-group" style="margin-top: 12px">
      <label class="form-row"><span class="field-label">Valor</span><input class="field num" inputmode="decimal" placeholder="200,00" bind:value={amount} /></label>
      <label class="form-row"><span class="field-label">De</span><span class="field"><Select bind:value={accountId} label="De" options={accounts.filter((a) => a.kind !== 'creditCard').map((a) => ({ value: a.id, label: a.name }))} /></span></label>
      <label class="form-row"><span class="field-label">Para</span><span class="field"><Select bind:value={toId} label="Para" options={[{ value: THIRD, label: 'Terceiros', hint: 'outra pessoa ou empresa' }, ...accounts.filter((a) => a.id !== accountId).map((a) => ({ value: a.id, label: a.name, group: 'Suas contas' }))]} /></span></label>
      <label class="form-row"><span class="field-label">Data</span><input class="field" type="date" bind:value={date} /></label>
      <label class="form-row"><span class="field-label">Descrição</span><input class="field" bind:value={title} placeholder="opcional" /></label>
    </div>
    <p class="form-footer">{third ? 'Para outra pessoa: conta como gasto.' : plan ? `${fromAccount?.name} → ${toAccount?.name}, mesmo valor. Não é gasto.` : 'Escolha duas contas diferentes.'}</p>
  {:else}
    <div class="form-group" style="margin-top: 12px">
      <label class="form-row"><span class="field-label">Descrição</span><input class="field" bind:value={title} placeholder="ex.: Feira" /></label>
      <label class="form-row"><span class="field-label">Valor</span><input class="field num" inputmode="decimal" placeholder="49,90" bind:value={amount} /></label>
      <label class="form-row"><span class="field-label">Data</span><input class="field" type="date" bind:value={date} /></label>
      <label class="form-row"><span class="field-label">Conta</span><span class="field"><Select bind:value={accountId} label="Conta" options={accounts.map((a) => ({ value: a.id, label: a.name }))} /></span></label>
      <label class="form-row"><span class="field-label">De quem</span><span class="field"><Select bind:value={personId} label="De quem" options={[{ value: null, label: 'Padrão da conta' }, ...store.people.map((p) => ({ value: p.id, label: p.name, color: p.color }))]} /></span></label>
    </div>
    <div style="margin-top: 12px"><CategoryPicker value={categoryId} allowNone kind={type === 'out' ? 'expense' : 'income'} onchange={(v) => (categoryId = v)} /></div>
  {/if}
  {#if !accounts.length}<p class="form-footer">Cadastre uma conta primeiro (Início › Cadastrar).</p>{/if}
</Sheet>
