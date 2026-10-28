import { organizer } from '$lib/data/organizer.svelte';
import type { Project, ProjectItem } from '$lib/data/organizerTypes';

/** Casa e compras planejadas: o que falta (por prioridade) e o que já foi feito (por data). */
export const itemsOf = (project: Project) => organizer.project_items.filter((item) => item.project_id === project.id);

export const byPriority = (a: ProjectItem, b: ProjectItem) => a.priority - b.priority || b.created_at.localeCompare(a.created_at);
export const byDoneDate = (a: ProjectItem, b: ProjectItem) => (b.date ?? '').localeCompare(a.date ?? '') || b.created_at.localeCompare(a.created_at);

export function totals(items: ProjectItem[]) {
  const sum = (list: ProjectItem[]) => list.reduce((s, item) => s + (item.amount_cents ?? 0), 0);
  const pending = items.filter((item) => !item.done);
  const done = items.filter((item) => item.done);
  return { pending: pending.length, done: done.length, planned: sum(pending), spent: sum(done), unpriced: pending.filter((i) => i.amount_cents === null).length };
}

/** Próximas compras de todos os projetos, as mais importantes primeiro. */
export function nextPurchases(limit = 6): { item: ProjectItem; project: Project }[] {
  const projects = new Map(organizer.projects.filter((p) => !p.archived).map((p) => [p.id, p]));
  return organizer.project_items
    .filter((item) => !item.done && projects.has(item.project_id))
    .toSorted(byPriority)
    .slice(0, limit)
    .map((item) => ({ item, project: projects.get(item.project_id)! }));
}

/** Soma por cômodo/área (itens sem área ficam em "Geral"). */
export function byArea(items: ProjectItem[]): { area: string; spent: number; planned: number; count: number }[] {
  const map = new Map<string, { area: string; spent: number; planned: number; count: number }>();
  for (const item of items) {
    const area = item.area.trim() || 'Geral';
    const entry = map.get(area) ?? { area, spent: 0, planned: 0, count: 0 };
    if (item.done) entry.spent += item.amount_cents ?? 0;
    else entry.planned += item.amount_cents ?? 0;
    entry.count++;
    map.set(area, entry);
  }
  return [...map.values()].toSorted((a, b) => b.spent + b.planned - (a.spent + a.planned));
}

export const priorityName: Record<number, string> = { 1: '1 · Primeiro', 2: '2 · Logo', 3: '3 · Normal', 4: '4 · Depois', 5: '5 · Um dia' };
export const priorityColor: Record<number, string> = { 1: '#FF6B5B', 2: '#FFA63D', 3: '#FFD60A', 4: '#7C8CF8', 5: '#78909C' };
export const projectSymbols = ['house', 'sofa', 'car', 'bag', 'gift', 'hammer', 'airplane', 'graduationcap', 'heart', 'desktopcomputer'];
