import { categorySeeds, merchantSeeds } from '$lib/core/catalog';
import type { Category, Merchant, Person, Snapshot, Workspace } from './types';

/** Base da demonstração (catálogo, pessoas, áreas). Os lançamentos entram depois pelo importador de verdade. */
export function buildDemo(): Snapshot {
  const household = 'demo';
  const byKey = new Map<string, string>();
  const categories: Category[] = categorySeeds.map((seed, index) => {
    const id = `cat-${seed.key}`;
    byKey.set(seed.key, id);
    return { id, household_id: household, key: seed.key, name: seed.name, symbol: seed.symbol, color: seed.color, kind: seed.kind, cost_type: seed.kind === 'expense' ? seed.cost : '', parent_id: null, extra_keywords: '', sort_order: index };
  });
  categorySeeds.forEach((seed, index) => (categories[index].parent_id = seed.parent ? byKey.get(seed.parent) ?? null : null));
  const merchants: Merchant[] = merchantSeeds.map((seed) => ({
    id: `mer-${seed.key}`, household_id: household, key: seed.key, name: seed.name, patterns: seed.patterns.join(', '),
    image_url: '', image_data: '', is_logo: false, website: seed.domain, emoji: seed.emoji, color: seed.color, cost_type: seed.cost ?? '',
    rename_to: '', category_id: byKey.get(seed.category) ?? null, person_id: null
  }));
  const people: Person[] = [
    { id: 'p-eu', household_id: household, key: 'eu', name: 'Eu', role: 'me', color: '#2BD4A4', sort_order: 0 },
    { id: 'p-esposa', household_id: household, key: 'conjuge', name: 'Esposa', role: 'partner', color: '#FF8FAB', sort_order: 1 },
    { id: 'p-casa', household_id: household, key: 'casa', name: 'Casa', role: 'house', color: '#38D9F5', sort_order: 2 },
    { id: 'p-filho', household_id: household, key: 'filho', name: 'Filho', role: 'child', color: '#FFD60A', sort_order: 3 }
  ];
  const workspaces: Workspace[] = [
    { id: 'w-meu', household_id: household, name: 'Pessoal', symbol: 'person', color: '#2BD4A4', sort_order: 0, kind: 'personal' },
    { id: 'w-esposa', household_id: household, name: 'Ateliê (MEI)', symbol: 'briefcase', color: '#7C8CF8', sort_order: 1, kind: 'business' }
  ];
  return {
    household: { id: household, name: 'Casa de demonstração', invite_code: 'DEMO1234', settings: { forecast_months: 6, workspaces_enabled: false } },
    members: [{ household_id: household, user_id: 'demo', display_name: 'Você' }],
    people, workspaces, categories, merchants, accounts: [], import_batches: [], entries: [], bills: []
  };
}
