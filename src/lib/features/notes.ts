import { store } from '$lib/data/store.svelte';
import { notebooks } from './shopping';

/** Os cartões das Notas: cada caderno de lista, a Lista de desejos e o Transporte, na ordem escolhida. */
export interface NoteCard {
  key: string;
  name: string;
  emoji: string;
  notebookId?: string;
}

export function allNoteCards(): NoteCard[] {
  const cards: NoteCard[] = [
    ...notebooks().map((n) => ({ key: `nb:${n.id}`, name: n.name, emoji: n.emoji, notebookId: n.id })),
    { key: 'desejos', name: 'Lista de desejos', emoji: '⭐' },
    { key: 'transporte', name: 'Transporte', emoji: '🚗' }
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
