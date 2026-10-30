import { describe, expect, it } from 'vitest';
import { transferPlan } from '../src/lib/features/transfer';
import { CARD_PAYMENT, CASH_WITHDRAWAL, INTERNAL_TRANSFER, INVESTMENT } from '../src/lib/core/catalog';

const acc = (id: string, kind: 'checking' | 'creditCard' | 'savings' | 'cash', investment_source_id: string | null = null) => ({ id, kind, investment_source_id });

describe('Transferir entre contas', () => {
  it('conta → dinheiro é saque, lançado nos dois lados', () => {
    expect(transferPlan(acc('a', 'checking'), acc('d', 'cash'))).toEqual({ category: CASH_WITHDRAWAL, from: true, to: true });
  });
  it('conta → cartão é pagamento de fatura', () => {
    expect(transferPlan(acc('a', 'checking'), acc('c', 'creditCard')).category).toBe(CARD_PAYMENT);
  });
  it('conta → caixinha é investimento', () => {
    expect(transferPlan(acc('a', 'checking'), acc('s', 'savings'))).toEqual({ category: INVESTMENT, from: true, to: true });
  });
  it('caixinha que acompanha a conta: só a conta corrente; a cópia sai sozinha', () => {
    expect(transferPlan(acc('a', 'checking'), acc('s', 'savings', 'a'))).toEqual({ category: INVESTMENT, from: true, to: false });
    expect(transferPlan(acc('s', 'savings', 'a'), acc('a', 'checking'))).toEqual({ category: INVESTMENT, from: false, to: true });
  });
  it('conta → conta é transferência interna', () => {
    expect(transferPlan(acc('a', 'checking'), acc('b', 'checking'))).toEqual({ category: INTERNAL_TRANSFER, from: true, to: true });
  });
});
