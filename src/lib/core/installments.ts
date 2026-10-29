import { addMonths, clampedDay, diffDays, monthOf, type Day, type Month } from './dates';
import { fold } from './text';

/**
 * Compras parceladas no cartão. Cada fatura traz só a parcela do mês ("Parcela 7/12", com o valor da parcela).
 * Para mostrar a compra inteira no mês em que foi feita, junta as parcelas da mesma compra e calcula:
 * valor = parcela × número de parcelas; mês = o da parcela menos (n − 1).
 * A data muda de banco para banco: o Nubank põe nas parcelas 2, 3… a data de início da fatura; o C6 e outros
 * repetem a data original. Se a data cai dentro da fatura em que a parcela é paga, é a da fatura (volta os meses);
 * se é bem mais antiga, já é a data da compra.
 */
export interface Parcel {
  id: string;
  account: string;
  title: string;
  date: Day;
  /** Vencimento da fatura em que esta parcela é paga. */
  due: Day | null;
  cents: number;
  current: number;
  total: number;
}

/** Até quantos dias antes do vencimento uma data ainda é "da fatura" (ciclo de ~30 dias + folga). */
const CYCLE_DAYS = 45;

export const stripInstallment = (title: string) =>
  title.replace(/\s*[-–]?\s*parcela\s*\d{1,2}\s*(?:\/|de)\s*\d{1,2}\s*$/i, '').replace(/\s+\d{1,2}\/\d{1,2}\s*$/, '').trim();

export function purchaseOf(parcel: Parcel): { month: Month; date: Day; cents: number } {
  const posted = parcel.current > 1 && (!parcel.due || diffDays(parcel.date, parcel.due) <= CYCLE_DAYS);
  const month = posted ? addMonths(monthOf(parcel.date), -(parcel.current - 1)) : monthOf(parcel.date);
  const date = posted ? clampedDay(month, Number(parcel.date.slice(8, 10))) : parcel.date;
  return { month, date, cents: parcel.cents * parcel.total };
}

export const purchaseKey = (parcel: Parcel) => [parcel.account, fold(stripInstallment(parcel.title)), parcel.cents, parcel.total, purchaseOf(parcel).month].join('|');

/** Uma parcela por compra (a de menor número): só ela leva o valor inteiro, as outras não contam de novo. */
export function purchaseRepresentatives(parcels: Parcel[]): Set<string> {
  const best = new Map<string, Parcel>();
  for (const parcel of parcels) {
    const key = purchaseKey(parcel);
    const seen = best.get(key);
    if (!seen || parcel.current < seen.current) best.set(key, parcel);
  }
  return new Set([...best.values()].map((p) => p.id));
}
