import { CARD_PAYMENT } from '$lib/core/catalog';
import { addDays, addMonths, lastDay, monthOf, today, type Day, type Month } from '$lib/core/dates';
import { futureInstallments, monthlyAverage } from '$lib/core/forecast';
import { store } from '$lib/data/store.svelte';
import type { Account, Bill, Entry } from '$lib/data/types';
import { accountOf, balanceOf, billDueOf, categoryOf, costOf, cycleOf, kindOf } from './model';
import { billStatus } from './bills';
import { byMonth } from './entryIndex';

/** O mês do jeito do usuário: entrou; saiu da conta/dinheiro (inclui fatura paga); comprado no crédito
 *  (só informativo: é pago nas próximas faturas); e quanto havia em conta, dinheiro e investido no fim. */
export interface MonthFlow {
  income: number;
  paidFromAccount: number;
  paidCash: number;
  cardBillPaid: number;
  creditPurchases: number;
  endInAccount: number;
  endCash: number;
  endInvested: number;
}

export const totalPaid = (f: MonthFlow) => f.paidFromAccount + f.paidCash + f.cardBillPaid;

export function monthFlow(month: Month, entries: Entry[], accounts: Account[]): MonthFlow {
  const flow: MonthFlow = { income: 0, paidFromAccount: 0, paidCash: 0, cardBillPaid: 0, creditPurchases: 0, endInAccount: 0, endCash: 0, endInvested: 0 };
  for (const entry of byMonth(entries).get(month) ?? []) {
    if (entry.is_mirror) continue;
    const kind = accountOf(entry)?.kind;
    const category = kindOf(entry);
    if (kind === 'checking' || kind === 'cash') {
      if (category === 'transfer') {
        if (categoryOf(entry)?.key === CARD_PAYMENT && entry.amount_cents < 0) flow.cardBillPaid -= entry.amount_cents;
      } else if (category === 'income') flow.income += entry.amount_cents;
      else if (category === 'expense') {
        if (kind === 'cash') flow.paidCash -= entry.amount_cents;
        else flow.paidFromAccount -= entry.amount_cents;
      }
    } else if (kind === 'creditCard' && category === 'expense') flow.creditPurchases -= entry.amount_cents;
  }
  const end = lastDay(month) < today() ? lastDay(month) : today();
  for (const account of accounts) {
    const balance = balanceOf(account, end);
    if (account.kind === 'checking') flow.endInAccount += balance;
    else if (account.kind === 'cash') flow.endCash += balance;
    else if (account.kind === 'savings') flow.endInvested += balance;
  }
  return flow;
}

/** Fatura paga: pagamentos no cartão perto do vencimento ≥ 90% dela, ou na conta um "pagamento de fatura"
 *  de valor parecido (±10%) nessa janela. */
export function isBillPaid(card: Account, due: Day, cents: number, cashEntries: Entry[]): boolean {
  if (cents <= 0) return true;
  const start = cycleOf(card).purchaseRange(due)[1];
  const end = addDays(due, 6);
  const inWindow = (day: Day) => day >= start && day <= end;
  const onCard = (store.entriesByAccount.get(card.id) ?? [])
    .filter((e) => e.amount_cents > 0 && kindOf(e) === 'transfer' && inWindow(e.date))
    .reduce((sum, e) => sum + e.amount_cents, 0);
  if (onCard * 10 >= cents * 9) return true;
  return cashEntries.some((e) => categoryOf(e)?.key === CARD_PAYMENT && e.amount_cents < 0 && inWindow(e.date) && Math.abs(-e.amount_cents - cents) * 10 <= cents);
}

export interface Outlook {
  inAccount: number;
  cash: number;
  invested: number;
  cardsOpen: number;
  incomeSoFar: number;
  paidSoFar: number;
  cardBillsDue: { account: Account; due: Day; cents: number }[];
  fixedPending: number;
  variableRemaining: number;
  expectedIncome: number;
  creditThisMonth: number;
  futureCommitted: number;
  averageEndBalance: number | null;
  monthsInAverage: number;
}

export const outlookTotal = (o: Outlook) => o.inAccount + o.cash + o.invested;
export const stillToPay = (o: Outlook) => o.cardBillsDue.reduce((s, b) => s + b.cents, 0) + o.fixedPending + o.variableRemaining;
export const forecastEnd = (o: Outlook) => o.inAccount + o.cash + o.expectedIncome - stillToPay(o);

