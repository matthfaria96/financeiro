<script lang="ts">
  import Select from '$lib/ui/Select.svelte';
  import { store } from '$lib/data/store.svelte';
  import type { Bill, BillMethod } from '$lib/data/types';
  import { centsToInput, parseCents } from '$lib/core/money';
  import Sheet from '$lib/ui/Sheet.svelte';
  import Segmented from '$lib/ui/Segmented.svelte';
  import CategorySelect from '$lib/ui/CategorySelect.svelte';
  import { hint } from '$lib/ui/hint';
  import DeleteRow from '$lib/screens/organizer/DeleteRow.svelte';
  import { methodName, monthNames } from '$lib/features/bills';

  /** Conta fixa: o que se paga sempre (todo mês ou uma vez por ano), como paga e se o valor muda. */
  let { open = $bindable(), bill = null, yearly = false }: { open: boolean; bill?: Bill | null; yearly?: boolean } = $props();
  let name = $state('');
  let amount = $state('');
  let day = $state(10);
  let frequency = $state<'monthly' | 'yearly'>('monthly');
  let monthOfYear = $state(1);
  let method = $state<BillMethod>('account');
  let variable = $state(false);
  let pattern = $state('');
  let categoryId = $state<string | null>(null);
  let personId = $state<string | null>(null);
  let accountId = $state<string | null>(null);

  $effect(() => {
    if (!open) return;
    name = bill?.name ?? ''; amount = bill ? centsToInput(bill.amount_cents) : ''; day = bill?.day_of_month ?? 10;
    frequency = bill?.frequency ?? (yearly ? 'yearly' : 'monthly'); monthOfYear = bill?.month_of_year ?? new Date().getMonth() + 1;
    method = bill?.method ?? 'account'; variable = bill?.variable ?? false; pattern = bill?.match_pattern ?? '';
    categoryId = bill?.category_id ?? null; personId = bill?.person_id ?? null; accountId = bill?.account_id ?? null;
  });

  const accounts = $derived(store.accounts.filter((a) => !a.archived && (method === 'card' ? a.kind === 'creditCard' : method === 'cash' ? a.kind === 'cash' : a.kind === 'checking')));

  async function save() {
    const fields: Partial<Bill> = {
      name: name.trim(), amount_cents: Math.abs(parseCents(amount) ?? 0), day_of_month: day, match_pattern: pattern.trim(), active: true,
      category_id: categoryId, person_id: personId, account_id: accounts.some((a) => a.id === accountId) ? accountId : null,
      workspace_id: bill?.workspace_id ?? (store.scopeId || null), method, variable, frequency, month_of_year: frequency === 'yearly' ? monthOfYear : null
    };
    if (bill) await store.update('bills', bill.id, fields);
    else await store.insert('bills', [fields]);
    open = false;
  }
</script>

<Sheet bind:open title={bill ? 'Conta fixa' : 'Nova conta fixa'}>
  {#snippet actions()}<button class="btn primary" disabled={!name.trim()} onclick={save}>Salvar</button>{/snippet}
  <div style="margin-top: 8px"><Segmented label="Frequência" bind:value={frequency} options={[{ value: 'monthly', label: 'Todo mês' }, { value: 'yearly', label: 'Uma vez por ano' }]} /></div>
  <div class="form-group" style="margin-top: 10px">
    <label class="form-row"><span class="field-label">Nome</span><input class="field" placeholder={frequency === 'yearly' ? 'ex.: IPVA, IPTU' : 'ex.: Aluguel, Luz, Netflix'} bind:value={name} /></label>
    <label class="form-row"><span class="field-label">{variable ? 'Valor médio' : 'Valor'}</span><input class="field num" inputmode="decimal" placeholder="0,00" bind:value={amount} /></label>
    {#if frequency === 'yearly'}
      <label class="form-row"><span class="field-label">Mês</span><span class="field"><Select bind:value={monthOfYear} label="Mês" options={monthNames.map((label, index) => ({ value: index + 1, label }))} /></span></label>
    {/if}
    <label class="form-row" use:hint={['Vencimento', 'Dia do mês. Dia 31 vira o último dia em meses mais curtos.']}><span class="field-label">Vence no dia</span><input class="field" type="number" min="1" max="31" bind:value={day} /></label>
  </div>

  <div class="form-title">Valor</div>
  <Segmented label="Valor" bind:value={variable} options={[{ value: false, label: 'Fixo (sempre igual)' }, { value: true, label: 'Variável (luz, água…)' }]} />

  <div class="form-title">Como paga</div>
  <div class="methods">
    {#each Object.entries(methodName) as [value, label] (value)}
      <button class="method" class:on={method === value} onclick={() => (method = value as BillMethod)}>{label}</button>
    {/each}
  </div>
  {#if method === 'card'}<p class="form-footer">No cartão a conta já entra na fatura: não é somada de novo na previsão.</p>{/if}

  <div class="form-group" style="margin-top: 12px">
    {#if accounts.length}
      <label class="form-row"><span class="field-label">{method === 'card' ? 'Qual cartão' : method === 'cash' ? 'De onde' : 'Qual conta'}</span>
        <span class="field"><Select bind:value={accountId} label="Conta" options={[{ value: null, label: 'Não informar' }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]} /></span></label>
    {/if}
    <label class="form-row"><span class="field-label">Categoria</span><span class="field"><CategorySelect value={categoryId} pill={false} allowNone kinds={['expense']} onchange={(v) => (categoryId = v || null)} /></span></label>
    <label class="form-row"><span class="field-label">De quem</span><span class="field"><Select bind:value={personId} label="De quem" options={[{ value: null, label: 'Ninguém' }, ...store.people.map((p) => ({ value: p.id, label: p.name, color: p.color }))]} /></span></label>
    <label class="form-row" use:hint={['Texto no extrato', 'Trecho da descrição do banco que mostra que foi paga. Vazio: usa o nome.']}><span class="field-label">Texto no extrato</span><input class="field" placeholder="opcional" bind:value={pattern} /></label>
  </div>
  <p class="form-footer">Quando aparecer no extrato um lançamento com esse texto, a conta fica como paga sozinha.</p>
  {#if bill}<DeleteRow label="Apagar conta fixa" question="Apagar esta conta fixa?" ondelete={async () => { await store.remove('bills', [bill!.id]); open = false; }} />{/if}
</Sheet>

<style>
  .methods { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .method { min-height: 44px; padding: 6px; border-radius: 12px; border: 1px solid var(--stroke); background: var(--card-2); font-size: 13.5px; font-weight: 600; color: var(--text-2); }
  .method.on { color: #04140e; background: var(--accent); border-color: transparent; }
</style>
