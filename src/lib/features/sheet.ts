import { CARD_PAYMENT, UNCATEGORIZED } from '$lib/core/catalog';
import { addMonths, clampedDay, lastDay, monthOf, parts, today, type Day, type Month } from '$lib/core/dates';
import { buildSheet, type SheetItem } from '$lib/core/sheet';
import { fold } from '$lib/core/text';
import { store } from '$lib/data/store.svelte';
import type { Account, Entry } from '$lib/data/types';
import { accountOf, balanceOf, billDueOf, categoryOf, kindOf, rootOf } from './model';

/**
 * A aba "Financeiro" da planilha do usuário, montada com os lançamentos: por mês, o que entrou, o que saiu
 * no crédito (no mês da fatura, que é quando se paga) e no débito (conta e dinheiro), o balanço e o saldo.
 * Meses futuros mostram o que já está comprometido no cartão (faturas e parcelas a vencer).
 */
export type SheetGrouping = 'category' | 'person';
export type CreditMonth = 'bill' | 'purchase';

export interface Label {
  name: string;
  color: string;
}

const uncategorized: Label = { name: 'Sem categoria', color: '#78909C' };

function categoryKeys(entry: Entry): { root: string; leaf: string; labels: [Label, Label] } {
  const leaf = categoryOf(entry);
  const root = rootOf(leaf);
  if (!leaf || !root || leaf.key === UNCATEGORIZED) return { root: 'none', leaf: 'none', labels: [uncategorized, uncategorized] };
  return { root: root.id, leaf: leaf.id, labels: [{ name: root.name, color: root.color }, { name: leaf.parent_id ? leaf.name : `${leaf.name} (geral)`, color: leaf.color }] };
}

export function monthRange(count: number, future: number): Month[] {
  const now = monthOf(today());
  return Array.from({ length: count + future }, (_, index) => addMonths(now, index - count + 1));
}

export function sheetData(entries: Entry[], accounts: Account[], months: Month[], grouping: SheetGrouping, creditMonth: CreditMonth) {
  const labels = new Map<string, Label>();
  const items: SheetItem[] = [];
  const keys = (entry: Entry): [string, string] => {
    const c = categoryKeys(entry);
    labels.set(c.root, c.labels[0]);
    labels.set(`${c.root}/${c.leaf}`, c.labels[1]);
    if (grouping === 'category') return [c.root, `${c.root}/${c.leaf}`];
    const person = entry.person_id ? store.personById.get(entry.person_id) : undefined;
    const id = person?.id ?? 'nobody';
    labels.set(id, person ? { name: person.name, color: person.color } : { name: 'Sem dono', color: '#78909C' });
    labels.set(`${id}/${c.root}`, c.labels[0]);
    return [id, `${id}/${c.root}`];
  };

  for (const entry of entries) {
    if (entry.is_mirror) continue;
    const kind = accountOf(entry)?.kind;
    const category = kindOf(entry);
    if (kind === 'checking' || kind === 'cash') {
      if (category === 'transfer' || categoryOf(entry)?.key === CARD_PAYMENT) continue;
      const [group, sub] = keys(entry);
      if (category === 'income') items.push({ month: monthOf(entry.date), section: 'income', group, sub, cents: entry.amount_cents });
      else items.push({ month: monthOf(entry.date), section: 'debit', group, sub, cents: -entry.amount_cents });
    } else if (kind === 'creditCard' && category === 'expense') {
      const due = billDueOf(entry);
      const [group, sub] = keys(entry);
      items.push({ month: monthOf(creditMonth === 'bill' && due ? due : entry.date), section: 'credit', group, sub, cents: -entry.amount_cents });
    }
  }
  if (creditMonth === 'bill') items.push(...futureInstallmentItems(entries, accounts, keys));

  const sheet = buildSheet(items, months);
  const now = today();
  const cashAccounts = accounts.filter((a) => a.kind === 'checking' || a.kind === 'cash');
  const invested = accounts.filter((a) => a.kind === 'savings');
  const endOf = (month: Month, list: Account[]): number | null => {
    if (`${month}-01` > now) return null;
    const end: Day = lastDay(month) < now ? lastDay(month) : now;
    return list.reduce((sum, account) => sum + balanceOf(account, end), 0);
  };
  // Mês futuro ainda não tem entradas: o balanço dele seria só a fatura, o que engana.
  const balance = new Map(months.map((m) => [m, monthStatus(m) === 'future' ? null : sheet.balance.get(m) ?? 0]));
  return {
    sheet,
    balance,
    labels,
    endBalance: new Map(months.map((m) => [m, endOf(m, cashAccounts)])),
    endInvested: new Map(months.map((m) => [m, invested.length ? endOf(m, invested) : null]))
  };
}

/** Parcelas que ainda não estão em nenhuma fatura importada, cada uma no mês em que vence. */
function futureInstallmentItems(entries: Entry[], accounts: Account[], keys: (entry: Entry) => [string, string]): SheetItem[] {
  const scoped = new Set(entries.map((e) => e.id));
  const items: SheetItem[] = [];
  for (const card of accounts.filter((a) => a.kind === 'creditCard')) {
    const cardEntries = (store.entriesByAccount.get(card.id) ?? []).filter((e) => scoped.has(e.id) && !e.is_mirror && kindOf(e) === 'expense');
    const latestDue = cardEntries.map(billDueOf).filter((d): d is Day => d !== null).sort().pop();
    if (!latestDue) continue;
    const newest = new Map<string, Entry>();
    for (const entry of cardEntries.filter((e) => e.installment_total > 1 && billDueOf(e))) {
      const key = `${fold(entry.original_title)}|${Math.trunc(entry.amount_cents / 100)}|${entry.installment_total}`;
      const current = newest.get(key);
      if (!current || current.installment_current < entry.installment_current) newest.set(key, entry);
    }
    for (const entry of newest.values()) {
      const due = billDueOf(entry)!;
      const [group, sub] = keys(entry);
      for (let number = entry.installment_current + 1; number <= entry.installment_total; number++) {
        const day = clampedDay(addMonths(monthOf(due), number - entry.installment_current), parts(due).day);
        if (day > latestDue) items.push({ month: monthOf(day), section: 'credit', group, sub, cents: -entry.amount_cents });
      }
    }
  }
  return items;
}

/** ✅ fechado, ⭐ atual, 🟡 previsto (como na planilha). */
export function monthStatus(month: Month): 'closed' | 'current' | 'future' {
  const now = monthOf(today());
  return month < now ? 'closed' : month === now ? 'current' : 'future';
}
