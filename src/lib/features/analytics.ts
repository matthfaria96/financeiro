import { UNCATEGORIZED } from '$lib/core/catalog';
import { lastDay, monthOf, today, type Month } from '$lib/core/dates';
import { store } from '$lib/data/store.svelte';
import type { Account, Category, Entry } from '$lib/data/types';
import { accountOf, balanceOf, categoryOf, kindOf, rootOf } from './model';
import { payableGroups } from './payables';
import { billInMonth, onCard } from './bills';
import { payerOf } from './ambient';

/**
 * A conta do mês usada no Início e em Lançamentos (sempre a mesma, para os números baterem):
 * entradas = receitas em conta e dinheiro; saídas = despesas de qualquer conta pela data da compra
 * (cartão incluído; pagamento de fatura e transferências não contam, senão somaria duas vezes).
 */
export interface Group {
  key: string;
  label: string;
  color: string;
  icon: string;
  cents: number;
  share: number;
  entries: Entry[];
}

export interface MonthAnalysis {
  balances: { account: Account; cents: number }[];
  balanceTotal: number;
  income: Group[];
  incomeTotal: number;
  expenses: Group[];
  expenseTotal: number;
  balance: number;
}

function group(entries: Entry[], keyOf: (entry: Entry) => Category | undefined, sign: 1 | -1): { groups: Group[]; total: number } {
  const map = new Map<string, Group>();
  for (const entry of entries) {
    const category = keyOf(entry);
    const known = category && category.key !== UNCATEGORIZED;
    const key = known ? category.id : 'none';
    const row = map.get(key) ?? { key, label: known ? category.name : 'Não categorizados', color: known ? category.color : '#78909C', icon: known ? category.symbol : 'questionmark.circle', cents: 0, share: 0, entries: [] };
    row.cents += sign * entry.amount_cents;
    row.entries.push(entry);
    map.set(key, row);
  }
  const groups = [...map.values()].filter((g) => g.cents !== 0);
  const total = groups.reduce((s, g) => s + g.cents, 0);
  for (const g of groups) {
    g.share = total ? g.cents / total : 0;
    g.entries.sort((a, b) => b.date.localeCompare(a.date));
  }
  // "Não categorizados" sempre por último.
  groups.sort((a, b) => (a.key === 'none' ? 1 : b.key === 'none' ? -1 : b.cents - a.cents));
  return { groups, total };
}

/** Entradas por cliente (modo Empresa): quem pagou, pelo estabelecimento reconhecido ou pelo nome no Pix/TED. */
function byPayer(entries: Entry[]): { groups: Group[]; total: number } {
  const palette = ['#2BD4A4', '#3987E5', '#9085E9', '#38D9F5', '#FF9F1C', '#FF8FAB', '#A3D977', '#FFD60A'];
  const map = new Map<string, Group>();
  for (const entry of entries) {
    const merchant = entry.merchant_id ? store.merchantById.get(entry.merchant_id)?.name : undefined;
    const label = merchant ?? payerOf(entry.title);
    const key = label.toLowerCase();
    const row = map.get(key) ?? { key, label, color: palette[map.size % palette.length], icon: 'briefcase', cents: 0, share: 0, entries: [] };
    row.cents += entry.amount_cents;
    row.entries.push(entry);
    map.set(key, row);
  }
  const groups = [...map.values()].filter((g) => g.cents > 0).toSorted((a, b) => b.cents - a.cents);
  const total = groups.reduce((s, g) => s + g.cents, 0);
  for (const g of groups) g.share = total ? g.cents / total : 0;
  return { groups, total };
}

export function analyzeMonth(month: Month, entries: Entry[], accounts: Account[], clients = false): MonthAnalysis {
  const inMonth = entries.filter((e) => !e.is_mirror && monthOf(e.date) === month);
  const incoming = inMonth.filter((e) => kindOf(e) === 'income' && ['checking', 'cash'].includes(accountOf(e)?.kind ?? ''));
  const income = clients ? byPayer(incoming) : group(incoming, categoryOf, 1);
  const expenses = group(inMonth.filter((e) => kindOf(e) === 'expense'), (e) => rootOf(categoryOf(e)), -1);
  const now = today();
  const end = lastDay(month) < now ? lastDay(month) : now;
  const balances = accounts.filter((a) => a.kind !== 'creditCard' && !a.archived).map((account) => ({ account, cents: balanceOf(account, end) }));
  return {
    balances,
    balanceTotal: balances.reduce((s, b) => s + b.cents, 0),
    income: income.groups,
    incomeTotal: income.total,
    expenses: expenses.groups,
    expenseTotal: expenses.total,
    balance: income.total - expenses.total
  };
}

/** O que já se sabe que vai sair num mês futuro: faturas (compras feitas + parcelas) e contas fixas fora do cartão. */
export function forecastMonth(month: Month, accounts: Account[]) {
  const faturas = payableGroups(accounts.filter((a) => a.kind === 'creditCard'))
    .filter((g) => monthOf(g.due) === month)
    .map((g) => ({ account: g.account, due: g.due, cents: g.imported + g.projected }));
  const scope = new Set(accounts.map((a) => a.id));
  const bills = store.bills
    .filter((b) => b.active && billInMonth(b, month) && !onCard(b, store.accountById.get(b.account_id ?? '')?.kind === 'creditCard') && (!b.account_id || scope.has(b.account_id)))
    .toSorted((a, b) => a.day_of_month - b.day_of_month);
  const total = faturas.reduce((s, f) => s + f.cents, 0) + bills.reduce((s, b) => s + b.amount_cents, 0);
  return { faturas, bills, total };
}
