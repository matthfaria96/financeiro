import { BillCycle, assignBills, dueDateInFileName, looksLikeSingleBill } from '$lib/core/billCycle';
import { INVESTMENT, UNCATEGORIZED } from '$lib/core/catalog';
import { addDays, parts, type Day } from '$lib/core/dates';
import { crossFormatMatches, duplicateKeys } from '$lib/core/duplicates';
import { bankName, dateRange, summary, type Bank, type ImportedStatement, type ImportedTransaction } from '$lib/core/statement';
import { parseCents } from '$lib/core/money';
import { isConfident } from '$lib/core/categorizer';
import { store } from '$lib/data/store.svelte';
import type { Account, AccountKind, Entry } from '$lib/data/types';
import { makeCategorizer, merchantIdOf } from './rules';
import { blankEntry, reconcileMirrors } from './mirrors';
import { inScopeAccount } from './model';

export interface ImportRow {
  index: number;
  transaction: ImportedTransaction;
  key: string;
  duplicate: boolean;
  possibleDuplicate: boolean;
  include: boolean;
  categoryKey: string;
  personId: string | null;
  merchantId: string | null;
  displayName: string;
  confident: boolean;
  includeEdited: boolean;
  categoryEdited: boolean;
}

export type InvestmentChoice = { type: 'none' } | { type: 'existing'; id: string } | { type: 'new' };

/** Revisão de um arquivo antes de gravar. */
export class ImportDraft {
  id = crypto.randomUUID();
  rows = $state<ImportRow[]>([]);
  /** id da conta de destino ou 'new'. */
  target = $state<string>('new');
  newAccountName = $state('');
  newAccountBank = $state<Bank>('other');
  newAccountKind = $state<AccountKind>('checking');
  newAccountWorkspace = $state<string | null>(null);
  defaultPersonId = $state<string | null>(null);
  invertSigns = $state(false);
  manualBalance = $state('');
  otherAccountMatches = $state<{ name: string; count: number }[]>([]);
  billSingle = $state(true);
  billDue = $state<Day>('2000-01-01');
  billClosingDay = $state(2);
  billDueDay = $state(10);
  investment = $state<InvestmentChoice>({ type: 'none' });
  newInvestmentName = $state('');

  constructor(public fileName: string, public statement: ImportedStatement) {
    this.newAccountBank = statement.bank;
    this.newAccountKind = statement.kind === 'creditCard' ? 'creditCard' : 'checking';
    const suffix = statement.kind === 'creditCard' ? 'cartão' : 'conta';
    this.newAccountName = statement.bank === 'other' ? `Nova ${suffix}` : `${bankName[statement.bank]} ${suffix}`;
  }

  get targetAccount(): Account | undefined {
    return this.target === 'new' ? undefined : store.accountById.get(this.target);
  }

  get isCard(): boolean {
    return (this.targetAccount?.kind ?? this.newAccountKind) === 'creditCard';
  }

  get transactions(): ImportedTransaction[] {
    return this.statement.transactions.map((t) => (this.invertSigns ? { ...t, amountCents: -t.amountCents } : t));
  }

  get newCount() {
    return this.rows.filter((r) => r.include && !r.duplicate).length;
  }
  get duplicateCount() {
    return this.rows.filter((r) => r.duplicate).length;
  }
  get possibleCount() {
    return this.rows.filter((r) => r.possibleDuplicate && !r.duplicate).length;
  }
  get uncategorizedCount() {
    return this.rows.filter((r) => r.include && !r.duplicate && !r.confident).length;
  }
  get investmentCount() {
    return this.statement.kind === 'checking' ? this.rows.filter((r) => r.include && !r.duplicate && r.categoryKey === INVESTMENT).length : 0;
  }

  get cycle() {
    return new BillCycle(this.billClosingDay, this.billDueDay);
  }

  get billDueDates(): Day[] {
    return assignBills(this.transactions, this.billSingle ? this.billDue : null, this.cycle);
  }

  /** Resumo por fatura, só das compras que vão ser gravadas. */
  get billGroups(): { due: Day; count: number; cents: number; range: [Day, Day] }[] {
    const dates = this.billDueDates;
    const totals = new Map<Day, { count: number; cents: number }>();
    for (const row of this.rows) {
      if (!row.include || row.duplicate || row.transaction.amountCents >= 0) continue;
      const due = dates[row.index];
      const current = totals.get(due) ?? { count: 0, cents: 0 };
      totals.set(due, { count: current.count + 1, cents: current.cents + row.transaction.amountCents });
    }
    return [...totals.entries()].map(([due, value]) => ({ due, ...value, range: this.cycle.purchaseRange(due) })).sort((a, b) => a.due.localeCompare(b.due));
  }

