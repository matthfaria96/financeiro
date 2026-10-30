<script lang="ts">
  import { untrack } from 'svelte';
  import { store } from '$lib/data/store.svelte';
  import { centsToInput, money, parseCents } from '$lib/core/money';
  import { addMonths, lastDay, monthOf, monthTitle, today, type Day } from '$lib/core/dates';
  import Sheet from '$lib/ui/Sheet.svelte';
  import BankCard from '$lib/ui/BankCard.svelte';
  import { balanceOf, savingsInside } from '$lib/features/model';
  import { blankEntry, reconcileMirrors } from '$lib/features/mirrors';
  import type { Account, BalanceFix } from '$lib/data/types';
  import { dayMonth } from '$lib/core/dates';
  import { balanceFixes, undoLastBalanceFix } from '$lib/features/balanceFix';

  /**
   * Corrigir saldos (lápis do Seu dinheiro), no mesmo padrão do Ajustar o mês: valores, motivo, observação e desfazer.
   * Fechar o mês: o usuário digita quanto tinha (conta + caixinha). Sem saldo de referência, o valor vira a
   * referência. Com referência, a diferença para o calculado entra como "Rendimento da caixinha" (juros).
   */
  let { open = $bindable() }: { open: boolean } = $props();
  const accounts = $derived(store.accounts.filter((a) => a.kind !== 'creditCard' && !a.archived).toSorted((a, b) => a.sort_order - b.sort_order));
  const saqueId = $derived(store.categoryByKey.get('saque')?.id);
  /** Saques das contas desde o último fechamento: entraram na carteira (não são gasto). */
  const withdrawals = (from: Day, to: Day) => store.entries.filter((e) => e.category_id === saqueId && e.amount_cents < 0 && e.date > from && e.date <= to).reduce((s, e) => s - e.amount_cents, 0);
  /** Quanto o app espera em cada conta no dia escolhido (na carteira: + os saques do período). */
  // Calculado uma vez ao abrir (ou ao trocar o dia), não a cada tecla: somar todos os lançamentos por conta pesava.
  const expectedById = $derived(open ? new Map(accounts.map((a) => [a.id, balanceOf(a, day) + (a.kind === 'cash' && a.anchor_date ? withdrawals(a.anchor_date, day) : 0)])) : new Map<string, number>());
  const expected = (a: Account) => expectedById.get(a.id) ?? 0;
  const lastMonth = addMonths(monthOf(today()), -1);
  // Sempre hoje: você digita quanto tem agora em cada lugar (o mais fácil de conferir no app do banco).
  const day = today();
  let values = $state<Record<string, string>>({});
  let reason = $state<BalanceFix['reason']>('banco');
  let note = $state('');
  let confirmUndo = $state(false);
  // Só ao abrir: sem untrack, salvar (que muda as contas) zerava os campos no meio do caminho.
  $effect(() => {
    if (!open) return;
    untrack(() => {
      values = Object.fromEntries(accounts.map((a) => [a.id, '']));
      reason = 'banco'; note = ''; confirmUndo = false;
    });
  });
  const history = $derived(balanceFixes().toReversed());
  const typedAny = $derived(Object.values(values).some((v) => v.trim()));

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
    const changes: BalanceFix['changes'] = [];
    const typedAll = Object.fromEntries(accounts.map((a) => [a.id, values[a.id]?.trim() ? parseCents(values[a.id]) : null]));
    const why = { reason, note: note.trim() };
    for (const account of accounts) {
      const typed = typedAll[account.id];
      if (typed === null) continue;
      const before = { anchor_balance_cents: account.anchor_balance_cents, anchor_date: account.anchor_date, anchor_batch_id: account.anchor_batch_id, prev_anchor_balance_cents: account.prev_anchor_balance_cents, prev_anchor_date: account.prev_anchor_date };
      if (!closedBefore(account)) {
        await store.update('accounts', account.id, { prev_anchor_balance_cents: account.anchor_balance_cents, prev_anchor_date: account.anchor_date, anchor_balance_cents: typed, anchor_date: day, anchor_batch_id: null });
        changes.push({ account_id: account.id, before, anchored: true });
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
      let entryId = existing?.id;
      const notes = why.note || 'Saldo corrigido à mão';
      if (existing) await store.update('entries', existing.id, { amount_cents: existing.amount_cents + diff, title, notes });
      else [{ id: entryId }] = await store.insert('entries', [{ ...blankEntry(), account_id: account.id, date: day, amount_cents: diff, title, original_title: title,
        import_key: key, category_id: category, person_id: account.default_person_id, user_edited: true, notes }]);
      // Na carteira os saques não viram lançamento: o valor digitado passa a ser a referência.
      if (cash) await store.update('accounts', account.id, { prev_anchor_balance_cents: account.anchor_balance_cents, prev_anchor_date: account.anchor_date, anchor_balance_cents: typed, anchor_date: day, anchor_batch_id: null });
      changes.push({ account_id: account.id, before, anchored: cash, entry_id: entryId, entry_created: !existing, entry_delta: diff });
    }
    if (changes.length) {
      const fix: BalanceFix = { id: crypto.randomUUID(), day, created_at: new Date().toISOString(), ...why, changes };
      await store.updateSettings({ balance_fixes: [...balanceFixes(), fix].slice(-20) });
    }
    await reconcileMirrors();
    store.toast(changes.length ? 'Saldos corrigidos.' : 'Nada mudou.');
    open = false;
  }

  async function undo() {
    await undoLastBalanceFix();
    store.toast('Correção desfeita.');
    confirmUndo = false;
  }
  const namesOf = (fix: BalanceFix) => fix.changes.map((c) => store.accountById.get(c.account_id)?.name ?? 'conta apagada').join(', ');
