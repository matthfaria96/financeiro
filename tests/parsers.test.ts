import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseStatementText, accountNumberInFileName } from '../src/lib/core/importer';
import { decode, displayName } from '../src/lib/core/text';
import { parseCents } from '../src/lib/core/money';
import { parseDay } from '../src/lib/core/dates';
import { csvRows } from '../src/lib/core/csv';
import { parsePDFText } from '../src/lib/core/pdfStatement';
import { ofxStyle } from '../src/lib/core/ofx';

const fixture = (name: string) => decode(new Uint8Array(readFileSync(`tests/fixtures/${name}`)));

describe('Leitura de extratos', () => {
  it('Nubank conta OFX', () => {
    const s = parseStatementText(fixture('nubank-conta.ofx'));
    expect(s.bank).toBe('nubank');
    expect(s.kind).toBe('checking');
    expect(s.accountId).toBe('12345678-9');
    expect(s.balanceCents).toBe(341_288);
    expect(s.transactions.map((t) => t.amountCents)).toEqual([520_000, -185_000, -123_456, -8_740, -15_000]);
    expect(s.transactions[0].date).toBe('2026-10-05');
    expect(s.transactions[0].externalId).toBe('6710a1b2-0001');
  });
  it('Nubank cartão OFX', () => {
    const s = parseStatementText(fixture('nubank-cartao.ofx'));
    expect(s.kind).toBe('creditCard');
    expect(s.transactions[1].installment).toEqual({ current: 3, total: 10 });
    expect(s.transactions[2].amountCents).toBe(123_456);
  });
  it('Inter OFX em Windows-1252', () => {
    const s = parseStatementText(fixture('inter-conta-latin1.ofx'));
    expect(s.bank).toBe('inter');
    expect(s.transactions[3].title).toContain('débito');
  });
  it('Nubank cartão CSV inverte o sinal', () => {
    const s = parseStatementText(fixture('nubank-cartao.csv'));
    expect([s.bank, s.kind]).toEqual(['nubank', 'creditCard']);
    expect(s.transactions[0].amountCents).toBe(-2_345);
    expect(s.transactions.at(-1)?.amountCents).toBe(123_456);
    expect(s.transactions[3].installment).toEqual({ current: 1, total: 3 });
  });
  it('Nubank conta CSV', () => {
    const s = parseStatementText(fixture('nubank-conta.csv'));
    expect(s.transactions.map((t) => t.amountCents)).toEqual([520_000, -185_000, -8_740]);
  });
  it('Inter conta CSV com cabeçalho', () => {
    const s = parseStatementText(fixture('inter-conta.csv'));
    expect([s.bank, s.kind, s.accountId]).toEqual(['inter', 'checking', '12345678']);
    expect(s.transactions.map((t) => t.amountCents)).toEqual([100_000, -24_510, -31_245]);
    expect([s.balanceCents, s.balanceDate]).toEqual([234_567, '2026-10-27']);
    expect(s.transactions[2].title).toBe('Pix enviado - Supermercado Bom Preço');
  });
  it('Inter cartão CSV', () => {
    const s = parseStatementText(fixture('inter-cartao.csv'));
    expect(s.transactions.map((t) => t.amountCents)).toEqual([-25_000, -8_990, -105_035, 90_000]);
    expect(s.transactions[1].installment).toEqual({ current: 2, total: 6 });
    expect(s.transactions[0].bankCategory).toBe('TRANSPORTE');
  });
  it('Nubank cartão CSV com vírgula sobrando', () => {
    const s = parseStatementText('date,title,amount,\n2026-10-02,Uber* Trip,23.45,\n');
    expect([s.kind, s.transactions[0].amountCents]).toEqual(['creditCard', -2_345]);
  });
  it('Inter de um dia só usa a linha mais nova para o saldo', () => {
    const s = parseStatementText('Extrato Conta Corrente\nData Lançamento;Histórico;Descrição;Valor;Saldo\n27/10/2026;Pix enviado;B;-10,00;90,00\n27/10/2026;Pix enviado;A;-10,00;100,00');
    expect(s.balanceCents).toBe(9_000);
  });
  it('número da conta no nome do arquivo do Nubank', () => {
    expect(accountNumberInFileName('NU_12345678_01SET2026_30SET2026.csv')).toBe('12345678');
    const s = parseStatementText('Data,Valor,Identificador,Descrição\n02/09/2026,43.36,abc,Resgate RDB\n', 'NU_12345678_01SET2026_30SET2026.csv');
    expect(s.accountId).toBe('12345678');
  });
  it('texto desconhecido falha', () => {
    expect(() => parseStatementText('olá mundo\nnada aqui')).toThrow();
  });
  it('PDF por linhas', () => {
    const s = parsePDFText('Nubank fatura do cartão\nData do vencimento: 10 NOV 2025\n02 OUT Posto Total 120,00\n03 OUT Totalpass 99,90\n04 OUT Loja 1234,56\n05 OUT Total da fatura 1.454,46');
    expect(s.transactions.map((t) => t.amountCents)).toEqual([-12_000, -9_990, -123_456]);
    expect(s.transactions[0].date.slice(0, 4)).toBe('2025');
  });
});

describe('Valores, datas e nomes', () => {
  it.each([
    ['R$ 1.234,56', 123_456], ['-1.234,56', -123_456], ['1234.56', 123_456], ['-0.99', -99], ['(12,30)', -1_230],
    ['R$ -12,30', -1_230], ['12,5', 1_250], ['1.000.000,00', 100_000_000], ['50', 5_000], ['1.500', 150_000], ['R$ 1.234', 123_400]
  ])('%s', (input, expected) => expect(parseCents(input)).toBe(expected));
  it('OFX com vírgula', () => {
    expect(parseCents('-1.234,56', ofxStyle('-1.234,56'))).toBe(-123_456);
    expect(parseCents('-87.40', ofxStyle('-87.40'))).toBe(-8_740);
  });
  it('datas', () => {
    expect(parseDay('2026-10-02')).toBe('2026-10-02');
    expect(parseDay('02/10/2026')).toBe('2026-10-02');
    expect(parseDay('02/10/26')).toBe('2026-10-02');
    expect(parseDay('20261002120000[-3:BRT]')).toBe('2026-10-02');
    expect(parseDay('31/02/2026')).toBeNull();
  });
  it('nomes limpos', () => {
    expect(displayName('Transferência enviada pelo Pix - MARIA DA SILVA - •••.123.456-•• - BCO')).toBe('Maria da Silva');
    expect(displayName('Compra no débito - PADARIA PAO QUENTE')).toBe('Padaria Pao Quente');
    expect(displayName('Ifd*Restaurante Sabor')).toBe('Restaurante Sabor');
    expect(displayName('Drogasil - Parcela 1/3')).toBe('Drogasil');
    expect(displayName('Transferência enviada pelo Pix via Open Banking - Iniciada por: Bradesco ITP A2A - COMPANHIA PAULISTA DE FORCA E LUZ - 33.050.196/0001-88')).toBe('Companhia Paulista de Forca e Luz');
    expect(displayName('Transferência recebida pelo Pix - M  C  DE FARIA   CONFECCOES - 12.007.314/0001-03')).toBe('M C de Faria Confeccoes');
  });
  it('CSV com aspas', () => {
    expect(csvRows('a,"b, c","d ""e"""\r\n1,2,3\n', ',')).toEqual([['a', 'b, c', 'd "e"'], ['1', '2', '3']]);
  });
});
