import { monthOf, type Month } from '$lib/core/dates';
import { fold } from '$lib/core/text';
import type { Entry } from '$lib/data/types';
import { memo } from './memo';

/** Agrupa mantendo a ordem da lista (chave nula fica de fora). */
export function groupBy<K>(entries: Entry[], keyOf: (entry: Entry) => K | null | undefined): Map<K, Entry[]> {
  const map = new Map<K, Entry[]>();
  for (const entry of entries) {
    const key = keyOf(entry);
    if (key === null || key === undefined) continue;
    const list = map.get(key);
    if (list) list.push(entry);
    else map.set(key, [entry]);
  }
  return map;
}

/** Lançamentos por mês da data, na ordem da lista (calculado uma vez por lista). */
export function byMonth(entries: Entry[]): Map<Month, Entry[]> {
  return memo(entries, 'byMonth', [], () => groupBy(entries, (e) => monthOf(e.date)));
}

// Os lançamentos não mudam no lugar (cada edição cria um objeto novo), então o texto dobrado vale pelo objeto.
const folded = new WeakMap<Entry, string>();

/** Título + título original sem acento e em minúsculas (para casar com o "texto no extrato" das contas fixas). */
export function foldedTitle(entry: Entry): string {
  let text = folded.get(entry);
  if (text === undefined) folded.set(entry, (text = fold(`${entry.title} ${entry.original_title}`)));
  return text;
}
