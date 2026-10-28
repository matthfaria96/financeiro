import type { Account } from '$lib/data/types';
import { bankInfo } from '$lib/core/banks';

/** Cores de cada banco (desenho próprio, sem logotipos). */
export function bankGradient(account: Pick<Account, 'bank' | 'kind' | 'color'>): [string, string] {
  if (account.kind === 'cash') return ['#3FA66B', '#1F6B43'];
  if (account.color) return [account.color, account.color + 'B3'];
  return bankInfo(account.bank).colors;
}

/** Cor do texto e do brilho do cartão: bancos de fundo claro (BB, Will) pedem texto escuro. */
export function bankInk(account: Pick<Account, 'bank' | 'kind' | 'color'>): { ink: string; accent: string } {
  if (account.kind === 'cash' || account.color) return { ink: '#FFFFFF', accent: 'rgba(255,255,255,0.1)' };
  const { ink, accent } = bankInfo(account.bank);
  return { ink, accent };
}

export const bankColor = (account: Pick<Account, 'bank' | 'kind' | 'color'>) => bankGradient(account)[0];

export function initials(name: string): string {
  const words = name.split(' ').filter((word) => /^[\p{L}\p{N}]/u.test(word));
  return (words.slice(0, 2).map((word) => word[0]).join('') || '?').toUpperCase();
}

export const kindName = { checking: 'Conta corrente', creditCard: 'Cartão de crédito', savings: 'Investimento / caixinha', cash: 'Dinheiro' } as const;
export const kindShort = { checking: 'Conta', creditCard: 'Cartão', savings: 'Investimento', cash: 'Dinheiro' } as const;
export const kindIcon = { checking: 'bank', creditCard: 'card', savings: 'invest', cash: 'cash' } as const;
export const roleName = { me: 'Eu', partner: 'Cônjuge', child: 'Filho(a)', house: 'Casa (de todos)', other: 'Outro' } as const;
export const roleIcon = { me: 'person', partner: 'heart', child: 'child', house: 'house', other: 'people' } as const;

export const palette = ['#38D9F5', '#FF9F1C', '#FFD60A', '#7C8CF8', '#FF6B6B', '#E056FD', '#2EC4B6', '#A3D977', '#FF8FAB', '#B388FF', '#4FC3F7', '#F4D35E', '#26A69A', '#64B5F6', '#9E9E9E'];
