import { addMonths, monthOf, type Day, type Month } from './dates';
import type { CategoryKind } from './catalog';

export interface ReportItem {
  date: Day;
  amountCents: number;
  groupId: string;
  kind: CategoryKind;
}

export interface Slice {
  groupId: string;
  totalCents: number;
  share: number;
  /** Variação contra o mês anterior (0,12 = +12%); null quando não houve no mês anterior. */
  change: number | null;
}

export interface MonthReport {
  totalCents: number;
  previousTotalCents: number;
  slices: Slice[];
  change: number | null;
}

/** Soma por grupo no mês, comparando com o anterior. Transferências ficam de fora;
 *  estornos (positivos em categoria de despesa) abatem o grupo. */
export function monthReport(month: Month, items: ReportItem[], flow: 'expenses' | 'income'): MonthReport {
  const previous = addMonths(month, -1);
  const totals = (target: Month) => {
    const result = new Map<string, number>();
    for (const item of items) {
      if (monthOf(item.date) !== target) continue;
      if (flow === 'expenses' && item.kind === 'expense') result.set(item.groupId, (result.get(item.groupId) ?? 0) - item.amountCents);
      if (flow === 'income' && item.kind === 'income') result.set(item.groupId, (result.get(item.groupId) ?? 0) + item.amountCents);
    }
    return result;
  };
  const current = totals(month);
  const before = totals(previous);
  const total = [...current.values()].reduce((a, b) => a + b, 0);
  const previousTotal = [...before.values()].reduce((a, b) => a + b, 0);
  const slices: Slice[] = [];
  for (const [groupId, cents] of current) {
    if (cents <= 0) continue;
    const old = before.get(groupId) ?? 0;
    slices.push({ groupId, totalCents: cents, share: total > 0 ? cents / total : 0, change: old > 0 ? (cents - old) / old : null });
  }
  slices.sort((a, b) => b.totalCents - a.totalCents || a.groupId.localeCompare(b.groupId));
  return {
    totalCents: Math.max(total, 0),
    previousTotalCents: Math.max(previousTotal, 0),
    slices,
    change: previousTotal > 0 ? (total - previousTotal) / previousTotal : null
  };
}
