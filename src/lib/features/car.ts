import { byText } from './memo';
import { today, type Day } from '$lib/core/dates';
import { currentOdometer, fillStats, fuelSummary, maintenanceDue, type DueInfo } from '$lib/core/vehicle';
import { organizer } from '$lib/data/organizer.svelte';
import { normalizeKind, type LogKind, type MaintenanceItem, type Vehicle, type VehicleLog } from '$lib/data/organizerTypes';

/** Contas do carro em cima dos registros: km atual, consumo, revisões e gasto por tipo. */
export const logsOf = (vehicle: Vehicle): VehicleLog[] =>
  organizer.vehicle_logs.filter((log) => log.vehicle_id === vehicle.id).toSorted((a, b) => byText(b.date, a.date) || (b.odometer ?? 0) - (a.odometer ?? 0));

export const fuelsOf = (vehicle: Vehicle) => logsOf(vehicle).filter((log) => log.kind === 'fuel');

export const odometerOf = (vehicle: Vehicle) => currentOdometer(vehicle.odometer, logsOf(vehicle));

export function fuelInfo(vehicle: Vehicle) {
  const fills = fuelsOf(vehicle).map((log) => ({ ...log, liters: log.liters === null ? null : Number(log.liters) }));
  return { stats: fillStats(fills), summary: fuelSummary(fills) };
}

export interface PlanItem {
  item: MaintenanceItem;
  due: DueInfo;
}

const stateOrder = { overdue: 0, soon: 1, unknown: 2, ok: 3 } as const;

/** Plano de revisões, do mais urgente para o menos. */
export function planOf(vehicle: Vehicle, now: Day = today()): PlanItem[] {
  const km = odometerOf(vehicle);
  return organizer.maintenance_items
    .filter((item) => item.vehicle_id === vehicle.id)
    .map((item) => ({ item, due: maintenanceDue(item, km, now) }))
    .toSorted((a, b) => stateOrder[a.due.state] - stateOrder[b.due.state] || (a.due.kmLeft ?? 1e9) - (b.due.kmLeft ?? 1e9) || a.item.sort_order - b.item.sort_order);
}

/** Gasto por tipo desde uma data (ex.: começo do ano), do maior para o menor. */
export function spendByKind(vehicle: Vehicle, since: Day): { kind: LogKind; cents: number }[] {
  const totals = new Map<LogKind, number>();
  for (const log of logsOf(vehicle)) if (log.date >= since) totals.set(normalizeKind(log.kind), (totals.get(normalizeKind(log.kind)) ?? 0) + log.amount_cents);
  return [...totals].map(([kind, cents]) => ({ kind, cents })).filter((t) => t.cents > 0).toSorted((a, b) => b.cents - a.cents);
}

export const formatKm = (km: number | null) => (km === null ? '—' : `${km.toLocaleString('pt-BR')} km`);
export const formatKmL = (value: number | null) => (value === null ? '—' : `${value.toFixed(1).replace('.', ',')} km/L`);
export const formatPerUnit = (value: number | null, unit: string) => (value === null ? '—' : `R$ ${value.toFixed(2).replace('.', ',')}/${unit}`);

/** "Faltam 800 km", "Venceu há 12 dias", "Em 3 meses". */
export function dueText(due: DueInfo): string {
  if (due.state === 'unknown') return 'Informe quando foi feito pela última vez';
  const parts: string[] = [];
  if (due.kmLeft !== null) parts.push(due.kmLeft <= 0 ? `passou ${(-due.kmLeft).toLocaleString('pt-BR')} km` : `faltam ${due.kmLeft.toLocaleString('pt-BR')} km`);
  if (due.daysLeft !== null) parts.push(due.daysLeft <= 0 ? `venceu há ${-due.daysLeft} dias` : due.daysLeft < 60 ? `em ${due.daysLeft} dias` : `em ${Math.round(due.daysLeft / 30)} meses`);
  const text = parts.join(' · ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const dueColor = { overdue: 'var(--negative)', soon: 'var(--warning)', ok: 'var(--positive)', unknown: 'var(--text-3)' } as const;
