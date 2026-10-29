<script lang="ts">
  import { store } from '$lib/data/store.svelte';
  import { centsToInput, money, parseCents } from '$lib/core/money';
  import { addMonths, lastDay, monthOf, monthTitle, today, type Day } from '$lib/core/dates';
  import Sheet from '$lib/ui/Sheet.svelte';
  import Segmented from '$lib/ui/Segmented.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import { balanceOf, savingsInside } from '$lib/features/model';
  import { blankEntry, reconcileMirrors } from '$lib/features/mirrors';
  import type { Account } from '$lib/data/types';

  /**
   * Fechar o mês: o usuário digita quanto tinha (conta + caixinha). Sem saldo de referência, o valor vira a
   * referência. Com referência, a diferença para o calculado entra como "Rendimento da caixinha" (juros).
   */
  let { open = $bindable() }: { open: boolean } = $props();
  const accounts = $derived(store.accounts.filter((a) => a.kind !== 'creditCard' && !a.archived).toSorted((a, b) => a.sort_order - b.sort_order));
  const saqueId = $derived(store.categoryByKey.get('saque')?.id);
  /** Saques das contas desde o último fechamento: entraram na carteira (não são gasto). */
  const withdrawals = (from: Day, to: Day) => store.entries.filter((e) => e.category_id === saqueId && e.amount_cents < 0 && e.date > from && e.date <= to).reduce((s, e) => s - e.amount_cents, 0);
  /** Quanto o app espera em cada conta no dia escolhido (na carteira: + os saques do período). */
  const expected = (a: Account) => balanceOf(a, day) + (a.kind === 'cash' && a.anchor_date ? withdrawals(a.anchor_date, day) : 0);
  const lastMonth = addMonths(monthOf(today()), -1);
  let when = $state<'month' | 'today'>('month');
  const day = $derived<Day>(when === 'month' ? lastDay(lastMonth) : today());
  let values = $state<Record<string, string>>({});
  $effect(() => {
    if (open) values = Object.fromEntries(accounts.map((a) => [a.id, '']));
  });

  /** Já fechado à mão antes? (saldo digitado, não o que veio de um extrato). Só então a diferença é rendimento. */
  const closedBefore = (a: Account) => a.anchor_balance_cents !== null && a.anchor_batch_id === null;

  const preview = (id: string) => {
    const account = accounts.find((a) => a.id === id)!;
    const typed = values[id]?.trim() ? parseCents(values[id]) : null;
    if (typed === null || !closedBefore(account)) return null;
    return typed - expected(account);
  };

  async function save() {
    const rendimentos = store.categoryByKey.get('rendimentos')?.id ?? null;
    for (const account of accounts) {
      const typed = values[account.id]?.trim() ? parseCents(values[account.id]) : null;
      if (typed === null) continue;
      if (!closedBefore(account)) {
        await store.update('accounts', account.id, { prev_anchor_balance_cents: account.anchor_balance_cents, prev_anchor_date: account.anchor_date, anchor_balance_cents: typed, anchor_date: day, anchor_batch_id: null });
        continue;
      }
      const diff = typed - expected(account);
      if (!diff) continue;
      const cash = account.kind === 'cash';
      // Carteira: o que sumiu é gasto em dinheiro (o que sobrou a mais, entrada). Banco/investimento: rendimento ou perda.
      const title = cash ? (diff < 0 ? 'Gastos em dinheiro' : 'Dinheiro recebido') : account.kind === 'savings' ? (diff < 0 ? 'Perda no investimento' : 'Rendimento do investimento') : 'Rendimento da caixinha';
      const category = cash ? store.categoryByKey.get(diff < 0 ? 'outros' : 'outras-receitas')?.id ?? null : rendimentos;
      const key = `${cash ? 'carteira' : 'juros'}:${account.id}:${monthOf(day)}`;
      const existing = (store.entriesByAccount.get(account.id) ?? []).find((e) => e.import_key === key);
      if (existing) await store.update('entries', existing.id, { amount_cents: existing.amount_cents + diff, title });
      else await store.insert('entries', [{ ...blankEntry(), account_id: account.id, date: day, amount_cents: diff, title, original_title: title,
        import_key: key, category_id: category, person_id: account.default_person_id, user_edited: true }]);
      // Na carteira os saques não viram lançamento: o valor digitado passa a ser a referência.
      if (cash) await store.update('accounts', account.id, { prev_anchor_balance_cents: account.anchor_balance_cents, prev_anchor_date: account.anchor_date, anchor_balance_cents: typed, anchor_date: day, anchor_batch_id: null });
    }
    await reconcileMirrors();
    store.toast('Mês fechado.');
    open = false;
  }
</script>

<Sheet bind:open title="Fechar o mês">
  {#snippet actions()}<button class="btn primary" onclick={save}>Salvar</button>{/snippet}
  <p class="muted small intro">Digite quanto tinha em cada lugar: na conta <b>somando a caixinha</b>, no investimento o valor de hoje, na carteira o dinheiro vivo. Mover dinheiro entre eles nunca é gasto nem entrada. A diferença vira <b>rendimento</b> (ou perda) no banco e no investimento, e <b>gastos em dinheiro</b> na carteira.</p>
  <Segmented label="Quando" bind:value={when} options={[{ value: 'month', label: `Fim de ${monthTitle(lastMonth).split(' ')[0].toLowerCase()}` }, { value: 'today', label: 'Hoje' }]} />
  <div class="form-group" style="margin-top: 12px">
    {#each accounts as account (account.id)}
      {@const diff = preview(account.id)}
      <label class="form-row">
        <BankCard {account} width={40} />
        <span class="grow"><span class="block">{account.name}{savingsInside(account) ? ' + caixinha' : ''}{account.kind === 'cash' ? ' (carteira)' : ''}</span>
          <span class="caption">{!closedBefore(account) ? 'Primeira vez: vira o ponto de partida' : diff === null ? `Esperado: ${money(expected(account))}` : !diff ? 'Igual ao esperado' : account.kind === 'cash' ? (diff < 0 ? `Gastos em dinheiro: ${money(-diff)}` : `Entrou em dinheiro: ${money(diff)}`) : diff < 0 ? `Perda: ${money(-diff)}` : `Rendimento: ${money(diff)}`}</span></span>
        <input class="field num amount" inputmode="decimal" placeholder={!closedBefore(account) ? '0,00' : centsToInput(expected(account))} bind:value={values[account.id]} />
      </label>
    {/each}
  </div>
</Sheet>

<style>
  .intro { margin: 12px 4px; line-height: 1.45; }
  .block { display: block; }
  .amount { max-width: 120px; }
</style>
