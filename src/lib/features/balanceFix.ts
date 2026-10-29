import { store } from '$lib/data/store.svelte';
import type { BalanceFix } from '$lib/data/types';
import { reconcileMirrors } from './mirrors';

export const balanceFixReason: Record<BalanceFix['reason'], string> = { rendimento: 'Rendimento / juros', banco: 'Saldo do banco diferente', dinheiro: 'Gastos em dinheiro', outro: 'Outro' };

export const balanceFixes = (): BalanceFix[] => store.household?.settings.balance_fixes ?? [];
export const lastBalanceFix = (): BalanceFix | null => balanceFixes().at(-1) ?? null;

/** Desfaz a correção mais recente: volta os saldos de referência e tira (ou desconta) o lançamento de diferença. */
export async function undoLastBalanceFix() {
  const fix = lastBalanceFix();
  if (!fix) return;
  for (const change of fix.changes) {
    if (change.anchored && store.accountById.get(change.account_id)) await store.update('accounts', change.account_id, change.before);
    if (!change.entry_id) continue;
    const entry = store.entries.find((e) => e.id === change.entry_id);
    if (!entry) continue;
    const rest = entry.amount_cents - (change.entry_delta ?? 0);
    if (change.entry_created || !rest) await store.remove('entries', [entry.id]);
    else await store.update('entries', entry.id, { amount_cents: rest });
  }
  await store.updateSettings({ balance_fixes: balanceFixes().slice(0, -1) });
  await reconcileMirrors();
}
