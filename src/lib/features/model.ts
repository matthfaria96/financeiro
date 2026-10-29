import { BillCycle } from '$lib/core/billCycle';
import { CARD_PAYMENT, INVESTMENT, UNCATEGORIZED, type CategoryKind, type CostType } from '$lib/core/catalog';
import type { Day } from '$lib/core/dates';
import { store } from '$lib/data/store.svelte';
import type { Account, Bill, Category, Entry } from '$lib/data/types';

/** Regras derivadas dos dados (o que o app nativo tinha como propriedades dos modelos). */

export function categoryOf(entry: Entry): Category | undefined {
  return entry.category_id ? store.categoryById.get(entry.category_id) : undefined;
}

export function rootOf(category: Category | undefined): Category | undefined {
  if (!category) return undefined;
  return category.parent_id ? store.categoryById.get(category.parent_id) ?? category : category;
}

export function fullName(category: Category | undefined): string {
  if (!category) return 'Sem categoria';
  const parent = category.parent_id ? store.categoryById.get(category.parent_id) : undefined;
  return parent ? `${parent.name} › ${category.name}` : category.name;
}

export function kindOf(entry: Entry): CategoryKind {
  return categoryOf(entry)?.kind ?? (entry.amount_cents >= 0 ? 'income' : 'expense');
}

export function categoryCost(category: Category | undefined): CostType {
  if (!category) return 'variable';
  if (category.cost_type) return category.cost_type;
  const parent = category.parent_id ? store.categoryById.get(category.parent_id) : undefined;
  return parent?.cost_type || 'variable';
}

/** Fixo ou variável: o do lançamento, senão o do estabelecimento, senão o da categoria. */
export function costOf(entry: Entry): CostType {
  if (entry.cost_type) return entry.cost_type;
  const merchant = entry.merchant_id ? store.merchantById.get(entry.merchant_id) : undefined;
  return merchant?.cost_type || categoryCost(categoryOf(entry));
}

export function accountOf(entry: Entry): Account | undefined {
  return store.accountById.get(entry.account_id);
}

export function isCard(entry: Entry): boolean {
  return accountOf(entry)?.kind === 'creditCard';
}

export function cycleOf(account: Account): BillCycle {
  return new BillCycle(account.closing_day, account.due_day);
}

/** Vencimento da fatura (cartão); pelo ciclo do cartão quando a importação não definiu. */
export function billDueOf(entry: Entry): Day | null {
  const account = accountOf(entry);
  if (account?.kind !== 'creditCard') return null;
  return entry.bill_due_date ?? cycleOf(account).dueDate(entry.date);
}

export const isUncategorized = (entry: Entry) => !entry.category_id || categoryOf(entry)?.key === UNCATEGORIZED;
export const isCardPayment = (entry: Entry) => categoryOf(entry)?.key === CARD_PAYMENT;

// Saldo -------------------------------------------------------------------------------------------

/** Conta corrente sem investimento separado acompanhando: guardar/resgatar da caixinha é o mesmo dinheiro
 *  (não muda o saldo). O rendimento entra como lançamento de "Rendimentos" quando o usuário fecha o mês. */
export function savingsInside(account: Account): boolean {
  return account.kind === 'checking' && !store.accounts.some((a) => a.kind === 'savings' && !a.archived && a.investment_source_id === account.id);
}

export function isInternalMove(account: Account, entry: Entry): boolean {
  return entry.category_id !== null && entry.category_id === store.categoryByKey.get(INVESTMENT)?.id && savingsInside(account);
}

/** Saldo de uma conta ao fim de `day` (ou com tudo, se omitido). Com saldo de referência (X ao fim do dia D),
 *  saldo(t) = X + Σ lançamentos em (D, t] − Σ lançamentos em (t, D]. Sem referência, soma tudo até t. */
export function balanceOf(account: Account, day?: Day): number {
  const entries = (store.entriesByAccount.get(account.id) ?? []).filter((e) => !isInternalMove(account, e));
  if (account.anchor_date !== null && account.anchor_balance_cents !== null) {
    const anchor = account.anchor_date;
    let total = account.anchor_balance_cents;
    for (const entry of entries) {
      if (day === undefined) {
        if (entry.date > anchor) total += entry.amount_cents;
      } else if (day >= anchor) {
        if (entry.date > anchor && entry.date <= day) total += entry.amount_cents;
      } else if (entry.date > day && entry.date <= anchor) {
        total -= entry.amount_cents;
      }
    }
    return total;
  }
  let total = 0;
  for (const entry of entries) if (day === undefined || entry.date <= day) total += entry.amount_cents;
  return total;
}

export function lastEntryDate(account: Account): Day | null {
  let last: Day | null = null;
  for (const entry of store.entriesByAccount.get(account.id) ?? []) if (!last || entry.date > last) last = entry.date;
  return last;
}

// Área de trabalho ------------------------------------------------------------------------------

export function inScopeAccount(account: Account): boolean {
  return !store.scopeId || account.workspace_id === store.scopeId;
}

export function inScope(entry: Entry): boolean {
  if (!store.scopeId) return true;
  return accountOf(entry)?.workspace_id === store.scopeId;
}

export function inScopeBill(bill: Bill): boolean {
  if (!store.scopeId) return true;
  const workspace = bill.workspace_id ?? (bill.account_id ? store.accountById.get(bill.account_id)?.workspace_id : null);
  return workspace === store.scopeId;
}

export const visibleEntries = () => store.entries.filter(inScope);
export const visibleAccounts = () => store.accounts.filter(inScopeAccount);
