import { defaultListName, duplicateItems, newestFirst } from '$lib/core/shopping';
import { today } from '$lib/core/dates';
import { organizer } from '$lib/data/organizer.svelte';
import type { ShoppingList } from '$lib/data/organizerTypes';

/** Listas de compras: a mais nova primeiro; duplicar copia os itens desmarcados para uma lista nova. */
export const lists = () => newestFirst(organizer.shopping_lists);

export const itemsOf = (list: ShoppingList) => organizer.shopping_items.filter((item) => item.list_id === list.id).toSorted((a, b) => a.sort_order - b.sort_order);

export async function createList(name = defaultListName(today()), spaceId?: string): Promise<ShoppingList> {
  const [list] = await organizer.insert('shopping_lists', [{ name, done_at: null, total_cents: null }], spaceId);
  return list;
}

/** Nova lista no mesmo espaço, com os mesmos itens desmarcados. */
export async function duplicateList(source: ShoppingList, name = source.name): Promise<ShoppingList> {
  const list = await createList(name, source.household_id);
  await organizer.insert('shopping_items', duplicateItems(itemsOf(source)).map((item) => ({ ...item, list_id: list.id })));
  return list;
}

export async function finishList(list: ShoppingList, totalCents: number | null) {
  await organizer.update('shopping_lists', list.id, { done_at: new Date().toISOString(), total_cents: totalCents });
}

export const reopenList = (list: ShoppingList) => organizer.update('shopping_lists', list.id, { done_at: null });
