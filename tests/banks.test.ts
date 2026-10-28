import { describe, expect, it } from 'vitest';
import { parseStatementText } from '../src/lib/core/importer';
import { parsePDFText } from '../src/lib/core/pdfStatement';
import { bankFromCode, bankFromText, bankInfo, bankList } from '../src/lib/core/banks';

// Arquivos sintéticos no formato de cada banco (nenhum dado real).
const ofx = (bankId: string, org = '') => `OFXHEADER:100
DATA:OFXSGML
<OFX><SIGNONMSGSRSV1><SONRS><FI><ORG>${org}</FI></SONRS></SIGNONMSGSRSV1>
<BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>BRL<BANKACCTFROM><BANKID>${bankId}<ACCTID>98765-4</BANKACCTFROM>
<BANKTRANLIST><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261003<TRNAMT>-45.90<FITID>A1<MEMO>Padaria</STMTTRN></BANKTRANLIST>
<LEDGERBAL><BALAMT>1200.00<DTASOF>20261027</LEDGERBAL></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

describe('Bancos', () => {
  it('cada banco tem nome, cores e caminho de exportação', () => {
    for (const bank of bankList) {
      expect(bank.name).toBeTruthy();
      expect(bank.colors).toHaveLength(2);
      expect(bank.checking && bank.card).toBeTruthy();
    }
    expect(new Set(bankList.flatMap((b) => b.codes)).size).toBe(bankList.flatMap((b) => b.codes).length);
  });
  it('código COMPE do OFX', () => {
    expect(['0341', '237', '033', '001', '104', '336', '0260', '077'].map(bankFromCode)).toEqual(['itau', 'bradesco', 'santander', 'bb', 'caixa', 'c6', 'nubank', 'inter']);
    expect(bankFromCode('9999')).toBe('other');
    expect(bankInfo('desconhecido').id).toBe('other');
  });
  it('OFX do Itaú e do Santander pelo BANKID', () => {
    expect(parseStatementText(ofx('0341')).bank).toBe('itau');
    const s = parseStatementText(ofx('0033'));
    expect([s.bank, s.balanceCents, s.transactions[0].amountCents]).toEqual(['santander', 120_000, -4_590]);
  });
  it('OFX sem BANKID usa o ORG', () => {
    expect(parseStatementText(ofx('', 'Banco do Brasil S/A')).bank).toBe('bb');
  });
  it('vale o banco citado primeiro, não o das transferências', () => {
    expect(bankFromText('SANTANDER Extrato\nPix enviado para Itaú\nTED Bradesco')).toBe('santander');
    expect(bankFromText('Pix para Fulana · caixa de som')).toBe('other');
    expect(bankFromText('fatura-c6-bank-out')).toBe('c6');
    expect(bankFromText('Itaucard fatura')).toBe('itau');
  });
  it('nome do arquivo indica o banco', () => {
    const s = parseStatementText('Data;Descrição;Valor\n03/10/2026;Padaria;-45,90\n', 'extrato-bradesco-outubro.csv');
    expect(s.bank).toBe('bradesco');
    expect(s.warnings).toEqual([]);
  });
  it('fatura do C6 em CSV', () => {
    const s = parseStatementText('Data de Compra;Nome no Cartão;Final do Cartão;Categoria;Descrição;Parcela;Valor (em US$);Cotação (em R$);Valor (em R$)\n' +
      '02/10/2026;FULANO;1234;Restaurante;IFOOD *RESTAURANTE;Única;0;0;54,90\n' +
      '05/10/2026;FULANO;1234;Departamento;LOJA X;2/5;0;0;100,00\n' +
      '10/10/2026;FULANO;1234;-;Inclusao de Pagamento;Única;0;0;-800,00\n');
    expect([s.bank, s.kind]).toEqual(['c6', 'creditCard']);
    expect(s.transactions.map((t) => t.amountCents)).toEqual([-5_490, -10_000, 80_000]);
    expect(s.transactions[1].installment).toEqual({ current: 2, total: 5 });
    expect(s.transactions[0].bankCategory).toBe('Restaurante');
  });
  it('conta do C6 com Entrada e Saída separadas', () => {
    const s = parseStatementText('Extrato Conta Corrente C6 Bank\nData Lançamento,Data Contábil,Título,Descrição,Entrada(R$),Saída(R$),Saldo do Dia(R$)\n' +
      '01/10/2026,01/10/2026,Pix recebido,Salário,5000.00,0.00,5000.00\n02/10/2026,02/10/2026,Pix enviado,Aluguel,0.00,1800.00,3200.00\n');
    expect([s.bank, s.kind]).toEqual(['c6', 'checking']);
    expect(s.transactions.map((t) => t.amountCents)).toEqual([500_000, -180_000]);
    expect(s.balanceCents).toBe(320_000);
  });
  it('Banco do Brasil: linhas de saldo e coluna Entrada/Saída', () => {
    const s = parseStatementText('"Data","Lançamento","Detalhes","N° documento","Valor","Tipo Lançamento"\n' +
      '"30/09/2026","Saldo Anterior","","","1.000,00","Entrada"\n' +
      '"01/10/2026","Pix - Enviado","01/10 12:00 Mercado","123","150,00","Saída"\n' +
      '"02/10/2026","Pix - Recebido","02/10 09:00 Fulano","124","50,00","Entrada"\n' +
      '"02/10/2026","S A L D O","","","900,00","Entrada"\n');
    expect([s.bank, s.kind]).toEqual(['bb', 'checking']);
    expect(s.transactions.map((t) => t.amountCents)).toEqual([-15_000, 5_000]);
    expect([s.balanceCents, s.balanceDate]).toEqual([90_000, '2026-10-02']);
    expect(s.transactions[0].title).toBe('Pix - Enviado - 01/10 12:00 Mercado');
  });
  it('Mercado Pago (relatório de extrato)', () => {
    const s = parseStatementText('INITIAL_BALANCE;CREDITS;DEBITS;FINAL_BALANCE\n100,00;50,00;-30,00;120,00\n\n' +
      'RELEASE_DATE;TRANSACTION_TYPE;REFERENCE_ID;TRANSACTION_NET_AMOUNT;PARTIAL_BALANCE\n' +
      '01-10-2026;Transferência Pix recebida;111;50,00;150,00\n03-10-2026;Pagamento com QR Pix Padaria;112;-30,00;120,00\n');
    expect([s.bank, s.kind]).toEqual(['mercadopago', 'checking']);
    expect(s.transactions.map((t) => t.amountCents)).toEqual([5_000, -3_000]);
    expect(s.balanceCents).toBe(12_000);
  });
  it('coluna D/C', () => {
    const s = parseStatementText('Data;Histórico;Valor;D/C\n01/10/2026;Compra cartão;45,00;D\n02/10/2026;Depósito;100,00;C\n');
    expect(s.transactions.map((t) => t.amountCents)).toEqual([-4_500, 10_000]);
  });
  it('PDF de fatura do Santander', () => {
    const s = parsePDFText('Santander\nFatura do cartão\nVencimento 10/11/2026\n02/10 PADARIA BOA 12,50\n03/10 POSTO SHELL 150,00');
    expect([s.bank, s.kind]).toEqual(['santander', 'creditCard']);
    expect(s.transactions.map((t) => t.amountCents)).toEqual([-1_250, -15_000]);
  });
});
