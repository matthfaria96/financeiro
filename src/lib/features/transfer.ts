import { CARD_PAYMENT, CASH_WITHDRAWAL, INTERNAL_TRANSFER, INVESTMENT } from '$lib/core/catalog';
import type { Account } from '$lib/data/types';

type Side = Pick<Account, 'id' | 'kind' | 'investment_source_id'>;

/** Transferir entre contas (aba do "+"): a categoria sai do tipo das contas, sem a pessoa escolher.
 *  `from`/`to`: em quais lados gravar. A caixinha que acompanha a conta corrente ganha a cópia sozinha (reconcileMirrors). */
export function transferPlan(from: Side, to: Side): { category: string; from: boolean; to: boolean } {
  if (to.kind === 'cash') return { category: CASH_WITHDRAWAL, from: true, to: true };
  if (to.kind === 'creditCard') return { category: CARD_PAYMENT, from: true, to: true };
  if (to.kind === 'savings') return { category: INVESTMENT, from: true, to: to.investment_source_id !== from.id };
  if (from.kind === 'savings') return { category: INVESTMENT, from: from.investment_source_id !== to.id, to: true };
  return { category: INTERNAL_TRANSFER, from: true, to: true };
}