export function outlook(entries: Entry[], accounts: Account[], bills: Bill[], months: number): Outlook {
  const now = today();
  const month = monthOf(now);
  const result: Outlook = {
    inAccount: 0, cash: 0, invested: 0, cardsOpen: 0, incomeSoFar: 0, paidSoFar: 0, cardBillsDue: [], fixedPending: 0,
    variableRemaining: 0, expectedIncome: 0, creditThisMonth: 0, futureCommitted: 0, averageEndBalance: null, monthsInAverage: 0
  };
  for (const account of accounts) {
    const balance = balanceOf(account);
    if (account.kind === 'checking') result.inAccount += balance;
    else if (account.kind === 'cash') result.cash += balance;
    else if (account.kind === 'savings') result.invested += balance;
    else result.cardsOpen += Math.max(0, -balance);
  }
  const flow = monthFlow(month, entries, accounts);
  result.incomeSoFar = flow.income;
  result.paidSoFar = totalPaid(flow);
  result.creditThisMonth = flow.creditPurchases;

  const cashEntries = entries.filter((e) => ['checking', 'cash'].includes(accountOf(e)?.kind ?? '') && !e.is_mirror);
  const monthEnd = addDays(lastDay(month), 1);
  const scoped = new Set(entries.map((e) => e.id));
  for (const card of accounts.filter((a) => a.kind === 'creditCard')) {
    const cardEntries = (store.entriesByAccount.get(card.id) ?? []).filter((e) => !e.is_mirror && kindOf(e) === 'expense' && scoped.has(e.id));
    const byDue = new Map<Day, number>();
    for (const entry of cardEntries) {
      const due = billDueOf(entry);
      if (due) byDue.set(due, (byDue.get(due) ?? 0) - entry.amount_cents);
    }
    for (const [due, cents] of byDue) {
      if (cents <= 0) continue;
      if (monthOf(due) === month && due >= now && !isBillPaid(card, due, cents, cashEntries)) result.cardBillsDue.push({ account: card, due, cents });
      else if (due >= monthEnd) result.futureCommitted += cents;
    }
    const latest = [...byDue.keys()].sort().pop() ?? now;
    result.futureCommitted -= futureInstallments(
      cardEntries.filter((e) => e.installment_total > 1).map((e) => ({ title: e.original_title, cents: e.amount_cents, installment: { current: e.installment_current, total: e.installment_total }, due: billDueOf(e)! }))
    ).filter((f) => f.due > latest).reduce((s, f) => s + f.cents, 0);
  }
  result.cardBillsDue.sort((a, b) => a.due.localeCompare(b.due));

  const series = (filter: (e: Entry) => boolean, sign: number) => cashEntries.filter(filter).map((e) => ({ date: e.date, cents: sign * e.amount_cents }));
  const variable = series((e) => kindOf(e) === 'expense' && costOf(e) === 'variable', -1);
  const fixed = series((e) => kindOf(e) === 'expense' && costOf(e) === 'fixed', -1);
  const income = series((e) => kindOf(e) === 'income', 1);
  const thisMonth = (items: { date: Day; cents: number }[]) => items.filter((i) => monthOf(i.date) === month).reduce((s, i) => s + i.cents, 0);
  const variableAverage = monthlyAverage(variable, months, month);
  const fixedAverage = monthlyAverage(fixed, months, month);
  const incomeAverage = monthlyAverage(income, months, month);
  result.monthsInAverage = Math.max(variableAverage.monthsUsed, incomeAverage.monthsUsed);
  result.variableRemaining = Math.max(0, variableAverage.cents - thisMonth(variable));
  result.expectedIncome = Math.max(0, incomeAverage.cents - thisMonth(income));
  const pendingBills = bills
    .filter((b) => b.active && store.accountById.get(b.account_id ?? '')?.kind !== 'creditCard')
    .filter((b) => billStatus(b, month, entries).type !== 'paid')
    .reduce((s, b) => s + b.amount_cents, 0);
  result.fixedPending = Math.max(pendingBills, fixedAverage.cents - thisMonth(fixed), 0);

  // Média do saldo (conta + dinheiro) no último dia dos meses anteriores com lançamentos.
  const cashAccounts = accounts.filter((a) => a.kind === 'checking' || a.kind === 'cash');
  const first = cashAccounts.flatMap((a) => (store.entriesByAccount.get(a.id) ?? []).map((e) => e.date)).sort()[0];
  if (first) {
    const values: number[] = [];
    for (let offset = 1; offset <= Math.max(1, months); offset++) {
      const end = lastDay(addMonths(month, -offset));
      if (end < first) break;
      values.push(cashAccounts.reduce((s, a) => s + balanceOf(a, end), 0));
    }
    if (values.length) result.averageEndBalance = Math.trunc(values.reduce((a, b) => a + b, 0) / values.length);
  }
  return result;
}

/** Últimos `count` meses (o atual por último) com o fluxo de cada um, para os gráficos. */
export function flowHistory(count: number, entries: Entry[], accounts: Account[]): { month: Month; flow: MonthFlow }[] {
  const now = monthOf(today());
  return Array.from({ length: count }, (_, index) => addMonths(now, index - count + 1)).map((month) => ({ month, flow: monthFlow(month, entries, accounts) }));
}
