import type { Day } from './dates';

export type Bank = 'nubank' | 'inter' | 'other';
export type StatementKind = 'checking' | 'creditCard';
export type StatementFormat = 'ofx' | 'csv' | 'pdf';

export const bankName: Record<Bank, string> = { nubank: 'Nubank', inter: 'Inter', other: 'Outro banco' };

export interface Installment {
  current: number;
  total: number;
}

/** Lançamento lido do arquivo, com sinal normalizado: negativo = saiu dinheiro, positivo = entrou. */
export interface ImportedTransaction {
  date: Day;
  amountCents: number;
  title: string;
  memo: string;
  externalId?: string;
  bankCategory?: string;
  installment?: Installment;
}

export interface ImportedStatement {
  bank: Bank;
  kind: StatementKind;
  format: StatementFormat;
  accountId?: string;
  balanceCents?: number;
  balanceDate?: Day;
  transactions: ImportedTransaction[];
  warnings: string[];
}

export class ImportError extends Error {}

export const errors = {
  unreadable: 'Não consegui ler o texto do arquivo. Ele pode estar corrompido ou protegido.',
  unknown: 'Formato não reconhecido. Use o extrato em OFX ou CSV exportado pelo app do banco.',
  empty: 'O arquivo foi lido, mas não tem nenhum lançamento no período.',
  pdf: 'Não consegui extrair lançamentos deste PDF. Exporte o mesmo período em OFX ou CSV.'
};

/** Acha "Parcela 2/10", "2/10" no fim ou "02 de 10". */
export function parseInstallment(text: string): Installment | undefined {
  const patterns = [/parcela\s*(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})/i, /(?<![\d/])(\d{1,2})\/(\d{1,2})(?![\d/])\s*$/];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const current = Number(match[1]);
    const total = Number(match[2]);
    if (current >= 1 && total >= 2 && current <= total) return { current, total };
  }
  return undefined;
}

export function transaction(input: Omit<ImportedTransaction, 'memo' | 'installment'> & { memo?: string; installment?: Installment }): ImportedTransaction {
  const memo = input.memo ?? '';
  return { ...input, memo, installment: input.installment ?? parseInstallment(input.title) ?? parseInstallment(memo) };
}

export function summary(statement: ImportedStatement): string {
  return `${bankName[statement.bank]} · ${statement.kind === 'creditCard' ? 'Cartão de crédito' : 'Conta corrente'} · ${statement.format.toUpperCase()}`;
}

export function dateRange(statement: ImportedStatement): [Day, Day] | null {
  if (!statement.transactions.length) return null;
  const dates = statement.transactions.map((t) => t.date).sort();
  return [dates[0], dates[dates.length - 1]];
}
