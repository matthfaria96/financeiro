import { fold } from './text';
import type { ImportedTransaction } from './statement';
import type { Day } from './dates';

/** Chave estável de cada lançamento importado: reimportar o mesmo período nunca duplica.
 *  Com identificador do banco: "id:<valor>". Sem: dia + valor + descrição + ordem no arquivo. */
export function duplicateKeys(transactions: ImportedTransaction[]): string[] {
  const occurrences = new Map<string, number>();
  return transactions.map((transaction) => {
    if (transaction.externalId) return `id:${transaction.externalId}`;
    const base = `${transaction.date}|${transaction.amountCents}|${fold(transaction.title)}`;
    const index = occurrences.get(base) ?? 0;
    occurrences.set(base, index + 1);
    return `h:${base}|${index}`;
  });
}

export interface ExistingKey {
  date: Day;
  amountCents: number;
  key: string;
}

/** Linhas que provavelmente já existem vindas de OUTRO formato (OFX × CSV): mesmo dia e valor
 *  de um lançamento com tipo de chave diferente. Cada existente "absorve" no máximo uma linha. */
export function crossFormatMatches(keys: string[], transactions: ImportedTransaction[], existing: ExistingKey[]): Set<number> {
  const existingKeys = new Set(existing.map((item) => item.key));
  const pool = new Map<string, number>();
  for (const item of existing) {
    const slot = `${item.key.startsWith('id:')}|${item.date}|${item.amountCents}`;
    pool.set(slot, (pool.get(slot) ?? 0) + 1);
  }
  const result = new Set<number>();
  transactions.forEach((transaction, index) => {
    if (existingKeys.has(keys[index])) return;
    const slot = `${!keys[index].startsWith('id:')}|${transaction.date}|${transaction.amountCents}`;
    const available = pool.get(slot) ?? 0;
    if (available > 0) {
      pool.set(slot, available - 1);
      result.add(index);
    }
  });
  return result;
}
