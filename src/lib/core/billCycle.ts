import { addDays, clampedDay, diffDays, monthOf, addMonths, parts, type Day } from './dates';
import type { ImportedTransaction } from './statement';

/** Em qual fatura (vencimento) cada compra cai. Compras até o dia anterior ao fechamento entram na fatura
 *  que fecha naquele mês; a partir do fechamento ("melhor dia de compra"), vão para a seguinte. */
export class BillCycle {
  readonly closingDay: number;
  readonly dueDay: number;

  constructor(closingDay: number, dueDay: number) {
    this.closingDay = Math.min(Math.max(closingDay, 1), 31);
    this.dueDay = Math.min(Math.max(dueDay, 1), 31);
  }

  dueDate(purchase: Day): Day {
    let month = monthOf(purchase);
    const closing = Number(clampedDay(month, this.closingDay).slice(8));
    if (parts(purchase).day >= closing) month = addMonths(month, 1);
    if (this.dueDay <= this.closingDay) month = addMonths(month, 1);
    return clampedDay(month, this.dueDay);
  }

  /** Compras que formam a fatura com este vencimento. */
  purchaseRange(due: Day): [Day, Day] {
    let closingMonth = monthOf(due);
    if (this.dueDay <= this.closingDay) closingMonth = addMonths(closingMonth, -1);
    const closing = clampedDay(closingMonth, this.closingDay);
    const start = clampedDay(addMonths(closingMonth, -1), this.closingDay);
    return [start, addDays(closing, -1)];
  }
}

/** "Nubank_2026-10-10.csv" → "2026-10-10" (o Nubank põe a data da fatura no nome). */
export function dueDateInFileName(name: string): Day | null {
  return name.match(/(20\d{2}-\d{2}-\d{2})/)?.[1] ?? null;
}

/** Uma fatura só: compras à vista dentro de ~35 dias (parcelas antigas vêm com a data original). */
export function looksLikeSingleBill(transactions: ImportedTransaction[]): boolean {
  const dates = transactions.filter((t) => t.amountCents < 0 && (t.installment?.current ?? 1) <= 1).map((t) => t.date).sort();
  if (dates.length < 2) return true;
  return diffDays(dates[0], dates[dates.length - 1]) <= 35;
}

export function assignBills(transactions: ImportedTransaction[], singleDue: Day | null, cycle: BillCycle): Day[] {
  return transactions.map((t) => singleDue ?? cycle.dueDate(t.date));
}
