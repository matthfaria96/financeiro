import type { Account } from '$lib/data/types';

/** Cores de cada banco (desenho próprio, sem logotipos). */
export function bankGradient(account: Pick<Account, 'bank' | 'kind' | 'color'>): [string, string] {
  if (account.kind === 'cash') return ['#3FA66B', '#1F6B43'];
  if (account.color) return [account.color, account.color + 'B3'];
  if (account.bank === 'nubank') return ['#9B1FE8', '#5A0A9E'];
  if (account.bank === 'inter') return ['#FF8A1F', '#E85D04'];
  return ['#3A4A55', '#1E272E'];
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
