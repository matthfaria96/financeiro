import { bankInfo } from '$lib/core/banks';
import { store } from '$lib/data/store.svelte';
import type { Account } from '$lib/data/types';
import { balanceOf } from './model';

/**
 * Contas agrupadas por banco (e por dono): "Nubank" = conta corrente + cartão + cartões virtuais.
 * Por baixo continuam separadas (a fatura do cartão precisa disso); na tela aparecem juntas.
 */
export interface BankGroup {
  key: string;
  name: string;
  accounts: Account[];
  /** Conta principal (corrente, senão a primeira) para o desenho do cartão. */
  main: Account;
  /** Dinheiro: contas correntes, investimentos e dinheiro do grupo. */
  balance: number;
  /** Em aberto nos cartões do grupo. */
  cardOpen: number;
  cards: number;
}

const order = { checking: 0, savings: 1, creditCard: 2, cash: 3 } as const;

export function bankGroups(accounts: Account[]): BankGroup[] {
  const map = new Map<string, Account[]>();
  for (const account of accounts) {
    const key = account.kind === 'cash' ? `cash:${account.id}` : account.bank === 'other' ? `other:${account.name}` : `${account.bank}:${account.default_person_id ?? ''}`;
    map.set(key, [...(map.get(key) ?? []), account]);
  }
  return [...map.entries()].map(([key, list]) => {
    const sorted = list.toSorted((a, b) => order[a.kind] - order[b.kind] || a.sort_order - b.sort_order);
    const main = sorted[0];
    const owner = main.default_person_id ? store.personById.get(main.default_person_id) : undefined;
    const base = main.kind === 'cash' || main.bank === 'other' ? main.name : bankInfo(main.bank).name;
    const name = owner && owner.role !== 'me' && owner.role !== 'house' && main.kind !== 'cash' ? `${base} (${owner.name})` : base;
    const cards = sorted.filter((a) => a.kind === 'creditCard');
    return {
      key, name, accounts: sorted, main,
      balance: sorted.filter((a) => a.kind !== 'creditCard').reduce((s, a) => s + balanceOf(a), 0),
      cardOpen: cards.reduce((s, a) => s + Math.max(0, -balanceOf(a)), 0),
      cards: cards.length
    };
  }).toSorted((a, b) => Math.min(...a.accounts.map((x) => x.sort_order)) - Math.min(...b.accounts.map((x) => x.sort_order)));
}

export const accountRole = (account: Account) =>
  account.kind === 'creditCard' ? (/virtual/i.test(account.name) ? 'Cartão virtual' : 'Cartão de crédito') : account.kind === 'savings' ? 'Investimento' : account.kind === 'cash' ? 'Dinheiro' : 'Conta corrente';
