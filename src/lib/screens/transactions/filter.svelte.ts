import { addMonths, monthOf, today, type Month } from '$lib/core/dates';
import { spendMonth } from '$lib/features/analytics';
import { fold } from '$lib/core/text';
import type { CostType } from '$lib/core/catalog';
import { store } from '$lib/data/store.svelte';
import type { Entry } from '$lib/data/types';
import { categoryOf, costOf, fullName, inScope, isUncategorized, kindOf } from '$lib/features/model';

export type Period = 'today' | 'thisMonth' | 'lastMonth' | 'last3' | 'thisYear' | 'all' | 'range';
export const periodName: Record<Period, string> = { today: 'Hoje', thisMonth: 'Este mês', lastMonth: 'Mês passado', last3: 'Últimos 3 meses', thisYear: 'Este ano', all: 'Tudo', range: 'De… até…' };
export type EntryType = 'income' | 'expense' | 'transfer';
export const typeName: Record<EntryType, string> = { income: 'Entradas', expense: 'Saídas', transfer: 'Transferências' };

/** Filtros da tela de lançamentos (também usados ao abrir a partir de relatórios e contas). */
class Filter {
  search = $state('');
  period = $state<Period>('thisMonth');
  month = $state<Month | null>(null);
  categoryId = $state<string | null>(null);
  accountId = $state<string | null>(null);
  personId = $state<string | null>(null);
  cost = $state<CostType | null>(null);
  uncategorized = $state(false);
  type = $state<EntryType | null>(null);
  /** Intervalo "de … até …" (dias, inclusive). */
  from = $state('');
  to = $state('');

  get active() {
    return !!(this.categoryId || this.accountId || this.personId || this.cost || this.uncategorized || this.month || this.type || this.period !== 'thisMonth');
  }

  reset() {
    Object.assign(this, { period: 'thisMonth', month: null, categoryId: null, accountId: null, personId: null, cost: null, uncategorized: false, type: null, from: '', to: '' });
  }

  /** Abre a lista já filtrada (relatórios, contas). */
  set(values: Partial<Pick<Filter, 'period' | 'month' | 'categoryId' | 'accountId' | 'personId' | 'cost' | 'uncategorized' | 'type' | 'from' | 'to'>>) {
    this.reset();
    Object.assign(this, values);
  }

  matches(entry: Entry): boolean {
    return this.matcher()(entry);
  }

  /** O teste de cada lançamento, com o que é igual para todos (hoje, a busca dobrada) calculado uma vez só. */
  matcher(): (entry: Entry) => boolean {
    const { month: chosen, period, from, to, categoryId, accountId, type, personId, cost, uncategorized } = this;
    const day = today();
    const now = monthOf(day);
    const last = addMonths(now, -1);
    const last3 = addMonths(now, -2);
    const query = fold(this.search);
    const texts = query ? searchTexts() : null;
    return (entry) => {
      if (!inScope(entry)) return false;
      // Cópia automática no investimento só aparece olhando a conta do investimento.
      if (entry.is_mirror && accountId !== entry.account_id) return false;
      // Mesmo mês das outras telas: no cartão, o da fatura (ou o da compra, na visão "pelo dia da compra").
      const month = spendMonth(entry) ?? monthOf(entry.date);
      if (chosen) {
        if (month !== chosen) return false;
      } else if (period === 'today' && entry.date !== day) return false;
      else if (period === 'range' && ((from && entry.date < from) || (to && entry.date > to))) return false;
      else if (period === 'thisMonth' && month !== now) return false;
      else if (period === 'lastMonth' && month !== last) return false;
      else if (period === 'last3' && month < last3) return false;
      else if (period === 'thisYear' && entry.date.slice(0, 4) !== now.slice(0, 4)) return false;
      if (categoryId) {
        const category = categoryOf(entry);
        if (category?.id !== categoryId && category?.parent_id !== categoryId) return false;
      }
      if (accountId && entry.account_id !== accountId) return false;
      if (type && kindOf(entry) !== type) return false;
      if (personId && entry.person_id !== personId) return false;
      if (cost && (kindOf(entry) !== 'expense' || costOf(entry) !== cost)) return false;
      if (uncategorized && !isUncategorized(entry)) return false;
      if (texts && !texts(entry).includes(query)) return false;
      return true;
    };
  }
}

// Texto de busca de cada lançamento (título, original, observação, categoria e estabelecimento), dobrado uma vez
// por objeto; recomeça quando categorias ou estabelecimentos mudam.
let textsFor: [unknown, unknown] = [null, null];
let texts = new WeakMap<Entry, string>();
function searchTexts(): (entry: Entry) => string {
  if (textsFor[0] !== store.categoryById || textsFor[1] !== store.merchantById) {
    textsFor = [store.categoryById, store.merchantById];
    texts = new WeakMap();
  }
  const cache = texts;
  return (entry) => {
    let text = cache.get(entry);
    if (text === undefined) {
      const merchant = entry.merchant_id ? store.merchantById.get(entry.merchant_id)?.name ?? '' : '';
      cache.set(entry, (text = fold(`${entry.title} ${entry.original_title} ${entry.notes} ${fullName(categoryOf(entry))} ${merchant}`)));
    }
    return text;
  };
}

export const filter = new Filter();
