<script lang="ts">
  import Select from '$lib/ui/Select.svelte';
  import { store } from '$lib/data/store.svelte';
  import { ui } from '$lib/ui/ui.svelte';
  import { costName } from '$lib/core/catalog';
  import { addMonths, dayHeader, monthOf, parts, clampedDay, shortDate } from '$lib/core/dates';
  import { displayName } from '$lib/core/text';
  import Sheet from '$lib/ui/Sheet.svelte';
  import Avatar from '$lib/ui/Avatar.svelte';
  import Money from '$lib/ui/Money.svelte';
  import Icon from '$lib/ui/Icon.svelte';
  import Toggle from '$lib/ui/Toggle.svelte';
  import CategorySelect from '$lib/ui/CategorySelect.svelte';
  import { hint } from '$lib/ui/hint';
  import { accountOf, billDueOf, categoryCost, categoryOf, fullName, kindOf } from '$lib/features/model';
  import { learn, suggestedPattern } from '$lib/features/rules';
  import { reconcileMirrors } from '$lib/features/mirrors';
  import MerchantPicker from './MerchantPicker.svelte';
  import MoveSheet from './MoveSheet.svelte';
  import MerchantEditor from '../merchants/MerchantEditor.svelte';
  import type { Entry } from '$lib/data/types';

  /** Editar um lançamento: quem é (avatar), categoria, de quem é, fixo/variável, fatura e comentário. */
  let open = $state(false);
  let draft = $state<Entry | null>(null);
  let original = $state<Entry | null>(null);
  let remember = $state(true);
  let pattern = $state('');
  let picking = $state(false);
  let moving = $state(false);
  let editingMerchant = $state(false);
  let confirmDelete = $state(false);

  $effect(() => {
    const id = ui.editingEntryId;
    if (!id) return;
    const entry = store.entries.find((e) => e.id === id);
    ui.editingEntryId = null;
    if (!entry) return;
    original = entry;
    draft = { ...entry };
    pattern = suggestedPattern(entry);
    remember = true;
    confirmDelete = false;
    open = true;
  });

  const changed = $derived(!!draft && !!original && (draft.category_id !== original.category_id || draft.person_id !== original.person_id || draft.title !== original.title || draft.merchant_id !== original.merchant_id));
  const category = $derived(draft ? categoryOf(draft) ?? null : null);
  const merchant = $derived(draft?.merchant_id ? store.merchantById.get(draft.merchant_id) ?? null : null);
  const account = $derived(draft ? accountOf(draft) : undefined);
  const autoCost = $derived(draft ? merchant?.cost_type || categoryCost(category ?? undefined) : 'variable');
  const due = $derived(draft ? billDueOf(draft) : null);

  async function save() {
    if (!draft || !original) return;
    const patch: Partial<Entry> = {
      title: draft.title, notes: draft.notes, category_id: draft.category_id, person_id: draft.person_id, merchant_id: draft.merchant_id,
      cost_type: draft.cost_type, bill_due_date: draft.bill_due_date, user_edited: original.user_edited || changed
    };
    await store.update('entries', draft.id, patch);
    if (changed && remember) {
      const count = await learn(store.entries.find((e) => e.id === draft!.id)!, pattern);
      if (count) store.toast(`Lembrei: ${count} lançamentos parecidos atualizados.`);
    }
    await reconcileMirrors();
    open = false;
  }

  async function remove() {
    if (!draft) return;
    await store.remove('entries', [draft.id]);
    await reconcileMirrors();
    open = false;
    store.toast('Lançamento apagado.');
  }

  function dueOptions(current: string) {
    const day = parts(current).day;
    return [-1, 0, 1].map((delta) => clampedDay(addMonths(monthOf(current), delta), day));
  }
</script>

