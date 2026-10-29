import { defaultNotebooks, duplicateItems, newestFirst } from '$lib/core/shopping';
import { organizer } from '$lib/data/organizer.svelte';
import type { Notebook, ShoppingList } from '$lib/data/organizerTypes';

/** Cadernos de lista (Mercado, Farmácia…): a lista mais nova é a atual; as outras são o histórico. */
export const notebooks = () => organizer.notebooks.toSorted((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));

export const listsOf = (notebook: Notebook) => newestFirst(organizer.shopping_lists.filter((l) => l.notebook_id === notebook.id));
export const currentList = (notebook: Notebook): ShoppingList | undefined => listsOf(notebook)[0];

export const itemsOf = (list: ShoppingList) => organizer.shopping_items.filter((item) => item.list_id === list.id).toSorted((a, b) => a.sort_order - b.sort_order);

/** Listas antigas (sem caderno) vão para o caderno com o mesmo nome ou para o Mercado. */
export const lists = () => newestFirst(organizer.shopping_lists);

export async function createList(notebook: Notebook): Promise<ShoppingList> {
  const [list] = await organizer.insert('shopping_lists', [{ notebook_id: notebook.id, name: notebook.name, done_at: null, total_cents: null }]);
  return list;
}

/** Nova lista no caderno: com os itens que repetem da lista atual, ou vazia. A atual vira histórico. */
export async function newList(notebook: Notebook, keep: boolean): Promise<ShoppingList> {
  const current = currentList(notebook);
  if (current && !current.done_at) await organizer.update('shopping_lists', current.id, { done_at: new Date().toISOString() });
  const list = await createList(notebook);
  if (keep && current) await organizer.insert('shopping_items', duplicateItems(itemsOf(current)).map((item) => ({ ...item, list_id: list.id })));
  return list;
}

/** Na primeira vez: cria Mercado, Farmácia e Petshop e põe as listas soltas no Mercado. */
let ensuring = false;
export async function ensureNotebooks() {
  if (ensuring || !organizer.loadedFor || organizer.notebooks.length) return;
  ensuring = true;
  try {
    const created = await organizer.insert('notebooks', defaultNotebooks.map((n, index) => ({ ...n, sort_order: index })));
    const market = created[0];
    for (const list of organizer.shopping_lists.filter((l) => !l.notebook_id && l.household_id === market.household_id)) {
      await organizer.update('shopping_lists', list.id, { notebook_id: market.id });
    }
  } finally {
    ensuring = false;
  }
}

export const listPreview = (list: ShoppingList | undefined) => (list ? itemsOf(list) : []);
