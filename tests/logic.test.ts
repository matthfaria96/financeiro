import { describe, expect, it } from 'vitest';
import { Categorizer } from '../src/lib/core/categorizer';
import { categorySeeds, merchantSeeds } from '../src/lib/core/catalog';
import { crossFormatMatches, duplicateKeys } from '../src/lib/core/duplicates';
import { BillCycle, assignBills, dueDateInFileName, looksLikeSingleBill } from '../src/lib/core/billCycle';
import { futureInstallments, monthlyAverage } from '../src/lib/core/forecast';
import { monthReport } from '../src/lib/core/reports';
import { transaction } from '../src/lib/core/statement';
import { money } from '../src/lib/core/money';

const categorizer = new Categorizer([]);
const key = (title: string, cents: number, bank?: string) => categorizer.suggest(title, '', cents, bank).categoryKey;

describe('Categorização', () => {
  it.each([
    ['Ifd*Restaurante Sabor', -4_590, 'alim-delivery'], ['Uber* Trip', -2_345, 'carro-apps'], ['POSTO IPIRANGA CENTRO', -25_000, 'carro-combustivel'],
    ['Netflix.Com', -5_590, 'ass-streaming'], ['Pagamento de fatura', -123_456, 'pagamento-fatura'], ['Pagamento recebido', 123_456, 'pagamento-fatura'],
    ['Mercado Livre - Parcela 2/5', -119_990, 'compras-online'], ['Pagamento efetuado - Enel Distribuição', -24_510, 'casa-luz'],
    ['Pix recebido - Fulano de Tal', 100_000, 'outras-receitas'], ['Loja otimo', -1_000, 'outros'], ['Loja Otimbre', -100, 'outros'],
    ['Pagamento de boleto efetuado - LELLO', -1_000, 'casa-moradia'], ['Pagamento de boleto efetuado - SUPERGASBRAS ENERGIA LTDA', -1_000, 'casa-gas'],
    ['Pagamento de boleto efetuado - EES COMUNICACAO MULTIMIDIA LTDA', -1_000, 'casa-internet'], ['Pix - REI DOS COINS', -100, 'lazer-jogos'],
    ['Transferência enviada pelo Pix via Open Banking - Iniciada por: Bradesco ITP A2A - COMPANHIA PAULISTA DE FORCA E LUZ', -25_129, 'casa-luz'],
    ['Estorno - Amazon Marketplace', 15_990, 'compras-online']
  ])('%s', (title, cents, expected) => expect(key(title, cents)).toBe(expected));
  it('categoria do banco como reserva', () => {
    const s = categorizer.suggest('LOJA EXEMPLO', '', -8_990, 'VESTUARIO');
    expect([s.categoryKey, s.source.type]).toEqual(['compras-roupas', 'bank']);
  });
  it('regra mais específica vence', () => {
    const c = new Categorizer([
      { id: 'a', pattern: 'maria', categoryKey: 'pix-pessoas' },
      { id: 'b', pattern: 'maria da silva', categoryKey: 'transferencia-interna', personId: 'esposa', rename: 'Esposa' }
    ]);
    const s = c.suggest('Transferência enviada pelo Pix - MARIA DA SILVA', '', -15_000);
    expect([s.categoryKey, s.personId, s.displayName, s.source]).toEqual(['transferencia-interna', 'esposa', 'Esposa', { type: 'rule', id: 'b' }]);
  });
  it('catálogo consistente', () => {
    const keys = new Set(categorySeeds.map((s) => s.key));
    expect(categorySeeds.filter((s) => s.parent && !keys.has(s.parent))).toEqual([]);
    expect(merchantSeeds.filter((m) => !keys.has(m.category))).toEqual([]);
  });
});

