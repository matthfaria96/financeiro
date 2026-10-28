import { futureInstallments, type FutureInstallment } from '$lib/core/forecast';
import type { Day } from '$lib/core/dates';
import { store } from '$lib/data/store.svelte';
import type { Account, Entry } from '$lib/data/types';
import { billDueOf, kindOf } from './model';

/** Uma fatura (cartão + vencimento): compras importadas e parcelas previstas. */
export interface PayableGroup {
  account: Account;
  due: Day;
  entries: Entry[];
  installments: FutureInstallment[];
  imported: number;
  projected: number;
}

export function payableGroups(cards: Account[]): PayableGroup[] {
  const groups: PayableGroup[] = [];
  for (const card of cards) {
    const entries = (store.entriesByAccount.get(card.id) ?? []).filter((e) => !e.is_mirror && kindOf(e) === 'expense');
    const byDue = new Map<Day, Entry[]>();
    for (const entry of entries) {
      const due = billDueOf(entry) ?? entry.date;
      byDue.set(due, [...(byDue.get(due) ?? []), entry]);
    }
    const latest = [...byDue.keys()].sort().pop() ?? '';
    const installments = futureInstallments(
      entries.filter((e) => e.installment_total > 1).map((e) => ({ title: e.original_title, cents: e.amount_cents, installment: { current: e.installment_current, total: e.installment_total }, due: billDueOf(e)! }))
    ).filter((f) => f.due > latest);
    const map = new Map<Day, PayableGroup>();
    const group = (due: Day) => map.get(due) ?? map.set(due, { account: card, due, entries: [], installments: [], imported: 0, projected: 0 }).get(due)!;
    for (const [due, items] of byDue) {
      const g = group(due);
      g.entries = items.sort((a, b) => b.date.localeCompare(a.date));
      g.imported = -items.reduce((s, e) => s + e.amount_cents, 0);
    }
    for (const item of installments) {
      const g = group(item.due);
      g.installments.push(item);
      g.projected -= item.cents;
    }
    groups.push(...map.values());
  }
  return groups.sort((a, b) => a.due.localeCompare(b.due) || a.account.name.localeCompare(b.account.name));
}
