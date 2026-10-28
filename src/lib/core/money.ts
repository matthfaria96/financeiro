/** Valores sempre em centavos inteiros (nunca float). Negativo = saída. */
export type MoneyStyle = 'automatic' | 'comma' | 'dot';

/** Aceita "R$ 1.234,56", "-1.234,56", "R$ -12,30", "(12,30)", "1234.5", "1.500" (mil e quinhentos). */
export function parseCents(raw: string, style: MoneyStyle = 'automatic'): number | null {
  let text = raw.trim();
  if (!text) return null;
  let negative = false;
  if (text.startsWith('(') && text.endsWith(')')) {
    negative = true;
    text = text.slice(1, -1);
  }
  if (/[-−]/.test(text)) negative = true;
  if (/D$/i.test(text) && !/USD$/i.test(text)) negative = true;
  const kept = text.replace(/[^\d.,]/g, '');
  if (!/\d/.test(kept)) return null;
  const separator = decimalSeparator(kept, style);
  let integer = kept;
  let fraction = '';
  if (separator) {
    const index = kept.lastIndexOf(separator);
    integer = kept.slice(0, index);
    fraction = kept.slice(index + 1);
  }
  const integerDigits = integer.replace(/\D/g, '') || '0';
  let fractionDigits = fraction.replace(/\D/g, '');
  let roundUp = false;
  if (fractionDigits.length > 2) {
    roundUp = Number(fractionDigits[2]) >= 5;
    fractionDigits = fractionDigits.slice(0, 2);
  }
  fractionDigits = fractionDigits.padEnd(2, '0');
  const total = Number(integerDigits) * 100 + Number(fractionDigits) + (roundUp ? 1 : 0);
  if (!Number.isFinite(total)) return null;
  return negative ? -total : total;
}

function decimalSeparator(text: string, style: MoneyStyle): string | null {
  if (style === 'comma') return text.includes(',') ? ',' : null;
  if (style === 'dot') return text.includes('.') ? '.' : null;
  const comma = text.lastIndexOf(',');
  const dot = text.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) return comma > dot ? ',' : '.';
  if (comma >= 0) return text.length - comma - 1 <= 2 ? ',' : null;
  if (dot >= 0) {
    const after = text.length - dot - 1;
    const dots = text.split('.').length - 1;
    return after === 3 || dots > 1 ? null : '.';
  }
  return null;
}

const full = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const whole = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0, minimumFractionDigits: 0 });

/** "R$ 1.234,56"; `cents: false` → "R$ 1.235". */
export function money(cents: number, options: { cents?: boolean } = {}): string {
  const value = cents / 100;
  return (options.cents === false ? whole : full).format(value).replace(/ /g, ' ');
}

/** "R$ 40 mil" para eixos de gráfico. */
export function compactMoney(cents: number): string {
  const reais = cents / 100;
  if (Math.abs(reais) >= 1_000_000) return `R$ ${(reais / 1_000_000).toFixed(1).replace('.', ',')} mi`;
  if (Math.abs(reais) >= 1_000) return `R$ ${Math.round(reais / 1_000)} mil`;
  return `R$ ${Math.round(reais)}`;
}

export function percent(value: number, signed = false): string {
  const number = Math.round(Math.abs(value) * 100);
  if (!signed) return `${number}%`;
  return value >= 0 ? `+${number}%` : `−${number}%`;
}

/** Centavos → texto para campo de edição ("1234,56"). */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}
