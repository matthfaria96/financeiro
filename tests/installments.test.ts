import { describe, expect, it } from 'vitest';
import { purchaseOf, purchaseKey, purchaseRepresentatives, stripInstallment } from '../src/lib/core/installments';

// Parcelas fictícias. Nubank: só a 1ª tem a data da compra; as outras vêm com a data de início da fatura.
const nubank7 = { id: 'a', account: 'nu', title: 'Loja Exemplo - Parcela 7/12', date: '2026-07-02', due: '2026-08-09', cents: -21_363, current: 7, total: 12 };
const nubank8 = { ...nubank7, id: 'b', title: 'Loja Exemplo - Parcela 8/12', date: '2026-08-02', due: '2026-09-09', current: 8 };
// C6: todas as parcelas trazem a data original da compra.
const c6 = { id: 'c', account: 'c6', title: 'LOJA EXEMPLO 3/5', date: '2026-03-15', due: '2026-08-10', cents: -20_000, current: 3, total: 5 };

describe('compra parcelada', () => {
  it('tira o "Parcela x/y" do nome', () => {
    expect(stripInstallment('Loja Exemplo - Parcela 7/12')).toBe('Loja Exemplo');
    expect(stripInstallment('LOJA EXEMPLO 3/5')).toBe('LOJA EXEMPLO');
  });
  it('Nubank: volta (n−1) meses a partir da fatura e soma o valor inteiro', () => {
    expect(purchaseOf(nubank7)).toEqual({ month: '2026-01', date: '2026-01-02', cents: -256_356 });
  });
  it('banco que já manda a data original: não mexe na data', () => {
    expect(purchaseOf(c6)).toEqual({ month: '2026-03', date: '2026-03-15', cents: -100_000 });
  });
  it('parcelas da mesma compra viram uma compra só', () => {
    expect(purchaseKey(nubank7)).toBe(purchaseKey(nubank8));
    expect([...purchaseRepresentatives([nubank8, nubank7])]).toEqual(['a']);
  });
});
