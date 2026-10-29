import { store } from '$lib/data/store.svelte';
import { notebooks } from './shopping';
import { organizer } from '$lib/data/organizer.svelte';
import { defaultNotebooks } from '$lib/core/shopping';

/** Os cartões das Notas: cada caderno de lista, a Lista de desejos e o Transporte, na ordem escolhida. */
export interface NoteCard {
  key: string;
  name: string;
  emoji: string;
  color: string;
  notebookId?: string;
}

export function allNoteCards(): NoteCard[] {
  const cards: NoteCard[] = [
    ...notebooks().map((n) => ({ key: `nb:${n.id}`, name: n.name, emoji: n.emoji, color: n.color, notebookId: n.id })),
    { key: 'desejos', name: 'Lista de desejos', emoji: '⭐', color: '#38D9F5' },
    { key: 'transporte', name: 'Transporte', emoji: '🚗', color: '#FF9F1C' }
  ];
  const order = store.household?.settings.notes_order ?? [];
  const rank = (key: string) => {
    const at = order.indexOf(key);
    return at < 0 ? order.length + cards.findIndex((c) => c.key === key) : at;
  };
  return cards.toSorted((a, b) => rank(a.key) - rank(b.key));
}

export const hiddenNotes = () => store.household?.settings.notes_hidden ?? [];
export const visibleNoteCards = () => allNoteCards().filter((c) => !hiddenNotes().includes(c.key));

export function setNoteVisible(key: string, visible: boolean) {
  const hidden = hiddenNotes();
  void store.updateSettings({ notes_hidden: visible ? hidden.filter((h) => h !== key) : [...new Set([...hidden, key])] });
}

export function moveNote(key: string, delta: -1 | 1) {
  const keys = allNoteCards().map((c) => c.key);
  const at = keys.indexOf(key);
  const to = at + delta;
  if (at < 0 || to < 0 || to >= keys.length) return;
  [keys[at], keys[to]] = [keys[to], keys[at]];
  void store.updateSettings({ notes_order: keys });
}

/**
 * Cadernos do sistema (os que o app cria sozinho) não podem ser apagados; os criados pela pessoa, sim.
 * Os ids ficam guardados nas configurações; antes disso, valem os mais antigos com os nomes padrão.
 */
export function systemNotebookIds(): string[] {
  const saved = store.household?.settings.notes_system;
  if (saved?.length) return saved;
  const oldest = notebooks().toSorted((a, b) => a.created_at.localeCompare(b.created_at));
  return defaultNotebooks.map((d) => oldest.find((n) => n.name === d.name)?.id).filter((id): id is string => !!id);
}

/** Grava quais são os do sistema na primeira vez (depois disso, renomear não tira a proteção). */
export function rememberSystemNotebooks() {
  if (store.demo || store.household?.settings.notes_system?.length) return;
  const ids = systemNotebookIds();
  if (ids.length) void store.updateSettings({ notes_system: ids });
}

export const isSystemCard = (card: NoteCard) => !card.notebookId || systemNotebookIds().includes(card.notebookId);

export async function deleteNotebook(id: string) {
  await organizer.remove('notebooks', [id]);
  const key = `nb:${id}`;
  await store.updateSettings({ notes_order: (store.household?.settings.notes_order ?? []).filter((k) => k !== key), notes_hidden: hiddenNotes().filter((k) => k !== key) });
}
