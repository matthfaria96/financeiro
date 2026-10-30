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
  import { inScopeAccount } from '$lib/features/model';
  import { blankEntry, reconcileMirrors } from '$lib/features/mirrors';

  /** Lançamento manual (dinheiro, algo que não veio no extrato). */
  let type = $state<'out' | 'in'>('out');
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
    }
  });
  // Trocou entre saída e entrada: a categoria do outro lado não serve mais.
  $effect(() => {
    const kind = type === 'out' ? 'expense' : 'income';
    const chosen = untrack(() => (categoryId ? store.categoryById.get(categoryId) : null));
    if (chosen && chosen.kind !== 'transfer' && chosen.kind !== kind) categoryId = null;
  });
  const cents = $derived(Math.abs(parseCents(amount) ?? 0) * (type === 'out' ? -1 : 1));
  // Sem data válida o lançamento ficava invisível (contava nos totais, mas não dava para abrir nem apagar).
  const valid = $derived(title.trim() && cents !== 0 && accountId && /^\d{4}-\d{2}-\d{2}$/.test(date));

  async function save() {
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

<Sheet bind:open={ui.newEntryOpen} title="Novo lançamento">
  {#snippet actions()}<button class="btn primary" disabled={!valid} onclick={save}>Adicionar</button>{/snippet}
  <div style="padding-top: 10px"><Segmented label="Tipo" bind:value={type} options={[{ value: 'out', label: 'Saída' }, { value: 'in', label: 'Entrada' }]} /></div>
  <div class="form-group" style="margin-top: 12px">
    <label class="form-row"><span class="field-label">Descrição</span><input class="field" bind:value={title} placeholder="ex.: Feira" /></label>
    <label class="form-row"><span class="field-label">Valor</span><input class="field num" inputmode="decimal" placeholder="49,90" bind:value={amount} /></label>
    <label class="form-row"><span class="field-label">Data</span><input class="field" type="date" bind:value={date} /></label>
    <label class="form-row"><span class="field-label">Conta</span><span class="field"><Select bind:value={accountId} label="Conta" options={accounts.map((a) => ({ value: a.id, label: a.name }))} /></span></label>
    <label class="form-row"><span class="field-label">De quem</span><span class="field"><Select bind:value={personId} label="De quem" options={[{ value: null, label: 'Padrão da conta' }, ...store.people.map((p) => ({ value: p.id, label: p.name, color: p.color }))]} /></span></label>
  </div>
  <div style="margin-top: 12px"><CategoryPicker value={categoryId} allowNone kind={type === 'out' ? 'expense' : 'income'} onchange={(v) => (categoryId = v)} /></div>
  {#if !accounts.length}<p class="form-footer">Cadastre uma conta primeiro (Início › Cadastrar).</p>{/if}
</Sheet>
