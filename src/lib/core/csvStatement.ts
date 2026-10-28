import { csvRows, detectDelimiter } from './csv';
import { parseCents } from './money';
import { parseDay, type Day } from './dates';
import { fold } from './text';
import { bankFromText } from './banks';
import { errors, ImportError, parseInstallment, transaction, type Bank, type ImportedStatement, type ImportedTransaction, type StatementKind } from './statement';

type Column = 'date' | 'amount' | 'credit' | 'debit' | 'direction' | 'description' | 'id' | 'category' | 'type' | 'installment' | 'balance';

const synonyms: Record<Column, string[]> = {
  date: ['data', 'date', 'data lancamento', 'data de lancamento', 'data da compra', 'data compra', 'data de compra', 'data movimento', 'data mov.',
    'data da transacao', 'data transacao', 'release_date', 'dt. lancamento', 'dt lancamento'],
  amount: ['valor', 'amount', 'valor (r$)', 'valor r$', 'valor em r$', 'valor (em r$)', 'valor em reais', 'valor lancamento', 'transaction_net_amount', 'valor liquido'],
  credit: ['entrada', 'entrada (r$)', 'entradas', 'credito', 'credito (r$)', 'creditos', 'valor credito', 'credit'],
  debit: ['saida', 'saida (r$)', 'saidas', 'debito', 'debito (r$)', 'debitos', 'valor debito', 'debit'],
  direction: ['tipo lancamento', 'tipo de lancamento', 'natureza', 'd/c', 'c/d', 'debito/credito', 'credito/debito', 'entrada/saida'],
  description: ['historico', 'descricao', 'title', 'lancamento', 'estabelecimento', 'description', 'detalhes', 'descricao do lancamento', 'titulo',
    'transaction_type', 'nome', 'memo'],
  id: ['identificador', 'id', 'fitid', 'reference_id', 'n° documento', 'no documento', 'numero documento', 'documento', 'n. documento'],
  category: ['categoria', 'category'],
  type: ['tipo'],
  installment: ['parcela', 'parcelas'],
  balance: ['saldo', 'saldo (r$)', 'balance', 'saldo do dia', 'saldo do dia (r$)', 'partial_balance', 'saldo apos lancamento']
};

/** Compara cabeçalhos sem espaços: "Valor (R$)", "Valor(R$)" e "VALOR R$" viram a mesma coisa. */
const compact = (text: string) => text.replace(/[\s.]+/g, '');
const lookup = new Map<string, Column>();
for (const column of Object.keys(synonyms) as Column[]) for (const name of synonyms[column]) lookup.set(compact(name), column);

interface Layout {
  headerIndex: number;
  delimiter: string;
  columns: Partial<Record<Column, number[]>>;
  headers: string[];
}