  /** Saldo do arquivo ou o digitado, na data final do extrato. */
  get closingBalance(): { cents: number; date: Day } | null {
    if (this.statement.balanceCents !== undefined && this.statement.balanceDate) return { cents: this.statement.balanceCents, date: this.statement.balanceDate };
    const range = dateRange(this.statement);
    const cents = this.manualBalance.trim() ? parseCents(this.manualBalance) : null;
    return this.statement.kind === 'checking' && range && cents !== null ? { cents, date: range[1] } : null;
  }

  get summary() {
    return summary(this.statement);
  }
}

/** Conta com o mesmo número do arquivo; senão a única do mesmo banco e tipo. */
export function matchAccount(statement: ImportedStatement, accounts: Account[]): Account | undefined {
  const active = accounts.filter((a) => !a.archived);
  if (statement.accountId) {
    const exact = active.find((a) => a.external_id === statement.accountId);
    if (exact) return exact;
  }
  const kind: AccountKind = statement.kind === 'creditCard' ? 'creditCard' : 'checking';
  const candidates = active.filter((a) => a.bank === statement.bank && a.kind === kind && statement.bank !== 'other');
  return candidates.length === 1 ? candidates[0] : undefined;
}

export function createDraft(fileName: string, statement: ImportedStatement, accountId: string | null): ImportDraft {
  const draft = new ImportDraft(fileName, statement);
  draft.newAccountWorkspace = store.scopeId || null;
  const chosen = accountId ? store.accountById.get(accountId) : undefined;
  const match = chosen ?? matchAccount(statement, store.accounts.filter(inScopeAccount)) ?? matchAccount(statement, store.accounts);
  if (match) draft.target = match.id;
  rebuildRows(draft);
  configureBills(draft);
  configureInvestment(draft);
  return draft;
}

/** Recalcula duplicatas e sugestões; mantém só o que o usuário mexeu. */
export function rebuildRows(draft: ImportDraft) {
  const categorizer = makeCategorizer();
  const transactions = draft.transactions;
  const keys = duplicateKeys(transactions);
  const account = draft.targetAccount;
  const existing = (account ? store.entriesByAccount.get(account.id) ?? [] : []).map((e) => ({ date: e.date, amountCents: e.amount_cents, key: e.import_key }));
  const exact = new Set(existing.map((e) => e.key));
  const possible = crossFormatMatches(keys, transactions, existing);
  const previous = new Map(draft.rows.map((row) => [row.index, row]));
  draft.rows = transactions.map((transaction, index) => {
    const suggestion = categorizer.suggest(transaction.title, transaction.memo, transaction.amountCents, transaction.bankCategory);
    const duplicate = exact.has(keys[index]);
    const old = previous.get(index);
    const row: ImportRow = {
      index, transaction, key: keys[index], duplicate, possibleDuplicate: possible.has(index), include: !duplicate && !possible.has(index),
      categoryKey: suggestion.categoryKey, personId: suggestion.personId, merchantId: merchantIdOf(suggestion), displayName: suggestion.displayName,
      confident: isConfident(suggestion), includeEdited: false, categoryEdited: false
    };
    if (old?.includeEdited && !old.duplicate && !duplicate) Object.assign(row, { include: old.include, includeEdited: true });
    if (old?.categoryEdited) Object.assign(row, { categoryKey: old.categoryKey, confident: true, categoryEdited: true });
    return row;
  });
  const keySet = new Set(keys);
  draft.otherAccountMatches = store.accounts
    .filter((a) => a.id !== account?.id)
    .map((a) => ({ name: a.name, count: (store.entriesByAccount.get(a.id) ?? []).filter((e) => keySet.has(e.import_key)).length }))
    .filter((m) => m.count >= Math.max(3, Math.floor(keySet.size / 4)));
}

export function configureBills(draft: ImportDraft) {
  const account = draft.targetAccount;
  if (!draft.isCard && draft.statement.kind !== 'creditCard') return;
  draft.billClosingDay = account?.closing_day ?? 2;
  draft.billDueDay = account?.due_day ?? 10;
  draft.billSingle = looksLikeSingleBill(draft.statement.transactions);
  const purchases = draft.statement.transactions.filter((t) => t.amountCents < 0 && (t.installment?.current ?? 1) <= 1).map((t) => t.date).sort();
  const fileDate = dueDateInFileName(draft.fileName);
  if (fileDate) {
    // A data no nome pode ser o vencimento ou o fechamento.
    draft.billDue = parts(fileDate).day === draft.billDueDay ? fileDate : draft.cycle.dueDate(addDays(fileDate, -1));
  } else if (purchases.length) {
    draft.billDue = draft.cycle.dueDate(purchases[purchases.length - 1]);
  }
}

