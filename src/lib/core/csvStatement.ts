import { csvRows, detectDelimiter } from './csv';
import { parseCents } from './money';
import { parseDay } from './dates';
import { fold } from './text';
import { errors, ImportError, parseInstallment, transaction, type Bank, type ImportedStatement, type ImportedTransaction, type StatementKind } from './statement';

type Column = 'date' | 'amount' | 'description' | 'id' | 'category' | 'type' | 'balance';

const synonyms: Record<Column, string[]> = {
  date: ['data', 'date', 'data lancamento', 'data de lancamento', 'data da compra', 'data compra', 'data movimento', 'data mov.'],
  amount: ['valor', 'amount', 'valor (r$)', 'valor r$', 'valor em r$', 'valor(r$)'],
  description: ['historico', 'descricao', 'title', 'lancamento', 'estabelecimento', 'description', 'detalhes', 'descricao do lancamento'],
  id: ['identificador', 'id', 'fitid'],
  category: ['categoria', 'category'],
  type: ['tipo'],
  balance: ['saldo', 'saldo (r$)', 'balance']
};

interface Layout {
  headerIndex: number;
  delimiter: string;
  columns: Partial<Record<Column, number[]>>;
  headers: string[];
}

function findLayout(lines: string[]): Layout | null {
  for (let index = 0; index < Math.min(lines.length, 30); index++) {
    const line = lines[index];
    if (!line.trim()) continue;
    const delimiter = detectDelimiter(line);
    const headers = (csvRows(line, delimiter)[0] ?? []).map((header) => fold(header).replace(/^["' ]+|["' ]+$/g, ''));
    const columns: Partial<Record<Column, number[]>> = {};
    headers.forEach((header, position) => {
      for (const column of Object.keys(synonyms) as Column[]) {
        if (synonyms[column].includes(header)) (columns[column] ??= []).push(position);
      }
    });
    if (columns.date && columns.amount) return { headerIndex: index, delimiter, columns, headers };
  }
  return null;
}

function identify(headers: Set<string>, preamble: string): [Bank, StatementKind] {
  const same = (list: string[]) => headers.size === list.length && list.every((item) => headers.has(item));
  if (same(['date', 'title', 'amount']) || same(['date', 'category', 'title', 'amount'])) return ['nubank', 'creditCard'];
  if (headers.has('identificador') && headers.has('descricao')) return ['nubank', 'checking'];
  if (headers.has('lancamento') && headers.has('tipo')) return ['inter', 'creditCard'];
  const interHint = preamble.includes('inter') || preamble.includes('extrato conta corrente');
  if (headers.has('data lancamento') && (headers.has('saldo') || headers.has('historico') || interHint)) return ['inter', 'checking'];
  return ['other', preamble.includes('fatura') || preamble.includes('cartao') ? 'creditCard' : 'checking'];
}

function value(row: string[], layout: Layout, column: Column): string | undefined {
  const index = layout.columns[column]?.[0];
  const text = index !== undefined ? row[index]?.trim() : undefined;
  return text ? text : undefined;
}

/** CSVs do Nubank (conta e fatura), do Inter (conta e fatura) e, por aproximação, qualquer CSV. */
export function parseCSVStatement(text: string): ImportedStatement {
  const lines = text.split(/\r\n|\n|\r/);
  const layout = findLayout(lines);
  if (!layout) throw new ImportError(errors.unknown);
  const rows = csvRows(lines.slice(layout.headerIndex + 1).join('\n'), layout.delimiter);
  const preamble = fold(lines.slice(0, layout.headerIndex).join(' '));
  const [bank, kind] = identify(new Set(layout.headers.filter(Boolean)), preamble);
  const parsed: { transaction: ImportedTransaction; balance?: number }[] = [];
  for (const row of rows) {
    const date = parseDay(value(row, layout, 'date') ?? '');
    const amountText = value(row, layout, 'amount');
    let cents = amountText ? parseCents(amountText) : null;
    if (!date || cents === null) continue;
    if (kind === 'creditCard') cents = -cents;
    const descriptions = (layout.columns.description ?? []).map((index) => row[index]?.trim()).filter(Boolean);
    const title = descriptions.join(' - ');
    const type = value(row, layout, 'type') ?? '';
    const balanceText = value(row, layout, 'balance');
    parsed.push({
      transaction: transaction({
        date,
        amountCents: cents,
        title: title || 'Lançamento',
        memo: type,
        externalId: value(row, layout, 'id'),
        bankCategory: value(row, layout, 'category'),
        installment: parseInstallment(type)
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
    balanceCents: kind === 'checking' ? newest.balance : undefined,
    balanceDate: kind === 'checking' && newest.balance !== undefined ? newest.transaction.date : undefined,
    transactions: parsed.map((item) => item.transaction).sort((a, b) => a.date.localeCompare(b.date)),
    warnings: bank === 'other' ? ['Banco não identificado pelo cabeçalho. Confira se entradas e saídas estão com o sinal certo.'] : []
  };
}