function findLayout(lines: string[]): Layout | null {
  for (let index = 0; index < Math.min(lines.length, 40); index++) {
    const line = lines[index];
    if (!line.trim()) continue;
    const delimiter = detectDelimiter(line);
    const headers = (csvRows(line, delimiter)[0] ?? []).map((header) => fold(header).replace(/^["' ]+|["' ]+$/g, ''));
    const columns: Partial<Record<Column, number[]>> = {};
    headers.forEach((header, position) => {
      const column = lookup.get(compact(header));
      if (column) (columns[column] ??= []).push(position);
    });
    if (columns.date && (columns.amount || columns.credit || columns.debit)) return { headerIndex: index, delimiter, columns, headers };
  }
  return null;
}

function identify(headers: Set<string>, preamble: string): [Bank, StatementKind] {
  const same = (list: string[]) => headers.size === list.length && list.every((item) => headers.has(item));
  const has = (...names: string[]) => names.every((name) => headers.has(name));
  if (same(['date', 'title', 'amount']) || same(['date', 'category', 'title', 'amount'])) return ['nubank', 'creditCard'];
  if (has('identificador', 'descricao')) return ['nubank', 'checking'];
  if (has('lancamento', 'tipo')) return ['inter', 'creditCard'];
  // Fatura do C6: "Data de Compra;Nome no Cartão;Final do Cartão;Categoria;Descrição;Parcela;Valor (em US$);Cotação (em R$);Valor (em R$)"
  if (has('final do cartao') && [...headers].some((h) => compact(h) === 'valor(emr$)')) return ['c6', 'creditCard'];
  if (has('data contabil', 'titulo')) return ['c6', 'checking'];
  const interHint = preamble.includes('inter') || preamble.includes('extrato conta corrente');
  if (headers.has('data lancamento') && (headers.has('saldo') || headers.has('historico') || interHint)) return ['inter', 'checking'];
  // Banco do Brasil: "Data","Lançamento","Detalhes","N° documento","Valor","Tipo Lançamento"
  if (has('lancamento', 'detalhes')) return ['bb', 'checking'];
  if (has('transaction_net_amount')) return ['mercadopago', 'checking'];
  const card = preamble.includes('fatura') || preamble.includes('cartao') || has('final do cartao') || has('data de compra');
  return [bankFromText(preamble), card ? 'creditCard' : 'checking'];
}

/** Linhas de saldo que alguns bancos põem no meio do extrato (BB, Caixa, Itaú). */
const closingBalanceRows = new Set(['saldo', 'saldododia', 'saldofinal', 'saldodisponivel', 'saldoatual', 'saldototal']);
const openingBalanceRows = new Set(['saldoanterior', 'saldoinicial', 'saldodoperiodoanterior']);

function value(row: string[], layout: Layout, column: Column): string | undefined {
  const index = layout.columns[column]?.[0];
  const text = index !== undefined ? row[index]?.trim() : undefined;
  return text ? text : undefined;
}

/** Valor da linha: coluna única com sinal, ou Entrada/Saída separadas; "D"/"Saída" numa coluna própria vira negativo. */
function rowCents(row: string[], layout: Layout): number | null {
  const amountText = value(row, layout, 'amount');
  let cents: number | null;
  if (amountText) {
    cents = parseCents(amountText);
  } else {
    const credit = parseCents(value(row, layout, 'credit') ?? '');
    const debit = parseCents(value(row, layout, 'debit') ?? '');
    if (credit === null && debit === null) return null;
    cents = Math.abs(credit ?? 0) - Math.abs(debit ?? 0);
  }
  if (cents === null) return null;
  const direction = fold(value(row, layout, 'direction') ?? '');
  if (['d', 'debito', 'saida', 'saidas', '-'].includes(direction)) return -Math.abs(cents);
  if (['c', 'credito', 'entrada', 'entradas', '+'].includes(direction)) return Math.abs(cents);
  return cents;
}

/** CSVs do Nubank e do Inter (conta e fatura), do C6, BB e Mercado Pago e, por aproximação, de qualquer banco. */
export function parseCSVStatement(text: string): ImportedStatement {
  const lines = text.split(/\r\n|\n|\r/);
  const layout = findLayout(lines);
  if (!layout) throw new ImportError(errors.unknown);
  const rows = csvRows(lines.slice(layout.headerIndex + 1).join('\n'), layout.delimiter);
  const preamble = fold(lines.slice(0, layout.headerIndex).join(' '));
  const [bank, kind] = identify(new Set(layout.headers.filter(Boolean)), preamble);
  const parsed: { transaction: ImportedTransaction; balance?: number }[] = [];
  let balanceRow: { date: Day; cents: number } | undefined;
  for (const row of rows) {
    const date = parseDay(value(row, layout, 'date') ?? '');
    let cents = rowCents(row, layout);
    if (!date || cents === null) continue;
    const descriptions = (layout.columns.description ?? []).map((index) => row[index]?.trim()).filter(Boolean);
    const title = descriptions.join(' - ');
    const key = compact(fold(descriptions[0] ?? '')).replace(/[^a-z]/g, '');
    if (closingBalanceRows.has(key)) {
      if (!balanceRow || date >= balanceRow.date) balanceRow = { date, cents };
      continue;
    }
    if (openingBalanceRows.has(key)) continue;
    if (kind === 'creditCard') cents = -cents;
    const type = value(row, layout, 'type') ?? '';
    const installmentText = value(row, layout, 'installment') ?? type;
    const balanceText = value(row, layout, 'balance');
    parsed.push({
      transaction: transaction({
        date,
        amountCents: cents,
        title: title || 'Lançamento',
        memo: type,
        externalId: value(row, layout, 'id'),
        bankCategory: value(row, layout, 'category'),
        installment: parseInstallment(installmentText)
      }),
      balance: balanceText ? parseCents(balanceText) ?? undefined : undefined
    });
  }
  if (!parsed.length) throw new ImportError(errors.empty);
  // Saldo final: a linha mais recente. A ordem vem do primeiro par de datas diferentes;
  // arquivo de um dia só: o Inter lista do mais novo para o mais antigo.
  const dates = parsed.map((item) => item.transaction.date);
  const changeAt = dates.findIndex((date, index) => index > 0 && date !== dates[index - 1]);
  const descending = changeAt > 0 ? dates[changeAt - 1] > dates[changeAt] : bank === 'inter';
  const newest = descending ? parsed[0] : parsed[parsed.length - 1];
  let accountId: string | undefined;
  for (const line of lines.slice(0, layout.headerIndex)) {
    if (fold(line).startsWith('conta')) {
      const digits = line.replace(/[^\d-]/g, '');
      if ((digits.match(/\d/g) ?? []).length >= 4) accountId = digits;
    }
  }
  return {
    bank,
    kind,
    format: 'csv',
    accountId,
    balanceCents: kind === 'checking' ? newest.balance ?? balanceRow?.cents : undefined,
    balanceDate: kind === 'checking' ? (newest.balance !== undefined ? newest.transaction.date : balanceRow?.date) : undefined,
    transactions: parsed.map((item) => item.transaction).sort((a, b) => a.date.localeCompare(b.date)),
    warnings: bank === 'other' ? ['Banco não identificado pelo cabeçalho. Confira se entradas e saídas estão com o sinal certo.'] : []
  };
}
