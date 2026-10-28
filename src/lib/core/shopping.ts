import { dayMonth, type Day } from './dates';

/** "2 leite", "2x leite", "1,5 kg carne", "3 un pão" → quantidade e nome. */
export function parseItem(text: string): { name: string; quantity: string } {
  const clean = text.trim().replace(/\s+/g, ' ');
  const match = clean.match(/^(\d+(?:[.,]\d+)?\s*(?:x|un|und|kg|g|l|ml|pct|pcts|cx|dz)?)\.?\s+(.+)$/i);
  if (!match) return { name: capitalize(clean), quantity: '' };
  return { name: capitalize(match[2]), quantity: match[1].replace(/\s+/g, ' ').toLowerCase() };
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const defaultListName = (day: Day) => `Mercado · ${dayMonth(day)}`;

/** Itens da próxima lista: os mesmos, desmarcados e na mesma ordem. */
export function duplicateItems<T extends { name: string; quantity: string; sort_order: number }>(items: T[]): { name: string; quantity: string; checked: boolean; sort_order: number }[] {
  return items
    .toSorted((a, b) => a.sort_order - b.sort_order)
    .map((item, index) => ({ name: item.name, quantity: item.quantity, checked: false, sort_order: index }));
}

/** A lista mais nova primeiro (a aberta mais recente fica no topo). */
export function newestFirst<T extends { created_at: string }>(lists: T[]): T[] {
  return lists.toSorted((a, b) => b.created_at.localeCompare(a.created_at));
}
