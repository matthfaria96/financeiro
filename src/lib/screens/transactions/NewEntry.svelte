<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { ui } from '$lib/ui/ui.svelte';
  import { parseCents } from '$lib/core/money';
  import { today } from '$lib/core/dates';
  import { UNCATEGORIZED } from '$lib/core/catalog';
  import Sheet from '$lib/ui/Sheet.svelte';
  import Segmented from '$lib/ui/Segmented.svelte';
  import CategorySelect from '$lib/ui/CategorySelect.svelte';
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
  const cents = $derived(Math.abs(parseCents(amount) ?? 0) * (type === 'out' ? -1 : 1));
  const valid = $derived(title.trim() && cents !== 0 && accountId);

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
    <label class="form-row"><span class="field-label">Conta</span><select class="field" bind:value={accountId}>{#each accounts as a (a.id)}<option value={a.id}>{a.name}</option>{/each}</select></label>
    <label class="form-row"><span class="field-label">Categoria</span><span class="field"><CategorySelect value={categoryId} pill={false} allowNone kinds={type === 'out' ? ['expense', 'transfer'] : ['income', 'transfer']} onchange={(v) => (categoryId = v || null)} /></span></label>
    <label class="form-row"><span class="field-label">De quem</span><select class="field" bind:value={personId}><option value={null}>Padrão da conta</option>{#each store.people as p (p.id)}<option value={p.id}>{p.name}</option>{/each}</select></label>
  </div>
  {#if !accounts.length}<p class="form-footer">Cadastre uma conta primeiro (Início › Cadastrar).</p>{/if}
</Sheet>
