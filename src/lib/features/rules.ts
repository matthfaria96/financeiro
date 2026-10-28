import { Categorizer, defaultKeywords, type Suggestion, type UserRule } from '$lib/core/categorizer';
import type { CategoryKind } from '$lib/core/catalog';
import { displayName, fold } from '$lib/core/text';
import { store } from '$lib/data/store.svelte';
import type { Entry, Merchant } from '$lib/data/types';
import { reconcileMirrors } from './mirrors';

export const patternList = (merchant: Merchant) => merchant.patterns.split(',').map((p) => p.trim()).filter(Boolean);

export const matchKey = (category: { key: string; id: string }) => category.key || category.id;

/** Categorizador com as palavras-chave do catálogo + extras das categorias + estabelecimentos. */
export function makeCategorizer(): Categorizer {
  const keywords = defaultKeywords();
  const kinds: Record<string, CategoryKind> = {};
  for (const category of store.categories) {
    kinds[matchKey(category)] = category.kind;
    const extra = category.extra_keywords.split(',').map((w) => w.trim()).filter(Boolean);
    if (extra.length) keywords[matchKey(category)] = [...(keywords[matchKey(category)] ?? []), ...extra];
  }
  const rules: UserRule[] = store.merchants.flatMap((merchant) =>
    patternList(merchant).map((pattern) => {
      const category = merchant.category_id ? store.categoryById.get(merchant.category_id) : undefined;
      return { id: merchant.id, pattern, categoryKey: category ? matchKey(category) : null, personId: merchant.person_id, rename: merchant.rename_to || null };
    })
  );
  return new Categorizer(rules, keywords, kinds);
}

export const merchantIdOf = (suggestion: Suggestion) => (suggestion.source.type === 'rule' ? suggestion.source.id : null);

export const suggestedPattern = (entry: Entry) => displayName(entry.original_title);

/** Aplica um estabelecimento aos lançamentos não corrigidos à mão que tenham um dos trechos. */
export async function applyMerchant(merchant: Merchant, except?: string): Promise<number> {
  const patterns = patternList(merchant).map(fold).filter(Boolean);
  if (!patterns.length) return 0;
  const patches = store.entries
    .filter((e) => e.id !== except && !e.user_edited && !e.is_mirror && patterns.some((p) => fold(`${e.original_title} ${e.memo}`).includes(p)))
    .map((e) => ({
      id: e.id,
      patch: {
        merchant_id: merchant.id,
        ...(merchant.category_id ? { category_id: merchant.category_id } : {}),
        ...(merchant.person_id ? { person_id: merchant.person_id } : {}),
        ...(merchant.rename_to ? { title: merchant.rename_to } : {})
      }
    }));
  await store.updateMany('entries', patches);
  await reconcileMirrors();
  return patches.length;
}

/** Corrigiu e pediu "lembrar": o estabelecimento passa a reconhecer o trecho e os parecidos mudam juntos. */
export async function learn(entry: Entry, pattern: string): Promise<number> {
  const trimmed = pattern.trim();
  if (!trimmed) return 0;
  const folded = fold(trimmed);
  let merchant = entry.merchant_id ? store.merchantById.get(entry.merchant_id) : undefined;
  merchant ??= store.merchants.find((m) => patternList(m).some((p) => fold(p) === folded));
  const rename = entry.title !== displayName(entry.original_title) ? entry.title : '';
  if (!merchant) {
    [merchant] = await store.insert('merchants', [{
      key: '', name: entry.title, patterns: trimmed, image_url: '', image_data: '', is_logo: false, website: '', emoji: '',
      color: colorFor(entry.title), cost_type: '', rename_to: rename, category_id: entry.category_id, person_id: entry.person_id
    }]);
  } else {
    const patterns = patternList(merchant).some((p) => fold(p) === folded) ? merchant.patterns : [...patternList(merchant), trimmed].join(', ');
    await store.update('merchants', merchant.id, { patterns, category_id: entry.category_id, person_id: entry.person_id ?? merchant.person_id, ...(rename ? { rename_to: rename } : {}) });
    merchant = store.merchantById.get(merchant.id)!;
  }
  await store.update('entries', entry.id, { merchant_id: merchant.id });
  return applyMerchant(merchant, entry.id);
}

/** Recategoriza o que o usuário não corrigiu à mão. Sem pista nova, mantém o que está. */
export async function reapplyAll(): Promise<number> {
  const categorizer = makeCategorizer();
  const patches: { id: string; patch: Partial<Entry> }[] = [];
  for (const entry of store.entries) {
    if (entry.user_edited || entry.is_mirror) continue;
    const suggestion = categorizer.suggest(entry.original_title, entry.memo, entry.amount_cents, entry.bank_category || undefined);
    if (suggestion.source.type === 'none') continue;
    const category = store.categoryByKey.get(suggestion.categoryKey);
    const merchantId = merchantIdOf(suggestion);
    const patch: Partial<Entry> = {};
    if (category && category.id !== entry.category_id) patch.category_id = category.id;
    if (suggestion.personId && suggestion.personId !== entry.person_id) patch.person_id = suggestion.personId;
    if (merchantId && merchantId !== entry.merchant_id) patch.merchant_id = merchantId;
    if (Object.keys(patch).length) patches.push({ id: entry.id, patch });
  }
  await store.updateMany('entries', patches);
  await reconcileMirrors();
  return patches.length;
}

const palette = ['#38D9F5', '#FF9F1C', '#FFD60A', '#7C8CF8', '#FF6B6B', '#E056FD', '#2EC4B6', '#A3D977', '#FF8FAB', '#B388FF', '#4FC3F7', '#F4D35E', '#26A69A', '#64B5F6'];
export function colorFor(name: string): string {
  let sum = 0;
  for (const char of name) sum = (sum + char.codePointAt(0)!) | 0;
  return palette[Math.abs(sum) % palette.length];
}
