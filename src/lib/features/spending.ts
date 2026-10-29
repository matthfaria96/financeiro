import { store } from '$lib/data/store.svelte';
import { addMonths, monthOf, today, type Month } from '$lib/core/dates';
import { fold } from '$lib/core/text';
import { averageOfMonthsWithData, seasonalForecast } from '$lib/core/forecast';
import type { Account, Bill, Entry } from '$lib/data/types';
import { billInMonth } from './bills';
import { costOf, kindOf } from './model';
import { payMonth } from './analytics';
import { payableGroups } from './payables';

/**
 * Os três tipos de gasto:
 * - Fixas: contas fixas com valor sempre igual (aluguel, escola, assinaturas) — e gastos marcados como fixos.
 * - Variáveis: contas fixas cujo valor muda (luz, água): todo mês tem, o que varia é o valor.
 * - Sazonais: todo o resto (mercado, lazer, compras, viagens…).
 * A previsão usa o valor cadastrado (fixas) e a média dos últimos 6 meses fechados (variáveis e sazonais),
 * contando só os meses em que houve gasto daquele tipo.
 */
export type SpendKind = 'fixed' | 'variable' | 'seasonal';
export const spendKinds: SpendKind[] = ['fixed', 'variable', 'seasonal'];
export const spendKindName: Record<SpendKind, string> = { fixed: 'Fixas', variable: 'Variáveis', seasonal: 'Sazonais' };
export const spendKindDetail: Record<SpendKind, string> = {
  fixed: 'Todo mês, sempre o mesmo valor',
  variable: 'Todo mês, o valor muda (luz, água…)',
  seasonal: 'O resto: mercado, lazer, compras…'
};
/** Cores validadas para daltonismo sobre o fundo escuro (azul, verde-azulado, laranja). */
export const spendKindColor: Record<SpendKind, string> = { fixed: '#3987e5', variable: '#1f9e8a', seasonal: '#d95926' };

/** Quantos meses fechados entram na média (Configurar o Início › Previsão; padrão 6). */
const history = () => store.forecastMonths || 6;

// A previsão é sempre do que sai do bolso no mês (fatura que vence nele), seja qual for a visão escolhida em Lançamentos.
const expensesOf = (month: Month, entries: Entry[]) => entries.filter((e) => !e.is_mirror && kindOf(e) === 'expense' && payMonth(e) === month);

/** Qual conta fixa cada gasto do mês paga (pelo "texto no extrato" da conta, ou pelo nome dela). */
export function billMatches(month: Month, list: Entry[], bills: Bill[] = store.bills): Map<string, Bill> {
  const matches = new Map<string, Bill>();
  for (const bill of bills.filter((b) => b.active && billInMonth(b, month))) {
    const pattern = fold(bill.match_pattern || bill.name);
    if (!pattern) continue;
    const hit = list.find((e) => !matches.has(e.id) && fold(`${e.title} ${e.original_title}`).includes(pattern));
    if (hit) matches.set(hit.id, bill);
  }
  return matches;
}

export interface MonthSpend {
  fixed: number;
  variable: number;
  seasonal: number;
  /** Parte das fixas que não tem conta fixa cadastrada (gasto marcado como fixo). */
  looseFixed: number;
  /** Quanto cada conta fixa custou no mês. */
  byBill: Map<string, number>;
  kindOf: Map<string, SpendKind>;
}

export function monthSpend(month: Month, entries: Entry[], bills: Bill[] = store.bills): MonthSpend {
  const list = expensesOf(month, entries);
  const matches = billMatches(month, list, bills);
  const result: MonthSpend = { fixed: 0, variable: 0, seasonal: 0, looseFixed: 0, byBill: new Map(), kindOf: new Map() };
  for (const entry of list) {
    const cents = -entry.amount_cents;
    const bill = matches.get(entry.id);
    const kind: SpendKind = bill ? (bill.variable ? 'variable' : 'fixed') : costOf(entry) === 'fixed' ? 'fixed' : 'seasonal';
    result[kind] += cents;
    result.kindOf.set(entry.id, kind);
    if (bill) result.byBill.set(bill.id, (result.byBill.get(bill.id) ?? 0) + cents);
    else if (kind === 'fixed') result.looseFixed += cents;
  }
  return result;
}

/** Os últimos meses fechados (6, por padrão) (o atual ainda está em andamento), do mais antigo ao mais recente. */
export function closedMonths(count = history()): Month[] {
  const now = monthOf(today());
  return Array.from({ length: count }, (_, i) => addMonths(now, i - count));
}

export interface ForecastLine { bill: Bill; cents: number; months: number }
export interface SpendForecast {
  month: Month;
  fixed: { bills: ForecastLine[]; loose: { cents: number; months: number }; total: number };
  variable: { bills: ForecastLine[]; total: number };
  seasonal: { average: { cents: number; months: number }; committed: number; cents: number; basis: 'average' | 'committed' };
  total: number;
}

/** Previsão de gastos para vários meses de uma vez (o histórico é calculado uma vez só). */
export function forecastSpending(months: Month[], entries: Entry[], accounts: Account[]): SpendForecast[] {
  const past = closedMonths().map((m) => monthSpend(m, entries));
  const bills = store.bills.filter((b) => b.active && (!b.account_id || accounts.some((a) => a.id === b.account_id) || !store.accountById.get(b.account_id)));
  const seasonalAverage = averageOfMonthsWithData(past.map((h) => h.seasonal), past.length);
  const looseAverage = averageOfMonthsWithData(past.map((h) => h.looseFixed), past.length);
  const cards = accounts.filter((a) => a.kind === 'creditCard');
  const groups = payableGroups(cards);

  return months.map((month) => {
    const due = bills.filter((b) => billInMonth(b, month)).toSorted((a, b) => a.day_of_month - b.day_of_month);
    const fixedBills = due.filter((b) => !b.variable).map((bill) => ({ bill, cents: bill.amount_cents, months: 0 }));
    const variableBills = due.filter((b) => b.variable).map((bill) => {
      const average = averageOfMonthsWithData(past.map((h) => h.byBill.get(bill.id) ?? 0), past.length);
      return { bill, cents: average.months ? average.cents : bill.amount_cents, months: average.months };
    });
    // Já comprometido no cartão para este mês (compras feitas e parcelas), fora o que é conta fixa ou gasto fixo.
    const ofMonth = groups.filter((g) => monthOf(g.due) === month);
    const charges = ofMonth.flatMap((g) => g.entries);
    const matched = billMatches(month, charges, bills);
    const committed = charges.filter((e) => !matched.has(e.id) && costOf(e) !== 'fixed').reduce((s, e) => s - e.amount_cents, 0) + ofMonth.reduce((s, g) => s + g.projected, 0);
    const seasonal = seasonalForecast(seasonalAverage, committed);
    const fixedTotal = fixedBills.reduce((s, x) => s + x.cents, 0) + looseAverage.cents;
    const variableTotal = variableBills.reduce((s, x) => s + x.cents, 0);
    return {
      month,
      fixed: { bills: fixedBills, loose: looseAverage, total: fixedTotal },
      variable: { bills: variableBills, total: variableTotal },
      seasonal: { average: seasonalAverage, committed, ...seasonal },
      total: fixedTotal + variableTotal + seasonal.cents
    };
  });
}
