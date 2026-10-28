<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import type { Bill } from '$lib/data/types';
  import { centsToInput, parseCents } from '$lib/core/money';
  import Sheet from '$lib/ui/Sheet.svelte';
  import CategorySelect from '$lib/ui/CategorySelect.svelte';
  import { hint } from '$lib/ui/hint';

  let { open = $bindable(), bill = null }: { open: boolean; bill?: Bill | null } = $props();
  let name = $state('');
  let amount = $state('');
  let day = $state(10);
  let pattern = $state('');
  let categoryId = $state<string | null>(null);
  let personId = $state<string | null>(null);
  let accountId = $state<string | null>(null);
  let workspaceId = $state<string | null>(null);
  let confirmDelete = $state(false);

  $effect(() => {
    if (!open) return;
    confirmDelete = false;
    if (bill) {
      name = bill.name; amount = centsToInput(bill.amount_cents); day = bill.day_of_month; pattern = bill.match_pattern;
      categoryId = bill.category_id; personId = bill.person_id; accountId = bill.account_id; workspaceId = bill.workspace_id;
    } else {
      name = ''; amount = ''; day = 10; pattern = ''; categoryId = null; personId = null; accountId = null; workspaceId = store.scopeId || null;
    }
  });

  async function save() {
    const fields: Partial<Bill> = { name: name.trim(), amount_cents: Math.abs(parseCents(amount) ?? 0), day_of_month: day, match_pattern: pattern.trim(), active: true, category_id: categoryId, person_id: personId, account_id: accountId, workspace_id: workspaceId };
    if (bill) await store.update('bills', bill.id, fields);
    else await store.insert('bills', [fields]);
    open = false;
  }
</script>

<Sheet bind:open title={bill ? 'Conta fixa' : 'Nova conta fixa'}>
  {#snippet actions()}<button class="btn primary" disabled={!name.trim()} onclick={save}>Salvar</button>{/snippet}
  <div class="form-group" style="margin-top: 10px">
    <label class="form-row"><span class="field-label">Nome</span><input class="field" placeholder="ex.: Aluguel, Netflix" bind:value={name} /></label>
    <label class="form-row"><span class="field-label">Valor</span><input class="field num" inputmode="decimal" placeholder="55,90" bind:value={amount} /></label>
    <label class="form-row" use:hint={['Vencimento', 'Dia do mês. Dia 31 vira o último dia em meses mais curtos.']}><span class="field-label">Vence todo dia</span><input class="field" type="number" min="1" max="31" bind:value={day} /></label>
  </div>
  <div class="form-group" style="margin-top: 12px">
    <label class="form-row" use:hint={['Texto no extrato', 'Trecho da descrição do banco que mostra que foi paga. Vazio: usa o nome.']}><span class="field-label">Texto no extrato</span><input class="field" placeholder="opcional" bind:value={pattern} /></label>
  </div>
  <p class="form-footer">Quando aparecer um lançamento com esse texto no mês, a conta fica como Paga sozinha.</p>
  <div class="form-group" style="margin-top: 12px">
    <label class="form-row"><span class="field-label">Categoria</span><span class="field"><CategorySelect value={categoryId} pill={false} allowNone kinds={['expense']} onchange={(v) => (categoryId = v || null)} /></span></label>
    <label class="form-row"><span class="field-label">De quem</span><select class="field" bind:value={personId}><option value={null}>Ninguém</option>{#each store.people as p (p.id)}<option value={p.id}>{p.name}</option>{/each}</select></label>
    <label class="form-row" use:hint={['Pago com', 'Se for no cartão, já vem na fatura e não conta de novo no "falta pagar".']}><span class="field-label">Pago com</span><select class="field" bind:value={accountId}><option value={null}>Não informado</option>{#each store.accounts.filter((a) => a.kind !== 'savings' && !a.archived) as a (a.id)}<option value={a.id}>{a.name}</option>{/each}</select></label>
    {#if store.workspacesEnabled}
      <label class="form-row"><span class="field-label">Área de trabalho</span><select class="field" bind:value={workspaceId}><option value={null}>Nenhuma</option>{#each store.workspaces as w (w.id)}<option value={w.id}>{w.name}</option>{/each}</select></label>
    {/if}
  </div>
  {#if bill}
    <div class="form-group" style="margin-top: 18px">
      {#if confirmDelete}<div class="form-row"><span class="grow small neg">Apagar esta conta fixa?</span><button class="btn danger" onclick={async () => { await store.remove('bills', [bill!.id]); open = false; }}>Apagar</button></div>
      {:else}<button class="form-row neg" style="background: none; border: 0; width: 100%; text-align: left" onclick={() => (confirmDelete = true)}>Apagar conta fixa</button>{/if}
    </div>
  {/if}
</Sheet>
