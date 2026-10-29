import { addMonths, monthOf, today } from '$lib/core/dates';
import { store } from '$lib/data/store.svelte';
import { organizer } from '$lib/data/organizer.svelte';
import type { Workspace } from '$lib/data/types';
import { accountOf, inScope, kindOf } from './model';

/**
 * Ambientes: Pessoal e Empresa (MEI). Por baixo são as áreas de trabalho: cada conta pertence a um ambiente
 * e, escolhendo um ambiente, o app mostra só as contas, lançamentos, contas fixas e Notas dele.
 */
export const MEI_LIMIT_CENTS = 8_100_000;

export const ambients = () => (store.workspacesEnabled ? store.workspaces.toSorted((a, b) => a.sort_order - b.sort_order) : []);
export const currentAmbient = (): Workspace | undefined => store.workspaceById.get(store.scopeId);
export const isBusiness = () => currentAmbient()?.kind === 'business';
export const businessAmbients = () => ambients().filter((w) => w.kind === 'business');

/** Liga os ambientes: cria "Pessoal" com tudo que já existe e uma empresa nova, com o básico de MEI. */
export async function addBusiness(name: string): Promise<Workspace> {
  let personal = store.workspaces.find((w) => w.kind !== 'business');
  if (!personal) {
    [personal] = await store.insert('workspaces', [{ name: 'Pessoal', symbol: 'person', color: '#2BD4A4', sort_order: 0, kind: 'personal' }]);
  }
  // O que não tinha ambiente fica no Pessoal (nada some ao ligar).
  await store.updateMany('accounts', store.accounts.filter((a) => !a.workspace_id).map((a) => ({ id: a.id, patch: { workspace_id: personal!.id } })));
  await store.updateMany('bills', store.bills.filter((b) => !b.workspace_id && !b.account_id).map((b) => ({ id: b.id, patch: { workspace_id: personal!.id } })));
  const [business] = await store.insert('workspaces', [{ name: name.trim() || 'Minha empresa', symbol: 'briefcase', color: '#7C8CF8', sort_order: store.workspaces.length, kind: 'business' }]);
  await store.updateSettings({ workspaces_enabled: true });
  // O que todo MEI tem: o DAS todo mês e listas de trabalho nas Notas.
  await store.insert('bills', [{ name: 'DAS do MEI', amount_cents: 7_660, day_of_month: 20, match_pattern: 'das', active: true, category_id: store.categoryByKey.get('taxas-impostos')?.id ?? null, account_id: null, person_id: null, workspace_id: business.id, method: 'account', variable: false, frequency: 'monthly', month_of_year: null }]);
  if (organizer.loadedFor) {
    const books = await organizer.insert('notebooks', [
      { name: 'Notas fiscais a emitir', emoji: '🧾', color: '#7C8CF8', sort_order: 0, workspace_id: business.id },
      { name: 'Clientes a cobrar', emoji: '💼', color: '#2BD4A4', sort_order: 1, workspace_id: business.id },
      { name: 'Insumos e estoque', emoji: '📦', color: '#FF9F1C', sort_order: 2, workspace_id: business.id }
    ]);
    await organizer.insert('shopping_lists', books.map((b) => ({ notebook_id: b.id, name: b.name, done_at: null, total_cents: null })));
  }
  return business;
}

/** Faturamento do ano no ambiente de empresa (entradas nas contas dele) e quanto falta para o limite do MEI. */
export function meiRevenue() {
  const year = today().slice(0, 4);
  const entries = store.entries.filter((e) => inScope(e) && !e.is_mirror && kindOf(e) === 'income' && e.date.startsWith(year) && ['checking', 'cash'].includes(accountOf(e)?.kind ?? ''));
  const total = entries.reduce((s, e) => s + e.amount_cents, 0);
  const monthsSoFar = Number(today().slice(5, 7));
  const pace = Math.round((total / monthsSoFar) * 12);
  const now = monthOf(today());
  const thisMonth = entries.filter((e) => monthOf(e.date) === now).reduce((s, e) => s + e.amount_cents, 0);
  const lastMonth = entries.filter((e) => monthOf(e.date) === addMonths(now, -1)).reduce((s, e) => s + e.amount_cents, 0);
  return { total, pace, left: MEI_LIMIT_CENTS - total, share: total / MEI_LIMIT_CENTS, thisMonth, lastMonth };
}

/** Nome do cliente que pagou: o estabelecimento reconhecido ou o nome no Pix/TED ("… - EMPRESA X - 12.345…"). */
export function payerOf(title: string): string {
  const parts = title.split(' - ').map((p) => p.trim()).filter(Boolean);
  const named = parts.find((p, i) => i > 0 && /\p{L}{3}/u.test(p) && !/^(ag[eê]ncia|conta|bco|banco)/i.test(p) && !/\d{3}\.\d{3}/.test(p));
  return (named ?? parts[0] ?? title).replace(/\s+/g, ' ');
}
