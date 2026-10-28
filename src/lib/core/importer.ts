import { parseCSVStatement } from './csvStatement';
import { looksLikeOFX, parseOFX } from './ofx';
import { parsePDFText, pdfToText } from './pdfStatement';
import { errors, ImportError, type ImportedStatement } from './statement';
import { decode } from './text';

export function looksLikePDF(bytes: Uint8Array): boolean {
  return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

/** O Nubank põe o número da conta no nome do arquivo: "NU_42584364_01SET2026_30SET2026.csv". */
export function accountNumberInFileName(name: string): string | undefined {
  return name.match(/^NU_(\d{5,})_/)?.[1];
}

/** Texto (OFX/CSV) → extrato. */
export function parseStatementText(text: string, fileName = ''): ImportedStatement {
  if (!text.trim()) throw new ImportError(errors.unreadable);
  const statement = looksLikeOFX(text) ? parseOFX(text) : parseCSVStatement(text);
  return withFileNameHints(statement, fileName);
}

/** Qualquer arquivo de banco (bytes) → extrato. */
export async function parseStatement(bytes: Uint8Array, fileName = ''): Promise<ImportedStatement> {
  if (looksLikePDF(bytes)) return withFileNameHints(parsePDFText(await pdfToText(bytes)), fileName);
  return parseStatementText(decode(bytes), fileName);
}

function withFileNameHints(statement: ImportedStatement, fileName: string): ImportedStatement {
  const number = statement.accountId ? undefined : accountNumberInFileName(fileName);
  if (!number) return statement;
  return { ...statement, accountId: number, bank: statement.bank === 'other' ? 'nubank' : statement.bank };
}
