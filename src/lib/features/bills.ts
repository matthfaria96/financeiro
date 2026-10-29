import { clampedDay, diffDays, monthOf, addMonths, today, type Day, type Month } from '$lib/core/dates';
import { fold } from '$lib/core/text';
import type { Bill, Entry } from '$lib/data/types';
import { costOf, kindOf } from './model';
import { byMonth, foldedTitle } from './entryIndex';

export type BillStatus = { type: 'paid'; date: Day } | { type: 'today' } | { type: 'upcoming'; days: number } | { type: 'overdue'; days: number };

export function statusLabel(status: BillStatus): string {
  switch (status.type) {
    case 'paid': return 'Pago';
    case 'today': return 'Hoje';
    case 'upcoming': return status.days === 1 ? 'Amanhã' : `em ${status.days} dias`;
    case 'overdue': return status.days === 1 ? 'Atrasada 1 dia' : `Atrasada ${status.days} dias`;
  }
}

export const dueDate = (bill: Bill, month: Month) => clampedDay(month, bill.day_of_month);

/** A conta vence neste mês? Mensais sempre; anuais só no mês delas. */
export const billInMonth = (bill: Bill, month: Month) => bill.frequency !== 'yearly' || Number(month.slice(5, 7)) === (bill.month_of_year ?? 1);

/** No cartão a conta já vem na fatura: não soma de novo no que falta pagar. */
export const onCard = (bill: Bill, cardAccount: boolean) => bill.method === 'card' || cardAccount;

export const methodName = { cash: 'Dinheiro', account: 'Débito / Pix / boleto', card: 'Cartão de crédito' } as const;
export const methodShort = { cash: 'Dinheiro', account: 'Conta', card: 'Cartão' } as const;
export const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function billPayment(bill: Bill, month: Month, entries: Entry[]): Entry | undefined {
  const pattern = fold(bill.match_pattern || bill.name);
  if (!pattern) return undefined;
  return byMonth(entries).get(month)?.find((e) => e.amount_cents < 0 && foldedTitle(e).includes(pattern));
}

export function billStatus(bill: Bill, month: Month, entries: Entry[]): BillStatus {
  const paid = billPayment(bill, month, entries);
  if (paid) return { type: 'paid', date: paid.date };
  const days = diffDays(today(), dueDate(bill, month));
  if (days === 0) return { type: 'today' };
  return days > 0 ? { type: 'upcoming', days } : { type: 'overdue', days: -days };
}

/** Gastos que se repetem em 2 dos últimos 3 meses com valor parecido (±15%): candidatos a conta fixa. */
export function recurringSuggestions(entries: Entry[], existing: Bill[]): { id: string; name: string; cents: number; day: number; categoryId: string | null }[] {
  const start = addMonths(monthOf(today()), -3);
  const known = existing.map((b) => fold(b.match_pattern || b.name));
  const recent = entries.filter((e) => monthOf(e.date) >= start && e.amount_cents < 0 && kindOf(e) === 'expense' && e.installment_total === 0 && !e.is_mirror);
  const groups = new Map<string, Entry[]>();
  for (const entry of recent) {
    const name = fold(entry.title);
    if (!name) continue;
    groups.set(name, [...(groups.get(name) ?? []), entry]);
  }
  const result: { id: string; name: string; cents: number; day: number; categoryId: string | null }[] = [];
  for (const [name, items] of groups) {
    if (known.some((k) => name.includes(k) || k.includes(name))) continue;
    if (new Set(items.map((i) => monthOf(i.date))).size < 2) continue;
    const amounts = items.map((i) => -i.amount_cents).sort((a, b) => a - b);
    const median = amounts[Math.floor(amounts.length / 2)];
    if (!amounts.every((a) => Math.abs(a - median) <= median * 0.15)) continue;
    const days = items.map((i) => Number(i.date.slice(8))).sort((a, b) => a - b);
    const sample = items.reduce((a, b) => (a.date > b.date ? a : b));
    result.push({ id: name, name: sample.title, cents: median, day: days[Math.floor(days.length / 2)], categoryId: sample.category_id });
  }
  return result.sort((a, b) => a.day - b.day);
}

export { costOf };
