/** Datas de lançamento são DIAS ("2026-10-02"), sem hora nem fuso: nada troca o dia. */
export type Day = string;
export type Month = string; // "2026-10"

export function makeDay(year: number, month: number, day: number): Day | null {
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) return null;
  if (day > daysInMonth(year, month)) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function parts(day: Day): { year: number; month: number; day: number } {
  const [year, month, date] = day.split('-').map(Number);
  return { year, month, day: date };
}

/** Hoje no horário de Brasília. */
export function today(now: Date = new Date()): Day {
  const text = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return text;
}

/** Aceita "2026-10-02", "02/10/2026", "02/10/26", "20261002", "20261002120000[-3:BRT]". */
export function parseDay(raw: string): Day | null {
  const text = raw.trim();
  const compact = text.match(/^(\d{4})(\d{2})(\d{2})/);
  if (compact && !text.includes('/') && (!text.includes('-') || text.includes('[') || /^\d{14}/.test(text))) {
    return makeDay(Number(compact[1]), Number(compact[2]), Number(compact[3]));
  }
  const pieces = text.split(/[/\-. ]/).map((piece) => piece.match(/^\d+/)?.[0] ?? '');
  if (pieces.length < 3 || pieces.slice(0, 3).some((piece) => !piece)) return null;
  const [a, b, c] = pieces.map(Number);
  if (pieces[0].length === 4) return makeDay(a, b, c);
  return makeDay(c < 100 ? 2000 + c : c, b, a);
}

const monthNames: Record<string, number> = {
  jan: 1, fev: 2, feb: 2, mar: 3, abr: 4, apr: 4, mai: 5, may: 5, jun: 6, jul: 7,
  ago: 8, aug: 8, set: 9, sep: 9, out: 10, oct: 10, nov: 11, dez: 12, dec: 12
};

/** "02 OUT" ou "02/10" sem ano: usa o ano de referência (volta um ano se o mês for bem depois). */
export function parseShortDay(raw: string, reference: Day): Day | null {
  const pieces = raw.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[/ -]/).filter(Boolean);
  if (pieces.length < 2) return null;
  const day = Number(pieces[0]);
  const month = Number(pieces[1]) || monthNames[pieces[1].slice(0, 3)];
  if (!day || !month) return null;
  const ref = parts(reference);
  const year = month > ref.month + 1 ? ref.year - 1 : ref.year;
  return makeDay(year, month, day);
}

export function monthOf(day: Day): Month {
  return day.slice(0, 7);
}

export function addMonths(month: Month, delta: number): Month {
  const [year, value] = month.split('-').map(Number);
  const index = year * 12 + (value - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

export function addDays(day: Day, delta: number): Day {
  const { year, month, day: date } = parts(day);
  const value = new Date(Date.UTC(year, month - 1, date + delta));
  return value.toISOString().slice(0, 10);
}

export function diffDays(from: Day, to: Day): number {
  const a = parts(from);
  const b = parts(to);
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86_400_000);
}

export function lastDay(month: Month): Day {
  const [year, value] = month.split('-').map(Number);
  return makeDay(year, value, daysInMonth(year, value)) as Day;
}

/** Dia do mês limitado ao tamanho do mês (31 em fevereiro → 28/29). */
export function clampedDay(month: Month, day: number): Day {
  const [year, value] = month.split('-').map(Number);
  return makeDay(year, value, Math.min(Math.max(day, 1), daysInMonth(year, value))) as Day;
}

const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const weekdayYear = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthLong = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthShort = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });
const monthNarrow = new Intl.DateTimeFormat('pt-BR', { month: 'narrow', timeZone: 'UTC' });

function toDate(day: Day): Date {
  const { year, month, day: date } = parts(day);
  return new Date(Date.UTC(year, month - 1, date));
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "Sexta-feira, 2 de outubro" (com ano quando não é o ano atual). */
export function dayHeader(day: Day): string {
  const sameYear = day.slice(0, 4) === today().slice(0, 4);
  return capitalize((sameYear ? weekday : weekdayYear).format(toDate(day)));
}

/** "Outubro 2026". */
export function monthTitle(month: Month): string {
  return capitalize(monthLong.format(toDate(`${month}-01`)).replace(' de ', ' '));
}

/** "Out 2026". */
export function shortMonth(month: Month): string {
  return `${capitalize(monthShort.format(toDate(`${month}-01`)).replace('.', ''))} ${month.slice(0, 4)}`;
}

export function monthInitial(month: Month): string {
  return monthNarrow.format(toDate(`${month}-01`)).toUpperCase();
}

/** "25/10" no ano atual, "25/10/2025" nos outros. */
export function dayMonth(day: Day): string {
  const { year, month, day: date } = parts(day);
  const base = `${String(date).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
  return String(year) === today().slice(0, 4) ? base : `${base}/${year}`;
}

export function shortDate(day: Day): string {
  const { year, month, day: date } = parts(day);
  return `${String(date).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}
