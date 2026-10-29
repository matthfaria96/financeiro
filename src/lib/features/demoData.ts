import type { Bill } from '$lib/data/types';
import { addMonths, makeDay, monthOf, today } from '$lib/core/dates';
import { parseStatementText } from '$lib/core/importer';
import { store } from '$lib/data/store.svelte';
import { commitDraft, createDraft } from './imports.svelte';
import { blankEntry } from './mirrors';

/** Nove meses de extratos fictícios importados pelo mesmo caminho dos arquivos reais. */
export async function seedDemo() {
  const months = Array.from({ length: 9 }, (_, i) => addMonths(monthOf(today()), i - 8));
  const day = (month: string, d: number) => makeDay(Number(month.slice(0, 4)), Number(month.slice(5)), d)!;
  const past = (month: string, d: number) => day(month, d) <= today();
  const br = (v: number) => v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  let id = 0;
  const nubankConta = ['Data,Valor,Identificador,Descrição'];
  months.forEach((m, i) => {
    const rows: [number, number, string][] = [
      [5, 7800, 'Transferência recebida pelo Pix - EMPRESA EXEMPLO LTDA - 12.345.678/0001-90'], [6, -2350, 'Pagamento de boleto efetuado - IMOBILIARIA CASA BOA'],
      [8, -129.9, 'Pagamento de boleto efetuado - VIVO FIBRA'], [10, -(1450 + i * 60), 'Pagamento de fatura'], [12, -42.5, 'Compra no débito - PADARIA PAO QUENTE'],
      [14, -200, 'Saque 24h - Banco24Horas'], [18, -300, 'Transferência enviada pelo Pix - JOAO PEREIRA - •••.111.222-•• - BCO'], [25, -500, 'Aplicação RDB']
    ];
    for (const [d, v, t] of rows) if (past(m, d)) nubankConta.push(`${day(m, d).split('-').reverse().join('/')},${v.toFixed(2)},demo-nu-${++id},"${t}"`);
  });
  const nubankCard = ['date,title,amount'];
  const merchants: [number, string, number][] = [[2, 'Ifd*Restaurante Sabor', 64.9], [3, 'Netflix.Com', 55.9], [4, 'Uber* Trip', 23.4], [7, 'Carrefour Hiper', 612.35], [9, 'Spotify', 34.9], [11, 'Posto Shell Centro', 250], [14, 'Drogasil', 87.2], [16, 'Amazon Marketplace', 159.9], [19, 'Uber* Trip', 31.8], [21, 'Ifd*Pizzaria Bella', 92], [23, 'Smart Fit', 119.9], [26, 'Assai Atacadista', 433.1]];
  months.forEach((m, i) => {
    for (const [d, t, v] of merchants) if (past(m, d)) nubankCard.push(`${day(m, d)},${t},${(/Netflix|Spotify|Smart/.test(t) ? v : v + (((i * 7 + d) % 9) - 4) * 3.1).toFixed(2)}`);
    if (past(m, 10)) nubankCard.push(`${day(m, 10)},Pagamento recebido,-${(1450 + i * 60).toFixed(2)}`);
  });
  const interConta = ['Extrato Conta Corrente', 'Conta ;98765432', '', 'Data Lançamento;Histórico;Descrição;Valor;Saldo'];
  let balance = 1800;
  const interRows: string[] = [];
  for (const m of months) {
    for (const [d, v, h, t] of [[5, 5200, 'Pix recebido', 'Escola Aprender Ltda'], [9, -238.4, 'Pagamento efetuado', 'Enel Distribuição'], [12, -96.3, 'Pagamento efetuado', 'Sabesp'], [15, -890, 'Pagamento efetuado', 'Colégio Pequeno Saber'], [20, -980, 'Pagamento fatura', 'Cartão Inter'], [22, -140, 'Pix enviado', 'Salão Bela Vista']] as [number, number, string, string][]) {
      if (!past(m, d)) continue;
      balance += v;
      interRows.push(`${day(m, d).split('-').reverse().join('/')};${h};${t};${br(v)};${br(balance)}`);
    }
  }
  interConta.push(...interRows.reverse());
  const interCard = ['"Data","Lançamento","Categoria","Tipo","Valor"'];
  months.forEach((m, i) => {
    for (const [d, t, c, v] of [[3, 'PAO DE ACUCAR', 'SUPERMERCADO', 284.6], [8, 'RENNER', 'VESTUARIO', 189.9 + i * 5], [13, 'DISNEY PLUS', 'SERVICOS', 43.9], [17, 'PETZ', 'PETS', 156], [24, 'BOTICARIO', 'BELEZA', 99.9]] as [number, string, string, number][]) {
      if (past(m, d)) interCard.push(`"${day(m, d).split('-').reverse().join('/')}","${t}","${c}","Compra à vista","R$ ${br(v)}"`);
    }
    if (past(m, 20)) interCard.push(`"${day(m, 20).split('-').reverse().join('/')}","PAGAMENTO ON LINE","OUTROS","Pagamento","-R$ 980,00"`);
  });
  const c6Card = ['Data de Compra;Nome no Cartão;Final do Cartão;Categoria;Descrição;Parcela;Valor (em US$);Cotação (em R$);Valor (em R$)'];
  months.forEach((m, i) => {
    for (const [d, t, c, v] of [[6, 'POSTO IPIRANGA', 'Posto de combustível', 180 + i * 4], [15, 'MERCADOLIVRE*LOJA', 'Departamento', 74.9], [27, 'SEM PARAR', 'Serviços', 38.5]] as [number, string, string, number][]) {
      if (past(m, d)) c6Card.push(`${day(m, d).split('-').reverse().join('/')};FULANO;4321;${c};${t};Única;0;0;${br(v)}`);
    }
    if (past(m, 12)) c6Card.push(`${day(m, 12).split('-').reverse().join('/')};FULANO;4321;-;Inclusao de Pagamento;Única;0;0;-${br(260 + i * 4)}`);
  });
  const files: [string, string[], string, string, string][] = [
    ['nubank-conta.csv', nubankConta, 'Nubank conta', 'p-eu', 'w-meu'], ['nubank-fatura.csv', nubankCard, 'Nubank cartão', 'p-eu', 'w-meu'],
    ['inter-conta.csv', interConta, 'Inter conta', 'p-esposa', 'w-esposa'], ['inter-fatura.csv', interCard, 'Inter cartão', 'p-esposa', 'w-esposa'],
    ['c6-fatura.csv', c6Card, 'C6 cartão', 'p-eu', 'w-meu']
  ];
  for (const [name, lines, accountName, person, workspace] of files) {
    const draft = createDraft(name, parseStatementText(lines.join('\n'), name), null);
    draft.newAccountName = accountName;
    draft.defaultPersonId = person;
    draft.newAccountWorkspace = workspace;
    draft.billSingle = false;
    await commitDraft(draft);
  }
  for (const account of store.accounts) await store.update('accounts', account.id, { default_person_id: account.bank === 'inter' ? 'p-esposa' : 'p-eu', last_digits: String(1000 + (account.name.length * 731) % 9000), workspace_id: account.bank === 'inter' ? 'w-esposa' : 'w-meu' });
  const [cash] = await store.insert('accounts', [{ name: 'Dinheiro', bank: 'other', kind: 'cash', external_id: '', color: '', last_digits: '', archived: false, sort_order: 9, closing_day: 2, due_day: 10, workspace_id: 'w-meu', default_person_id: 'p-eu', investment_source_id: null, anchor_balance_cents: null, anchor_date: null, anchor_batch_id: null, prev_anchor_balance_cents: null, prev_anchor_date: null }]);
  const cat = (key: string) => store.categoryByKey.get(key)?.id ?? null;
  await store.insert('entries', months.flatMap((m, i) => ([[14, 20_000, 'Saque 24h', 'saque'], [16, -8_500 - i * 50, 'Feira', 'alim-mercado'], [21, -3_000 - i * 50, 'Pastel e caldo de cana', 'alim-padaria']] as [number, number, string, string][])
    .filter(([d]) => past(m, d)).map(([d, cents, title, key]) => ({ ...blankEntry(), account_id: cash.id, date: day(m, d), amount_cents: cents, title, original_title: title, import_key: `demo-cash-${m}-${d}`, category_id: cat(key), person_id: 'p-eu' }))));
  const bills: [string, number, number, string, string, string][] = [
    ['Aluguel', 2350, 6, 'imobiliaria', 'casa-moradia', 'w-meu'], ['Netflix', 55.9, 3, 'netflix', 'ass-streaming', 'w-meu'], ['Vivo Fibra', 129.9, 8, 'vivo', 'casa-internet', 'w-meu'],
    ['Luz', 238.4, 9, 'enel', 'casa-luz', 'w-meu'], ['Spotify', 34.9, 9, 'spotify', 'ass-streaming', 'w-meu'], ['Água', 96.3, 12, 'sabesp', 'casa-agua', 'w-meu'],
    ['Disney+', 43.9, 13, 'disney', 'ass-streaming', 'w-esposa'], ['Escola', 890, 15, 'colegio', 'edu-escola', 'w-esposa'], ['Smart Fit', 119.9, 23, 'smart fit', 'cuidados-academia', 'w-meu'], ['Seguro do carro', 210, 28, 'porto seguro', 'carro-seguro', 'w-meu']
  ];
  const variable = ['Luz', 'Água'];
  const onCardBills = ['Netflix', 'Spotify', 'Disney+'];
  await store.insert('bills', bills.map(([name, v, d, pattern, key, workspace]) => ({ name, amount_cents: Math.round(v * 100), day_of_month: d, match_pattern: pattern, active: true, category_id: cat(key), account_id: null, person_id: null, workspace_id: workspace,
    method: onCardBills.includes(name) ? 'card' : 'account', variable: variable.includes(name), frequency: 'monthly', month_of_year: null }) as Partial<Bill>));
  // Contas que vêm uma vez por ano.
  await store.insert('bills', ([['IPVA do carro', 1853.28, 15, 1, 'ipva', 'carro-impostos'], ['IPTU da casa', 1045.73, 10, 2, 'iptu', 'taxas-impostos'], ['Licenciamento', 174.08, 20, 3, 'licenciamento', 'carro-impostos'], ['Seguro residencial', 389.9, 5, 8, 'seguro residencial', 'casa']] as [string, number, number, number, string, string][])
    .map(([name, v, d, m, pattern, key]) => ({ name, amount_cents: Math.round(v * 100), day_of_month: d, match_pattern: pattern, active: true, category_id: cat(key), account_id: null, person_id: null, workspace_id: 'w-meu', method: 'account', variable: false, frequency: 'yearly', month_of_year: m }) as Partial<Bill>));
}