</script>

<Sheet bind:open title="Corrigir saldos">
  {#snippet actions()}<button class="btn primary" disabled={!typedAny} onclick={save}>Salvar</button>{/snippet}
  <p class="muted small intro">Abra o app do banco e digite <b>quanto você tem hoje</b> em cada lugar (na conta, <b>somando a caixinha</b>). Se não bater com o que o app calculou, a diferença entra como lançamento de ajuste — rendimento, perda ou gasto em dinheiro — e o saldo passa a ficar certo daqui para frente. Deixe em branco o que já está certo.</p>
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

  <div class="form-title">O que está acertando (opcional)</div>
  <div class="form-group"><textarea class="field" rows="2" placeholder="ex.: o extrato veio sem o saldo; conferi no app do banco" bind:value={note}></textarea></div>

  {#if history.length}
    <div class="form-title">Correções feitas</div>
    <div class="form-group">
      {#each history.slice(0, 5) as fix, i (fix.id)}
        <div class="form-row fix">
          <span class="grow"><span class="block">{fix.note || 'Saldo corrigido'} · {dayMonth(fix.day)}</span>
            <span class="caption block">{namesOf(fix)}</span></span>
          {#if i === 0}
            {#if confirmUndo}<button class="btn danger" onclick={undo}>Desfazer</button><button class="btn ghost" onclick={() => (confirmUndo = false)}>Não</button>
            {:else}<button class="btn ghost danger" onclick={() => (confirmUndo = true)}>Desfazer</button>{/if}
          {/if}
        </div>
      {/each}
    </div>
    <p class="form-footer">Desfazer volta os saldos de antes e tira o lançamento de diferença que a correção criou. Só a mais recente pode ser desfeita.</p>
  {/if}
</Sheet>

<style>
  .intro { margin: 12px 4px; line-height: 1.45; }
  .block { display: block; }
  .amount { flex: 0 0 112px; max-width: 112px; }
  textarea.field { padding: 10px 16px; }
  .fix { align-items: center; gap: 8px; }
  .fix .btn { height: 32px; padding: 0 10px; font-size: 13.5px; }
</style>
