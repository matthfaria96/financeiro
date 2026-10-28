import { fold } from '$lib/core/text';
import { store } from '$lib/data/store.svelte';
import type { Bill } from '$lib/data/types';
import { patternList } from '$lib/features/rules';

/** Avatar da conta fixa: o estabelecimento que reconhece o nome/texto dela, se houver. */
export function merchantForBill(bill: Bill) {
  const text = fold(`${bill.name} ${bill.match_pattern}`);
  return store.merchants.find((m) => patternList(m).some((p) => text.includes(fold(p))) || fold(m.name) === fold(bill.name));
}
