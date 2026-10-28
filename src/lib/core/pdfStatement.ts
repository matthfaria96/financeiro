import { parseCents } from './money';
import { parseDay, parseShortDay, makeDay, today, type Day } from './dates';
import { fold } from './text';
import { errors, ImportError, transaction, type Bank, type ImportedStatement, type ImportedTransaction } from './statement';

const skipWords = ['total', 'saldo', 'pagamento minimo', 'limite', 'vencimento', 'encargos', 'juros rotativo', 'valor minimo', 'fatura anterior', 'subtotal', 'resumo'];
const linePattern = /^\s*(\d{2}[/ ](?:\d{2}|[A-Za-zÇç]{3})(?:[/ ]\d{2,4})?)\s+(.+?)\s+(-?\s*R?\$?\s*-?(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2})\s*$/;

export function parsePDFLine(line: string, reference: Day): { date: Day; title: string; cents: number } | null {
  const match = linePattern.exec(line);
  if (!match) return null;
  const dateText = match[1];
  const hasYear = (dateText.match(/\d/g) ?? []).length > 4;
  const date = hasYear ? parseDay(dateText) : parseShortDay(dateText, reference);
  const cents = parseCents(match[3], 'comma');
  const title = match[2].trim();
  const folded = fold(title);
  if (!date || cents === null || !/\p{L}/u.test(title)) return null;
  if (skipWords.some((word) => folded === word || folded.startsWith(`${word} `))) return null;
  return { date, title, cents };
}

function referenceDate(text: string): Day | null {
  const found: Day[] = [];
  for (const match of text.matchAll(/(\d{2}\/\d{2}\/\d{4})/g)) {
    const day = parseDay(match[1]);
    if (day) found.push(day);
  }
  for (const match of text.matchAll(/\b(\d{1,2})\s+(?:de\s+)?([a-zç]{3})[a-zç]*\.?\s+(?:de\s+)?(\d{4})\b/gi)) {
    const short = parseShortDay(`${match[1]} ${match[2]}`, `${match[3]}-12-31`);
    if (short) found.push(makeDay(Number(match[3]), Number(short.slice(5, 7)), Number(short.slice(8, 10))) ?? short);
  }
  return found.sort().pop() ?? null;
}

/** Leitura aproximada a partir do texto do PDF (linhas "data … descrição … valor"). */
export function parsePDFText(text: string): ImportedStatement {
  const folded = fold(text);
  const bank: Bank = folded.includes('nu pagamentos') || folded.includes('nubank') ? 'nubank'
    : folded.includes('banco inter') || folded.includes('inter&co') || folded.includes('bancointer') ? 'inter' : 'other';
  const isCard = folded.includes('fatura') && (folded.includes('cartao') || folded.includes('vencimento'));
  const reference = referenceDate(text) ?? today();
  const transactions: ImportedTransaction[] = [];
  for (const line of text.split(/\r?\n/)) {
    const parsed = parsePDFLine(line, reference);
    if (parsed) transactions.push(transaction({ date: parsed.date, amountCents: isCard ? -parsed.cents : parsed.cents, title: parsed.title }));
  }
  if (!transactions.length) throw new ImportError(errors.pdf);
  return {
    bank,
    kind: isCard ? 'creditCard' : 'checking',
    format: 'pdf',
    transactions: transactions.sort((a, b) => a.date.localeCompare(b.date)),
    warnings: ['PDF lido por aproximação: confira valores e sinais. OFX ou CSV do mesmo período é mais seguro.']
  };
}

/** Extrai o texto do PDF com o pdf.js, carregado só quando alguém importa um PDF. */
export async function pdfToText(bytes: Uint8Array): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const document = await pdfjs.getDocument({ data: bytes }).promise;
  const lines: string[] = [];
  for (let index = 1; index <= document.numPages; index++) {
    const page = await document.getPage(index);
    const content = await page.getTextContent();
    // Junta os pedaços de texto por linha (mesma altura na página).
    const rows = new Map<number, { x: number; text: string }[]>();
    for (const item of content.items) {
      if (!('str' in item)) continue;
      const y = Math.round(item.transform[5]);
      const list = rows.get(y) ?? [];
      list.push({ x: item.transform[4], text: item.str });
      rows.set(y, list);
    }
    [...rows.entries()].sort((a, b) => b[0] - a[0]).forEach(([, items]) => {
      lines.push(items.sort((a, b) => a.x - b.x).map((item) => item.text).join(' ').replace(/\s+/g, ' ').trim());
    });
  }
  return lines.join('\n');
}