describe('Duplicatas', () => {
  it('chaves estáveis e compras repetidas continuam duas', () => {
    const items = [
      transaction({ date: '2026-10-03', amountCents: -5_590, title: 'Netflix.Com' }),
      transaction({ date: '2026-10-03', amountCents: -5_590, title: 'Netflix.Com' }),
      transaction({ date: '2026-10-03', amountCents: -100, title: 'X', externalId: 'abc' })
    ];
    const keys = duplicateKeys(items);
    expect(new Set(keys).size).toBe(3);
    expect(keys[2]).toBe('id:abc');
    expect(duplicateKeys(items)).toEqual(keys);
  });
  it('mesmo lançamento em outro formato', () => {
    const csv = [
      transaction({ date: '2026-10-03', amountCents: -5_590, title: 'Netflix.Com' }),
      transaction({ date: '2026-10-03', amountCents: -5_590, title: 'Netflix.Com' }),
      transaction({ date: '2026-10-04', amountCents: -100, title: 'Outro' })
    ];
    const result = crossFormatMatches(duplicateKeys(csv), csv, [{ date: '2026-10-03', amountCents: -5_590, key: 'id:abc' }]);
    expect([...result]).toEqual([0]);
  });
});

describe('Fatura, previsão e relatórios', () => {
  it('ciclo fecha dia 2 e vence dia 10', () => {
    const cycle = new BillCycle(2, 10);
    expect(cycle.dueDate('2026-10-01')).toBe('2026-10-10');
    expect(cycle.dueDate('2026-10-02')).toBe('2026-11-10');
    expect(cycle.dueDate('2026-12-15')).toBe('2027-01-10');
    expect(cycle.purchaseRange('2026-11-10')).toEqual(['2026-10-02', '2026-11-01']);
  });
  it('vencimento antes do fechamento e dia 31', () => {
    expect(new BillCycle(25, 5).dueDate('2026-10-24')).toBe('2026-11-05');
    expect(new BillCycle(25, 5).dueDate('2026-10-25')).toBe('2026-12-05');
    expect(new BillCycle(31, 31).dueDate('2026-02-27')).toBe('2026-03-31');
    expect(new BillCycle(31, 31).dueDate('2026-02-28')).toBe('2026-04-30');
  });
  it('fatura única e nome do arquivo', () => {
    const rows = [
      transaction({ date: '2026-06-03', amountCents: -10_000, title: 'Loja - Parcela 5/10' }),
      transaction({ date: '2026-10-03', amountCents: -2_000, title: 'Uber' }),
      transaction({ date: '2026-10-30', amountCents: -3_000, title: 'Mercado' })
    ];
    expect(dueDateInFileName('Nubank_2026-11-10.csv')).toBe('2026-11-10');
    expect(looksLikeSingleBill(rows)).toBe(true);
    expect(assignBills(rows.slice(1), null, new BillCycle(2, 10))).toEqual(['2026-11-10', '2026-11-10']);
  });
  it('média usa os meses que houver', () => {
    const avg = monthlyAverage([{ date: '2026-08-05', cents: 1_000 }, { date: '2026-09-05', cents: 3_000 }, { date: '2026-10-01', cents: 99_999 }], 6, '2026-10');
    expect(avg).toEqual({ cents: 2_000, monthsUsed: 2 });
  });
  it('parcelas futuras sem contar duas vezes', () => {
    const future = futureInstallments([
      { title: 'Loja - Parcela 1/3', cents: -3_334, installment: { current: 1, total: 3 }, due: '2026-10-10' },
      { title: 'Loja - Parcela 2/3', cents: -3_333, installment: { current: 2, total: 3 }, due: '2026-11-10' }
    ]);
    expect(future.map((f) => [f.label, f.due])).toEqual([['3/3', '2026-12-10']]);
  });
  it('relatório do mês', () => {
    const items = [
      { date: '2026-10-02', amountCents: -60_000, groupId: 'casa', kind: 'expense' as const },
      { date: '2026-10-09', amountCents: -40_000, groupId: 'mercado', kind: 'expense' as const },
      { date: '2026-10-09', amountCents: 10_000, groupId: 'mercado', kind: 'expense' as const },
      { date: '2026-10-10', amountCents: -99_999, groupId: 'fatura', kind: 'transfer' as const },
      { date: '2026-09-15', amountCents: -50_000, groupId: 'casa', kind: 'expense' as const }
    ];
    const report = monthReport('2026-10', items, 'expenses');
    expect([report.totalCents, report.previousTotalCents]).toEqual([90_000, 50_000]);
    expect(report.slices.map((s) => [s.groupId, s.change])).toEqual([['casa', 0.2], ['mercado', null]]);
  });
  it('formato do dinheiro', () => {
    expect(money(123_456)).toBe('R$ 1.234,56');
  });
});
