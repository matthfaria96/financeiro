import { monthReport, type MonthReport } from '$lib/core/reports';
import { UNCATEGORIZED } from '$lib/core/catalog';
import type { Month } from '$lib/core/dates';
import { store } from '$lib/data/store.svelte';
import type { Entry } from '$lib/data/types';
import { accountOf, categoryOf, kindOf, rootOf } from './model';
import { matchKey } from './rules';
import { bankColor } from '$lib/ui/look';

export type Grouping = 'category' | 'person' | 'account' | 'workspace';
export const groupingName: Record<Grouping, string> = { category: 'Por categoria', person: 'Por pessoa', account: 'Por conta', workspace: 'Por área' };

export interface GroupInfo {
  name: string;
  color: string;
  symbol: string;
}

/** Relatório do mês no agrupamento escolhido, com nome/cor/ícone de cada fatia. */
export function groupedReport(entries: Entry[], month: Month, grouping: Grouping, flow: 'expenses' | 'income'): { report: MonthReport; info: Map<string, GroupInfo> } {
  const info = new Map<string, GroupInfo>();
  const items = entries.filter((e) => !e.is_mirror).map((entry) => {
    const [id, group] = groupOf(entry, grouping);
    if (!info.has(id)) info.set(id, group);
    return { date: entry.date, amountCents: entry.amount_cents, groupId: id, kind: kindOf(entry) };
  });
  return { report: monthReport(month, items, flow), info };
}

function groupOf(entry: Entry, grouping: Grouping): [string, GroupInfo] {
  const none = (name: string): [string, GroupInfo] => ['none', { name, color: '#78909C', symbol: 'questionmark.circle' }];
  if (grouping === 'category') {
    const root = rootOf(categoryOf(entry));
    return root ? [matchKey(root), { name: root.name, color: root.color, symbol: root.symbol }] : [UNCATEGORIZED, { name: 'Outros', color: '#78909C', symbol: 'questionmark.circle' }];
  }
  if (grouping === 'person') {
    const person = entry.person_id ? store.personById.get(entry.person_id) : undefined;
    return person ? [person.id, { name: person.name, color: person.color, symbol: 'person' }] : none('Sem dono');
  }
  if (grouping === 'account') {
    const account = accountOf(entry);
    return account ? [account.id, { name: account.name, color: account.color || bankColor(account), symbol: 'card' }] : none('Sem conta');
  }
  const workspace = accountOf(entry)?.workspace_id ? store.workspaceById.get(accountOf(entry)!.workspace_id!) : undefined;
  return workspace ? [workspace.id, { name: workspace.name, color: workspace.color, symbol: workspace.symbol }] : none('Sem área');
}

/** Subcategorias de uma categoria principal no mês. */
export function subReport(entries: Entry[], rootKey: string, month: Month, flow: 'expenses' | 'income') {
  const info = new Map<string, GroupInfo>();
  const items = entries
    .filter((e) => !e.is_mirror && rootOf(categoryOf(e)) && matchKey(rootOf(categoryOf(e))!) === rootKey)
    .map((entry) => {
      const leaf = categoryOf(entry)!;
      const id = matchKey(leaf);
      if (!info.has(id)) info.set(id, { name: leaf.parent_id ? leaf.name : `${leaf.name} (geral)`, color: leaf.color, symbol: leaf.symbol });
      return { date: entry.date, amountCents: entry.amount_cents, groupId: id, kind: kindOf(entry) };
    });
  return { report: monthReport(month, items, flow), info };
}