<Sheet bind:open title={draft?.is_mirror ? 'Investimento' : 'Lançamento'}>
  {#snippet actions()}{#if draft && !draft.is_mirror}<button class="btn primary" onclick={save}>OK</button>{/if}{/snippet}
  {#if draft}
    <div class="head row">
      <button class="avatar-btn" onclick={() => !draft!.is_mirror && (picking = true)} use:hint={['Avatar', 'Toque para dizer quem é (iFood, mercado…) e usar o logo dele.']}><Avatar {merchant} {category} name={draft.title} size={60} /></button>
      <div class="grow stack-sm" style="gap: 2px">
        <Money cents={draft.amount_cents} class="value-lg" />
        <span class="caption">{dayHeader(draft.date)} · {account?.name ?? ''}</span>
        {#if category}<span class="small" style:color={category.color}>{fullName(category)}</span>{/if}
      </div>
    </div>

    {#if draft.is_mirror}
      <div class="card stack-sm small">
        <b class="row" style="gap: 8px"><Icon name="refresh" size={16} />Cópia automática da {draft.amount_cents > 0 ? 'aplicação' : 'retirada'} feita em {store.accountById.get(account?.investment_source_id ?? '')?.name ?? 'outra conta'}.</b>
        <span class="muted">Para mudar ou apagar, abra o lançamento original na conta corrente. Para corrigir o rendimento, informe o saldo de hoje na conta do investimento.</span>
      </div>
    {:else}
      <div class="form-title">Quem é</div>
      <div class="form-group">
        {#if merchant}
          <div class="form-row"><Avatar {merchant} {category} size={34} /><span class="grow">{merchant.name}</span>
            <button class="btn" onclick={() => (picking = true)}>Trocar</button><button class="btn" onclick={() => (editingMerchant = true)}>Editar</button></div>
        {:else}
          <button class="form-row plain accent" onclick={() => (picking = true)}><Icon name="store" size={18} />Escolher ou criar estabelecimento</button>
        {/if}
      </div>

      <div class="form-title">Classificação</div>
      <div class="form-group">
        <label class="form-row" use:hint={['Categoria', 'Categoria e subcategoria (ex.: Carro › Combustível). Transferências entre contas não entram nos gastos.']}><span class="field-label">Categoria</span>
          <span class="field"><CategorySelect value={draft.category_id} pill={false} onchange={(v) => (draft!.category_id = v || null)} /></span></label>
        <label class="form-row" use:hint={['De quem', 'Separa o que é seu, da esposa, da casa ou do filho nos relatórios.']}><span class="field-label">De quem</span>
          <span class="field"><Select bind:value={draft.person_id} label="De quem" options={[{ value: null, label: 'Ninguém' }, ...store.people.map((p) => ({ value: p.id, label: p.name, color: p.color }))]} /></span></label>
        {#if kindOf(draft) === 'expense'}
          <label class="form-row" use:hint={['Fixo ou variável', 'Fixo: se repete todo mês (aluguel, escola, assinatura). Automático usa o padrão do estabelecimento ou da categoria.']}><span class="field-label">Tipo de gasto</span>
            <span class="field"><Select bind:value={draft.cost_type} label="Fixo ou variável" options={[{ value: '', label: `Automático (${costName[autoCost].toLowerCase()})` }, { value: 'fixed', label: 'Fixo' }, { value: 'variable', label: 'Variável' }]} /></span></label>
        {/if}
      </div>

      {#if changed}
        <div class="form-group" style="margin-top: 12px">
          <div class="form-row" use:hint={['Lembrar', 'Lançamentos com este texto recebem o mesmo estabelecimento, categoria e dono, inclusive os já importados.']}><span class="field-label grow">Lembrar para os próximos</span><Toggle label="Lembrar" bind:checked={remember} /></div>
          {#if remember}<label class="form-row"><span class="field-label">Quando a descrição tiver</span><input class="field" bind:value={pattern} /></label>{/if}
        </div>
        <p class="form-footer">Lançamentos que você corrigiu à mão nunca mudam sozinhos.</p>
      {/if}

      {#if due}
        <div class="form-title">Cartão</div>
        <div class="form-group">
          <label class="form-row" use:hint={['Fatura', 'Mês em que esta compra é paga. Mude se o fechamento foi diferente neste mês.']}><span class="field-label">Fatura</span>
            <span class="field"><Select value={due} label="Fatura" options={dueOptions(due).map((option) => ({ value: option, label: `Vence ${shortDate(option)}` }))} onchange={(v) => (draft!.bill_due_date = v)} /></span></label>
        </div>
        <p class="form-footer">A compra entra no informativo do mês em que foi feita e no "a pagar" do mês da fatura.</p>
      {/if}

      <div class="form-title">Detalhes</div>
      <div class="form-group">
        <label class="form-row"><span class="field-label">Nome</span><input class="field" bind:value={draft.title} /></label>
        <label class="form-row" style="align-items: flex-start"><span class="field-label">Comentário</span><textarea class="field" rows="2" bind:value={draft.notes} placeholder="opcional"></textarea></label>
        <div class="form-row"><span class="field-label">Descrição do banco</span><span class="field caption">{draft.original_title}</span></div>
        {#if draft.installment_total > 1}<div class="form-row"><span class="field-label">Parcela</span><span class="field">{draft.installment_current}/{draft.installment_total}</span></div>{/if}
      </div>

      <div class="form-group" style="margin-top: 18px">
        <button class="form-row plain" onclick={() => (moving = true)}><Icon name="move" size={17} />Mover para outra conta…</button>
        {#if confirmDelete}
          <div class="form-row"><span class="grow small neg">Apagar este lançamento?</span><button class="btn danger" onclick={remove}>Apagar</button></div>
        {:else}
          <button class="form-row plain neg" onclick={() => (confirmDelete = true)}><Icon name="trash" size={17} />Apagar lançamento</button>
        {/if}
      </div>
    {/if}
  {/if}
</Sheet>

{#if draft}
  <MerchantPicker bind:open={picking} suggestedName={draft.title} suggestedPattern={displayName(draft.original_title)} onpick={(m) => {
    draft!.merchant_id = m?.id ?? null;
    if (m?.category_id) draft!.category_id = m.category_id;
    if (m?.person_id) draft!.person_id = m.person_id;
  }} />
  <MoveSheet bind:open={moving} ids={[draft.id]} ondone={() => (open = false)} />
  {#if merchant}<MerchantEditor bind:open={editingMerchant} {merchant} />{/if}
{/if}

<style>
  .head { gap: 14px; padding: 10px 2px 4px; }
  .avatar-btn { border: 0; background: none; padding: 0; border-radius: 50%; }
  .plain { background: none; border: 0; width: 100%; text-align: left; }
  .accent { color: var(--accent); }
</style>
