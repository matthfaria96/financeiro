/** Minúsculas, sem acentos e com espaços simples: base para comparar descrições. */
export function fold(text: string): string {
  // Atalho: só ASCII visível com espaços simples (o caso comum nos extratos) é só passar para minúsculas.
  if (!/[^\x21-\x7e ]| {2}|^ | $/.test(text)) return text.toLowerCase();
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

/** Bytes de arquivo de banco → texto: UTF-8 (com ou sem BOM), senão Windows-1252 (OFX antigo do Inter). */
export function decode(bytes: Uint8Array): string {
  let data = bytes;
  if (data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) data = data.subarray(3);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(data);
  } catch {
    return new TextDecoder('windows-1252').decode(data);
  }
}

const prefixes = [
  'transferencia enviada pelo pix', 'transferencia recebida pelo pix', 'pix enviado', 'pix recebido',
  'compra no debito', 'compra no debito via nupay', 'pagamento de boleto efetuado', 'pagamento efetuado',
  'transferencia enviada', 'transferencia recebida', 'debito automatico', 'compra debito', 'pix enviado para',
  'pix recebido de', 'compra no cartao', 'transferencia enviada pelo pix via open banking'
];
const acquirerCodes = ['IFD*', 'IFOOD *', 'PAG*', 'PG *', 'MP*', 'MERCADOPAGO*', 'EBN*', 'EC *', 'DL*', 'PAYPAL *', 'HNA*'];
const lowerWords = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'o']);

function looksLikeDocument(text: string): boolean {
  const digits = (text.match(/\d/g) ?? []).length;
  const letters = (text.match(/\p{L}/gu) ?? []).length;
  return text.includes('•') || text.includes('***') || (digits >= 6 && letters < 3);
}

export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map((word, index) => (index > 0 && lowerWords.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
}

/** Nome limpo para mostrar: tira prefixos ("Transferência enviada pelo Pix - "), CPF mascarado,
 *  quem iniciou o Pix por Open Banking, códigos de adquirente ("IFD*") e parcela; põe em formato de título. */
export function displayName(raw: string): string {
  let parts = raw.split(' - ').map((part) => part.trim());
  if (parts.length > 1 && prefixes.some((prefix) => fold(parts[0]).startsWith(prefix))) parts = parts.slice(1);
  let name = parts.find((part) => part && !looksLikeDocument(part) && !fold(part).startsWith('iniciada por')) ?? raw;
  name = name.split(/\s+/).filter(Boolean).join(' ');
  for (const code of acquirerCodes) {
    if (name.toUpperCase().startsWith(code)) name = name.slice(code.length).trim();
  }
  name = name.replace(/\s*-?\s*[Pp]arcela\s*\d+\/\d+\s*$/, '');
  name = name.replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, '');
  if (!name) return raw;
  const letters = name.match(/\p{L}/gu) ?? [];
  const shouting = letters.length > 0 && letters.every((letter) => letter === letter.toUpperCase() && letter !== letter.toLowerCase());
  return shouting ? titleCase(name) : name;
}
