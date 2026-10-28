import { INVESTMENT } from '$lib/core/catalog';
import { store } from '$lib/data/store.svelte';
import type { Entry } from '$lib/data/types';

const mirrorKey = (sourceId: string, original: Entry) => `mirror:${sourceId}:${original.import_key || original.id}`;

/** Deixa as cópias no investimento iguais às aplicações/resgates da conta corrente acompanhada:
 *  cria as que faltam, acerta valor/data e apaga as órfãs. Retorna quantas criou. */
export async function reconcileMirrors(): Promise<number> {
  const inserts: Partial<Entry>[] = [];
  const deletes: string[] = [];
  const updates: { id: string; patch: Partial<Entry> }[] = [];
  const investmentIds = new Set(store.categories.filter((c) => c.key === INVESTMENT).map((c) => c.id));
  for (const tracker of store.accounts) {
    const mirrors = (store.entriesByAccount.get(tracker.id) ?? []).filter((e) => e.is_mirror);
    if (tracker.kind !== 'savings' || !tracker.investment_source_id) {
      deletes.push(...mirrors.map((m) => m.id));
      continue;
    }
    const sourceId = tracker.investment_source_id;
    const originals = (store.entriesByAccount.get(sourceId) ?? []).filter((e) => !e.is_mirror && e.category_id && investmentIds.has(e.category_id));
    const desired = new Map(originals.map((o) => [mirrorKey(sourceId, o), o]));
    const seen = new Set<string>();
    for (const mirror of mirrors) {
      const original = desired.get(mirror.import_key);
      if (!original || seen.has(mirror.import_key)) {
        deletes.push(mirror.id);
        continue;
      }
      seen.add(mirror.import_key);
      if (mirror.amount_cents !== -original.amount_cents || mirror.date !== original.date) {
        updates.push({ id: mirror.id, patch: { amount_cents: -original.amount_cents, date: original.date } });
      }
    }
    for (const [key, original] of desired) {
      if (seen.has(key)) continue;
      inserts.push({
        ...blankEntry(), account_id: tracker.id, date: original.date, amount_cents: -original.amount_cents, title: original.title,
        original_title: original.original_title, import_key: key, is_mirror: true, category_id: original.category_id,
        person_id: original.person_id, batch_id: original.batch_id
      });
    }
  }
  if (deletes.length) await store.remove('entries', deletes);
  if (updates.length) await store.updateMany('entries', updates);
  if (inserts.length) await store.insert('entries', inserts);
  return inserts.length;
}

export function blankEntry(): Omit<Entry, 'id' | 'household_id' | 'account_id' | 'date' | 'amount_cents'> {
  return {
    title: '', original_title: '', memo: '', notes: '', installment_current: 0, installment_total: 0, import_key: '',
    bank_category: '', user_edited: false, cost_type: '', bill_due_date: null, is_mirror: false, category_id: null,
    person_id: null, merchant_id: null, batch_id: null, created_at: new Date().toISOString()
  };
}
