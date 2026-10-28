import { parseCents, type MoneyStyle } from './money';
import { parseDay } from './dates';
import { fold } from './text';
import { errors, ImportError, transaction, type Bank, type ImportedStatement, type ImportedTransaction } from './statement';

/** OFX 1.x (SGML) e 2.x (XML), como exportam Nubank e Inter. */
export function looksLikeOFX(text: string): boolean {
  const head = text.slice(0, 4096).toUpperCase();
  return head.includes('OFXHEADER') || head.includes('<OFX>');
}

export function bankFromId(id: string): Bank {
  const number = Number(id.replace(/\D/g, ''));
  if (number === 260) return 'nubank';
  if (number === 77) return 'inter';
  return 'other';
}

export function ofxStyle(text: string): MoneyStyle {
  if (text.includes(',') && text.includes('.')) return 'automatic';
  return text.includes(',') ? 'comma' : 'dot';
}

function decodeEntities(text: string): string {
  return text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&apos;/g, "'").replace(/&quot;/g, '"');
}

export function firstValue(tag: string, text: string): string | undefined {
  const match = new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i').exec(text);
  const value = match?.[1].trim();
  return value ? decodeEntities(value) : undefined;
}

export function blocks(tag: string, text: string): string[] {
  const result: string[] = [];
  const upper = text.toUpperCase();
  const open = `<${tag.toUpperCase()}>`;
  const close = `</${tag.toUpperCase()}>`;
  let cursor = 0;
  for (;;) {
    const start = upper.indexOf(open, cursor);
    if (start < 0) break;
    const body = start + open.length;
    const closeAt = upper.indexOf(close, body);
    const nextAt = upper.indexOf(open, body);
    const end = closeAt >= 0 && (nextAt < 0 || closeAt < nextAt) ? closeAt : nextAt >= 0 ? nextAt : text.length;
    result.push(text.slice(body, end));
    cursor = closeAt >= 0 && end === closeAt ? closeAt + close.length : end;
  }
  return result;
}

export function parseOFX(text: string): ImportedStatement {
  const upper = text.toUpperCase();
  const isCard = upper.includes('<CREDITCARDMSGSRSV1>') || upper.includes('<CCSTMTRS>');
  let bank = bankFromId(firstValue('BANKID', text) ?? firstValue('FID', text) ?? '');
  if (bank === 'other') {
    const org = fold(firstValue('ORG', text) ?? '');
    if (org.includes('nu pagamentos') || org.includes('nubank')) bank = 'nubank';
    else if (org.includes('inter')) bank = 'inter';
  }
  const seen = new Map<string, number>();
  const transactions: ImportedTransaction[] = [];
  for (const block of blocks('STMTTRN', text)) {
    const date = parseDay(firstValue('DTPOSTED', block) ?? '');
    const amountText = firstValue('TRNAMT', block);
    const cents = amountText ? parseCents(amountText, ofxStyle(amountText)) : null;
    if (!date || cents === null) continue;
    const name = firstValue('NAME', block) ?? '';
    const memo = firstValue('MEMO', block) ?? '';
    const title = memo.length > name.length ? memo : name || memo;
    let fitId = firstValue('FITID', block);
    if (fitId) {
      // Alguns bancos repetem o FITID em lançamentos diferentes do mesmo arquivo.
      const occurrence = seen.get(fitId) ?? 0;
      seen.set(fitId, occurrence + 1);
      if (occurrence > 0) fitId = `${fitId}#${occurrence}`;
    }
    transactions.push(transaction({ date, amountCents: cents, title: title || 'Lançamento', memo: memo === title ? name : memo, externalId: fitId }));
  }
  if (!transactions.length) throw new ImportError(errors.empty);
  const ledger = blocks('LEDGERBAL', text)[0];
  const balanceText = ledger ? firstValue('BALAMT', ledger) : undefined;
  const balance = balanceText ? parseCents(balanceText, 'dot') ?? undefined : undefined;
  const balanceDate = ledger ? parseDay(firstValue('DTASOF', ledger) ?? '') ?? undefined : undefined;
  return {
    bank,
    kind: isCard ? 'creditCard' : 'checking',
    format: 'ofx',
    accountId: firstValue('ACCTID', text),
    balanceCents: isCard ? undefined : balance,
    balanceDate: isCard ? undefined : balanceDate,
    transactions: transactions.sort((a, b) => a.date.localeCompare(b.date)),
    warnings: []
  };
}
