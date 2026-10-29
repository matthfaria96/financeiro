import { addMonths, monthOf, today, type Month } from '$lib/core/dates';
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
    if (!inScope(entry)) return false;
    // Cópia automática no investimento só aparece olhando a conta do investimento.
    if (entry.is_mirror && this.accountId !== entry.account_id) return false;
    const month = monthOf(entry.date);
    const now = monthOf(today());
    if (this.month) {
      if (month !== this.month) return false;
    } else if (this.period === 'today' && entry.date !== today()) return false;
    else if (this.period === 'range' && ((this.from && entry.date < this.from) || (this.to && entry.date > this.to))) return false;
    else if (this.period === 'thisMonth' && month !== now) return false;
    else if (this.period === 'lastMonth' && month !== addMonths(now, -1)) return false;
    else if (this.period === 'last3' && month < addMonths(now, -2)) return false;
    else if (this.period === 'thisYear' && entry.date.slice(0, 4) !== now.slice(0, 4)) return false;
    if (this.categoryId) {
      const category = categoryOf(entry);
      if (category?.id !== this.categoryId && category?.parent_id !== this.categoryId) return false;
    }
    if (this.accountId && entry.account_id !== this.accountId) return false;
    if (this.type && kindOf(entry) !== this.type) return false;
    if (this.personId && entry.person_id !== this.personId) return false;
    if (this.cost && (kindOf(entry) !== 'expense' || costOf(entry) !== this.cost)) return false;
    if (this.uncategorized && !isUncategorized(entry)) return false;
    const query = fold(this.search);
    if (query) {
      const merchant = entry.merchant_id ? store.merchantById.get(entry.merchant_id)?.name ?? '' : '';
      if (!fold(`${entry.title} ${entry.original_title} ${entry.notes} ${fullName(categoryOf(entry))} ${merchant}`).includes(query)) return false;
    }
    return true;
  }
}

export const filter = new Filter();
