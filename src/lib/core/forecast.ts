import { addMonths, monthOf, clampedDay, parts, type Day, type Month } from './dates';
import { displayName, fold } from './text';
import type { Installment } from './statement';

/** Média mensal: até `months` meses fechados anteriores, a partir do primeiro mês com dado
 *  (meses vazios depois disso contam como zero). Com pouco histórico, usa o que houver. */
export function monthlyAverage(items: { date: Day; cents: number }[], months: number, now: Month): { cents: number; monthsUsed: number } {
  const totals = new Map<Month, number>();
  for (const item of items) {
    const month = monthOf(item.date);
    if (month >= now) continue;
    totals.set(month, (totals.get(month) ?? 0) + item.cents);
  }
  const first = [...totals.keys()].sort()[0];
  if (!first || months <= 0) return { cents: 0, monthsUsed: 0 };
  const used: number[] = [];
  for (let offset = 1; offset <= months; offset++) {
    const month = addMonths(now, -offset);
    if (month < first) break;
    used.push(totals.get(month) ?? 0);
  }
  if (!used.length) return { cents: 0, monthsUsed: 0 };
  return { cents: Math.trunc(used.reduce((a, b) => a + b, 0) / used.length), monthsUsed: used.length };
}

export interface FutureInstallment {
  due: Day;
  cents: number;
  title: string;
  label: string;
}

/** Parcelas que ainda vão vir, a partir da parcela mais recente de cada compra.
 *  Agrupa pelo valor em reais: o banco joga o centavo que sobra na 1ª (33,34 + 33,33 + 33,33). */
export function futureInstallments(items: { title: string; cents: number; installment: Installment; due: Day }[]): FutureInstallment[] {
  const latest = new Map<string, { cents: number; installment: Installment; due: Day; title: string }>();
  for (const item of items) {
    const key = `${fold(displayName(item.title))}|${Math.trunc(item.cents / 100)}|${item.installment.total}`;
    const current = latest.get(key);
    if (current && current.installment.current >= item.installment.current) continue;
    latest.set(key, { ...item, title: displayName(item.title) });
  }
  const result: FutureInstallment[] = [];
  for (const value of latest.values()) {
    for (let number = value.installment.current + 1; number <= value.installment.total; number++) {
      const due = clampedDay(addMonths(monthOf(value.due), number - value.installment.current), parts(value.due).day);
      result.push({ due, cents: value.cents, title: value.title, label: `${number}/${value.installment.total}` });
    }
  }
  return result.sort((a, b) => a.due.localeCompare(b.due) || a.title.localeCompare(b.title));
}

/**
 * Média por mês considerando só os meses que tiveram valor (o mais recente por último).
 * Ex.: [0, 0, 0, 0, 200, 300] → 250 em 2 meses, e não 83 em 6: mês sem dado não é mês sem gasto.
 */
export function averageOfMonthsWithData(values: number[], limit = 6): { cents: number; months: number } {
  const used = values.slice(-limit).filter((v) => v > 0);
  if (!used.length) return { cents: 0, months: 0 };
  return { cents: Math.round(used.reduce((a, b) => a + b, 0) / used.length), months: used.length };
}

/** Sazonais de um mês futuro: a média, a não ser que o cartão já tenha mais do que isso comprometido (compras e parcelas). */
export function seasonalForecast(average: { cents: number; months: number }, committed: number): { cents: number; basis: 'average' | 'committed' } {
  return committed > average.cents ? { cents: committed, basis: 'committed' } : { cents: average.cents, basis: 'average' };
}
