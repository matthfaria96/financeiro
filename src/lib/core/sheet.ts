import type { Month } from './dates';

/** A planilha "mês a mês": entradas, saídas no crédito (pelo mês da fatura) e no débito, por grupo e subgrupo. */
export type SheetSection = 'income' | 'credit' | 'debit';

export interface SheetItem {
  month: Month;
  section: SheetSection;
  group: string;
  sub: string;
  cents: number;
}

export interface SheetRow {
  key: string;
  total: Map<Month, number>;
  sum: number;
  children: SheetRow[];
}

export interface Sheet {
  sections: Record<SheetSection, SheetRow>;
  /** Entradas − (crédito + débito), por mês. */
  balance: Map<Month, number>;
  spent: Map<Month, number>;
}

function row(key: string): SheetRow {
  return { key, total: new Map(), sum: 0, children: [] };
}

function add(target: SheetRow, month: Month, cents: number) {
  target.total.set(month, (target.total.get(month) ?? 0) + cents);
  target.sum += cents;
}

/** Agrupa os itens nos meses pedidos; grupos e subgrupos em ordem do maior para o menor no período. */
export function buildSheet(items: SheetItem[], months: Month[]): Sheet {
  const wanted = new Set(months);
  const sections = { income: row('income'), credit: row('credit'), debit: row('debit') };
  for (const item of items) {
    if (!wanted.has(item.month) || !item.cents) continue;
    const section = sections[item.section];
    let group = section.children.find((child) => child.key === item.group);
    if (!group) section.children.push((group = row(item.group)));
    let sub = group.children.find((child) => child.key === item.sub);
    if (!sub) group.children.push((sub = row(item.sub)));
    add(section, item.month, item.cents);
    add(group, item.month, item.cents);
    add(sub, item.month, item.cents);
  }
  const sortRows = (rows: SheetRow[]) => {
    rows.sort((a, b) => b.sum - a.sum);
    rows.forEach((child) => sortRows(child.children));
  };
  Object.values(sections).forEach((section) => sortRows(section.children));
  const spent = new Map<Month, number>();
  const balance = new Map<Month, number>();
  for (const month of months) {
    const out = (sections.credit.total.get(month) ?? 0) + (sections.debit.total.get(month) ?? 0);
    spent.set(month, out);
    balance.set(month, (sections.income.total.get(month) ?? 0) - out);
  }
  return { sections, balance, spent };
}

/** Planilha em CSV (ponto e vírgula, vírgula decimal, BOM para o Excel). */
export function sheetCSV(header: string[], rows: { label: string; values: (number | null)[] }[]): string {
  const cell = (text: string) => (/[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);
  const value = (cents: number | null) => (cents === null ? '' : (cents / 100).toFixed(2).replace('.', ','));
  const lines = [header.map(cell).join(';'), ...rows.map((r) => [cell(r.label), ...r.values.map(value)].join(';'))];
  return '﻿' + lines.join('\r\n');
}
