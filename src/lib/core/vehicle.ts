import { diffDays, parts, makeDay, type Day } from './dates';

/** Abastecimento como sai do banco de dados (só o que as contas precisam). */
export interface FuelFill {
  id: string;
  date: Day;
  odometer: number | null;
  liters: number | null;
  amount_cents: number;
  full_tank: boolean;
}

export interface FillStats {
  /** Km rodados desde o último tanque cheio (só em tanque cheio). */
  distance: number | null;
  kmPerLiter: number | null;
  pricePerLiter: number | null;
}

/**
 * Consumo pelo método do tanque cheio: km desde o último tanque cheio ÷ litros colocados desde então
 * (incluindo este). Com todo abastecimento cheio, é o mesmo que (km − km anterior) ÷ litros.
 */
export function fillStats(fills: FuelFill[]): Map<string, FillStats> {
  const ordered = fills
    .filter((fill) => fill.odometer !== null)
    .toSorted((a, b) => (a.odometer! - b.odometer!) || a.date.localeCompare(b.date));
  const result = new Map<string, FillStats>();
  let lastFull: number | null = null;
  let litersSince = 0;
  for (const fill of ordered) {
    litersSince += fill.liters ?? 0;
    let distance: number | null = null;
    let kmPerLiter: number | null = null;
    if (fill.full_tank) {
      if (lastFull !== null && litersSince > 0 && fill.odometer! > lastFull) {
        distance = fill.odometer! - lastFull;
        kmPerLiter = distance / litersSince;
      }
      lastFull = fill.odometer;
      litersSince = 0;
    }
    result.set(fill.id, { distance, kmPerLiter, pricePerLiter: pricePerLiter(fill) });
  }
  for (const fill of fills) if (!result.has(fill.id)) result.set(fill.id, { distance: null, kmPerLiter: null, pricePerLiter: pricePerLiter(fill) });
  return result;
}

const pricePerLiter = (fill: FuelFill) => (fill.liters && fill.liters > 0 ? fill.amount_cents / 100 / fill.liters : null);

/** Média geral: soma das distâncias ÷ soma dos litros dos trechos medidos; custo por km no mesmo trecho. */
export function fuelSummary(fills: FuelFill[]): { kmPerLiter: number | null; costPerKm: number | null; distance: number } {
  const stats = fillStats(fills);
  const ordered = fills.filter((f) => f.odometer !== null).toSorted((a, b) => a.odometer! - b.odometer!);
  let distance = 0;
  let liters = 0;
  let cents = 0;
  let pendingLiters = 0;
  let pendingCents = 0;
  let started = false;
  for (const fill of ordered) {
    if (!started) {
      if (fill.full_tank) started = true;
      continue;
    }
    pendingLiters += fill.liters ?? 0;
    pendingCents += fill.amount_cents;
    const measured = stats.get(fill.id)?.distance;
    if (fill.full_tank && measured) {
      distance += measured;
      liters += pendingLiters;
      cents += pendingCents;
      pendingLiters = 0;
      pendingCents = 0;
    }
  }
  return { kmPerLiter: liters > 0 ? distance / liters : null, costPerKm: distance > 0 ? cents / 100 / distance : null, distance };
}

/** Km atual: o maior entre o informado no carro e o de qualquer registro. */
export function currentOdometer(informed: number | null, logs: { odometer: number | null }[]): number | null {
  const values = [informed, ...logs.map((log) => log.odometer)].filter((value): value is number => value !== null && value > 0);
  return values.length ? Math.max(...values) : null;
}

export interface MaintenanceRule {
  every_km: number | null;
  every_months: number | null;
  last_km: number | null;
  last_date: Day | null;
}

export type DueState = 'ok' | 'soon' | 'overdue' | 'unknown';

export interface DueInfo {
  state: DueState;
  dueKm: number | null;
  dueDate: Day | null;
  kmLeft: number | null;
  daysLeft: number | null;
}

/** "Avisar antes": faltando até 1.000 km ou 30 dias. */
export const SOON_KM = 1000;
export const SOON_DAYS = 30;

export function addMonthsToDay(day: Day, months: number): Day {
  const { year, month, day: date } = parts(day);
  const total = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(total / 12);
  const targetMonth = (total % 12) + 1;
  for (let d = date; d >= 28; d--) {
    const result = makeDay(targetYear, targetMonth, d);
    if (result) return result;
  }
  return makeDay(targetYear, targetMonth, Math.min(date, 28))!;
}

/** O que vence primeiro (km ou tempo) manda no aviso. Sem registro da última vez: "unknown". */
export function maintenanceDue(rule: MaintenanceRule, odometer: number | null, now: Day): DueInfo {
  const dueKm = rule.every_km && rule.last_km !== null ? rule.last_km + rule.every_km : null;
  const dueDate = rule.every_months && rule.last_date ? addMonthsToDay(rule.last_date, rule.every_months) : null;
  const kmLeft = dueKm !== null && odometer !== null ? dueKm - odometer : null;
  const daysLeft = dueDate ? diffDays(now, dueDate) : null;
  if (kmLeft === null && daysLeft === null) return { state: 'unknown', dueKm, dueDate, kmLeft, daysLeft };
  const overdue = (kmLeft !== null && kmLeft <= 0) || (daysLeft !== null && daysLeft <= 0);
  const soon = (kmLeft !== null && kmLeft <= SOON_KM) || (daysLeft !== null && daysLeft <= SOON_DAYS);
  return { state: overdue ? 'overdue' : soon ? 'soon' : 'ok', dueKm, dueDate, kmLeft, daysLeft };
}

/** Plano de revisão comum para carro flex de passeio (o usuário ajusta pelo manual do carro). */
export const defaultMaintenancePlan: { name: string; description: string; every_km: number | null; every_months: number | null }[] = [
  { name: 'Revisão (óleo e filtros)', description: 'Óleo, filtro de óleo, filtro de ar, filtro de cabine e filtro de combustível.', every_km: 10_000, every_months: 12 },
  { name: 'Pneus: rodízio, alinhamento e balanceamento', description: 'Rodízio e alinhamento a cada 10 mil km; troca dos pneus entre 40 e 60 mil km.', every_km: 10_000, every_months: 12 },
  { name: 'Suspensão (inspeção)', description: 'Não precisa trocar: inspecionar a cada 20 mil km ou uma vez por ano.', every_km: 20_000, every_months: 12 },
  { name: 'Freios e fluido de freio', description: 'Pastilhas, discos e troca do fluido.', every_km: null, every_months: 24 },
  { name: 'Bateria', description: 'Testar a carga, principalmente depois de 2 a 3 anos.', every_km: null, every_months: 30 },
  { name: 'Fluido de arrefecimento', description: 'Completar ou trocar.', every_km: 30_000, every_months: 24 },
  { name: 'Velas de ignição', description: 'Velas gastas aumentam o consumo e causam falhas na partida.', every_km: 35_000, every_months: null },
  { name: 'Correia dentada', description: 'Ver a necessidade de troca pelo estado e pelo histórico do carro.', every_km: 50_000, every_months: 36 },
  { name: 'Fluido de transmissão', description: 'Verificar com o mecânico.', every_km: 60_000, every_months: null },
  { name: 'Ar-condicionado (limpeza)', description: 'Limpeza da caixa evaporadora e troca do filtro de cabine.', every_km: null, every_months: 12 }
];