export function configureInvestment(draft: ImportDraft) {
  if (!draft.investmentCount) {
    draft.investment = { type: 'none' };
    return;
  }
  const source = draft.targetAccount;
  const tracker = source ? store.accounts.find((a) => a.kind === 'savings' && a.investment_source_id === source.id) : undefined;
  draft.investment = tracker ? { type: 'existing', id: tracker.id } : { type: 'new' };
  const bank = source?.bank ?? draft.statement.bank;
  draft.newInvestmentName = bank === 'nubank' ? 'Nubank Caixinhas' : `${bank === 'other' ? 'Meus' : bankName[bank]} investimentos`;
}

export interface ImportOutcome {
  fileName: string;
  accountName: string;
  added: number;
  skipped: number;
  uncategorized: number;
  balanceAdjusted: boolean;
  mirrored: number;
}

export async function commitDraft(draft: ImportDraft): Promise<ImportOutcome> {
  const account = await resolveAccount(draft);
  const existingKeys = new Set((store.entriesByAccount.get(account.id) ?? []).map((e) => e.import_key));
  const isCardAccount = account.kind === 'creditCard';
  const dueDates = isCardAccount ? draft.billDueDates : [];
  if (isCardAccount && (account.closing_day !== draft.billClosingDay || account.due_day !== draft.billDueDay)) {
    await store.update('accounts', account.id, { closing_day: draft.billClosingDay, due_day: draft.billDueDay });
  }
  const range = dateRange(draft.statement);
  const [batch] = await store.insert('import_batches', [{
    account_id: account.id, file_name: draft.fileName, format: draft.statement.format, summary: draft.summary,
    added_count: 0, skipped_count: 0, first_date: range?.[0] ?? null, last_date: range?.[1] ?? null, imported_at: new Date().toISOString()
  }]);
  const fallbackPerson = draft.defaultPersonId ?? account.default_person_id;
  const rows: Partial<Entry>[] = [];
  let uncategorized = 0;
  let hasInvestment = false;
  for (const row of draft.rows) {
    if (!row.include || row.duplicate || existingKeys.has(row.key)) continue;
    existingKeys.add(row.key);
    const t = row.transaction;
    const category = store.categoryByKey.get(row.categoryKey) ?? store.categoryByKey.get(UNCATEGORIZED);
    rows.push({
      ...blankEntry(), account_id: account.id, date: t.date, amount_cents: t.amountCents, title: row.displayName, original_title: t.title,
      memo: t.memo, import_key: row.key, bank_category: t.bankCategory ?? '', installment_current: t.installment?.current ?? 0,
      installment_total: t.installment?.total ?? 0, category_id: category?.id ?? null, merchant_id: row.merchantId,
      person_id: row.personId ?? fallbackPerson, user_edited: row.categoryEdited, bill_due_date: isCardAccount ? dueDates[row.index] : null,
      batch_id: batch.id
    });
    if (!row.confident) uncategorized++;
    if (row.categoryKey === INVESTMENT) hasInvestment = true;
  }
  await store.insert('entries', rows);
  await store.update('import_batches', batch.id, { added_count: rows.length, skipped_count: draft.rows.length - rows.length });
  if (hasInvestment) await linkInvestment(draft, account);
  const adjusted = await applyBalance(account.id, draft.closingBalance, batch.id);
  if (!account.external_id && draft.statement.accountId) await store.update('accounts', account.id, { external_id: draft.statement.accountId });
  const mirrored = await reconcileMirrors();
  return { fileName: draft.fileName, accountName: account.name, added: rows.length, skipped: draft.rows.length - rows.length, uncategorized, balanceAdjusted: adjusted, mirrored };
}

async function resolveAccount(draft: ImportDraft): Promise<Account> {
  if (draft.targetAccount) return draft.targetAccount;
  const name = draft.newAccountName.trim() || bankName[draft.newAccountBank];
  // Vários arquivos da mesma conta na mesma leva: o primeiro cria, os outros reaproveitam.
  const same = store.accounts.find((a) => (draft.statement.accountId && a.external_id === draft.statement.accountId) || (a.name === name && a.bank === draft.newAccountBank && a.kind === draft.newAccountKind));
  if (same) return same;
  const [account] = await store.insert('accounts', [newAccount({
    name, bank: draft.newAccountBank, kind: draft.newAccountKind, external_id: draft.statement.accountId ?? '',
    workspace_id: draft.newAccountWorkspace, default_person_id: draft.defaultPersonId, sort_order: store.accounts.length
  })]);
  draft.target = account.id;
  return account;
}

async function linkInvestment(draft: ImportDraft, source: Account) {
  const choice = draft.investment;
  if (choice.type === 'none') return;
  if (choice.type === 'existing') {
    const tracker = store.accountById.get(choice.id);
    if (tracker && !tracker.investment_source_id) await store.update('accounts', tracker.id, { investment_source_id: source.id });
    return;
  }
  const existing = store.accounts.find((a) => a.kind === 'savings' && a.investment_source_id === source.id);
  if (existing) {
    draft.investment = { type: 'existing', id: existing.id };
    return;
  }
  const [created] = await store.insert('accounts', [newAccount({
    name: draft.newInvestmentName.trim() || 'Investimentos', bank: source.bank, kind: 'savings', investment_source_id: source.id,
    workspace_id: source.workspace_id, default_person_id: source.default_person_id, sort_order: store.accounts.length
  })]);
  draft.investment = { type: 'existing', id: created.id };
}

/** Saldo do extrato vira a referência quando é mais recente que a atual (guarda a anterior para desfazer). */
async function applyBalance(accountId: string, closing: { cents: number; date: Day } | null, batchId: string): Promise<boolean> {
  const account = store.accountById.get(accountId);
  if (!account || !closing) return false;
  if (account.anchor_date && closing.date < account.anchor_date) return false;
  await store.update('accounts', accountId, {
    prev_anchor_balance_cents: account.anchor_balance_cents, prev_anchor_date: account.anchor_date,
    anchor_balance_cents: closing.cents, anchor_date: closing.date, anchor_batch_id: batchId
  });
  return true;
}

/** Desfaz uma importação: apaga os lançamentos dela e devolve o saldo de referência anterior. */
export async function undoImport(batchId: string) {
  for (const account of store.accounts.filter((a) => a.anchor_batch_id === batchId)) {
    await store.update('accounts', account.id, {
      anchor_balance_cents: account.prev_anchor_balance_cents, anchor_date: account.prev_anchor_date, anchor_batch_id: null,
      prev_anchor_balance_cents: null, prev_anchor_date: null
    });
  }
  await store.remove('import_batches', [batchId]);
  await reconcileMirrors();
}

/** Move lançamentos para outra conta; os que já existem lá saem da origem em vez de duplicar. */
export async function moveEntries(ids: string[], destinationId: string): Promise<{ moved: number; removed: number }> {
  const destination = store.accountById.get(destinationId);
  if (!destination) return { moved: 0, removed: 0 };
  const keys = new Set((store.entriesByAccount.get(destinationId) ?? []).map((e) => e.import_key));
  const entries = store.entries.filter((e) => ids.includes(e.id) && !e.is_mirror && e.account_id !== destinationId);
  const removeIds: string[] = [];
  const patches: { id: string; patch: Partial<Entry> }[] = [];
  for (const entry of entries) {
    if (entry.import_key && keys.has(entry.import_key)) removeIds.push(entry.id);
    else {
      keys.add(entry.import_key);
      patches.push({ id: entry.id, patch: { account_id: destinationId, ...(destination.kind === 'creditCard' ? {} : { bill_due_date: null }) } });
    }
  }
  const batchIds = new Set(entries.map((e) => e.batch_id).filter(Boolean) as string[]);
  await store.remove('entries', removeIds);
  await store.updateMany('entries', patches);
  // Importação que ficou toda na conta nova passa a ser dela, com o saldo de referência que trouxe.
  for (const batchId of batchIds) {
    const remaining = store.entries.filter((e) => e.batch_id === batchId && !e.is_mirror);
    if (!remaining.length || !remaining.every((e) => e.account_id === destinationId)) continue;
    const old = store.accounts.find((a) => a.anchor_batch_id === batchId && a.id !== destinationId);
    if (old && old.anchor_date && old.anchor_balance_cents !== null && (!destination.anchor_date || old.anchor_date >= destination.anchor_date)) {
      await store.update('accounts', destinationId, {
        prev_anchor_balance_cents: destination.anchor_balance_cents, prev_anchor_date: destination.anchor_date,
        anchor_balance_cents: old.anchor_balance_cents, anchor_date: old.anchor_date, anchor_batch_id: batchId
      });
      await store.update('accounts', old.id, { anchor_balance_cents: old.prev_anchor_balance_cents, anchor_date: old.prev_anchor_date, anchor_batch_id: null });
    }
    await store.update('import_batches', batchId, { account_id: destinationId });
  }
  await reconcileMirrors();
  return { moved: patches.length, removed: removeIds.length };
}

export function newAccount(fields: Partial<Account>): Partial<Account> {
  return {
    name: '', bank: 'other', kind: 'checking', external_id: '', color: '', last_digits: '', archived: false, sort_order: 0,
    closing_day: 2, due_day: 10, workspace_id: null, default_person_id: null, investment_source_id: null, anchor_balance_cents: null,
    anchor_date: null, anchor_batch_id: null, prev_anchor_balance_cents: null, prev_anchor_date: null, ...fields
  };
}
