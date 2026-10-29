import { addDays, today, type Day } from '$lib/core/dates';
import { defaultMaintenancePlan } from '$lib/core/vehicle';
import type { MaintenanceItem, Notebook, OrgSnapshot, Project, ProjectItem, ShoppingItem, ShoppingList, Vehicle, VehicleLog } from './organizerTypes';

/** Carro, casa e listas fictícios para a demonstração (um espaço compartilhado "Nós dois"). */
export function buildOrganizerDemo(personal: string): OrgSnapshot {
  const shared = 'demo-nos';
  const now = today();
  const stamp = (day: Day) => `${day}T12:00:00.000Z`;
  const base = (id: string, household_id: string, day: Day = now) => ({ id, household_id, created_at: stamp(day) });

  const car: Vehicle = { ...base('car-1', shared), name: 'Carro da família', model: 'Hatch 1.6 Flex automático', plate: 'ABC1D23', year: '2019', value_cents: 5_150_000, odometer: 94_350, notes: '', photo: '', archived: false, sort_order: 0 };
  const logs: VehicleLog[] = [];
  let km = 96_100;
  for (let i = 0; i < 16; i++) {
    const date = addDays(now, -15 * (16 - i) + 3);
    const liters = 34 + ((i * 7) % 9);
    const price = 4.19 + ((i * 3) % 5) * 0.06;
    km += Math.round(liters * (5.1 + ((i * 5) % 6) * 0.1));
    logs.push({ ...base(`fuel-${i}`, shared, date), vehicle_id: car.id, date, kind: 'fuel', description: '', amount_cents: Math.round(liters * price * 100), odometer: km, liters, fuel: i % 3 ? 'aditivada' : 'etanol', full_tank: true, vendor: i % 2 ? 'Posto Ipiranga' : 'Posto Shell', notes: '' });
  }
  const extra: [number, VehicleLog['kind'], string, number, string][] = [
    [-200, 'service', 'Troca de óleo, filtros e boia', 106_000, 'Oficina do bairro'], [-160, 'wash', 'Higienização interna', 30_000, 'Estética automotiva'],
    [-120, 'other', 'Suporte de celular', 9_428, 'Loja online'], [-90, 'tax', 'IPVA', 185_328, ''], [-90, 'tax', 'Licenciamento', 17_408, ''],
    [-40, 'service', 'Pneu furado', 3_500, 'Borracharia'], [-10, 'parking', 'Estacionamento shopping', 1_800, '']
  ];
  extra.forEach(([offset, kind, description, cents, vendor], i) => logs.push({ ...base(`log-${i}`, shared, addDays(now, offset)), vehicle_id: car.id, date: addDays(now, offset), kind, description, amount_cents: cents, odometer: null, liters: null, fuel: '', full_tank: true, vendor, notes: '' }));
  for (let i = 0; i < 6; i++) {
    const date = addDays(now, -30 * i - 5);
    logs.push({ ...base(`ins-${i}`, shared, date), vehicle_id: car.id, date, kind: 'insurance', description: `Seguro ${6 - i}x12`, amount_cents: 18_528, odometer: null, liters: null, fuel: '', full_tank: true, vendor: 'Seguradora', notes: '' });
  }
  const lastKm: Record<number, [number | null, Day | null]> = { 0: [96_000, addDays(now, -200)], 1: [96_000, addDays(now, -200)], 2: [90_000, addDays(now, -400)], 3: [null, addDays(now, -700)], 4: [null, addDays(now, -170)], 8: [60_000, null] };
  const plan: MaintenanceItem[] = defaultMaintenancePlan.map((item, i) => ({
    ...base(`mnt-${i}`, shared), vehicle_id: car.id, ...item, last_km: lastKm[i]?.[0] ?? null, last_date: lastKm[i]?.[1] ?? null, sort_order: i
  }));

  const apto: Project = { ...base('prj-apto', shared), name: 'Apartamento', symbol: 'house', color: '#38D9F5', budget_cents: 4_000_000, photo: '', archived: false, sort_order: 0 };
  const mine: Project = { ...base('prj-meu', personal), name: 'Minhas compras', symbol: 'bag', color: '#2BD4A4', budget_cents: null, photo: '', archived: false, sort_order: 1 };
  const items: [Project, ProjectItem['kind'], string, string, number | null, number, boolean, number, string, string][] = [
    [apto, 'service', 'Pisos vinílicos novos', 'Sala', 675_000, 1, false, 0, '', ''], [apto, 'product', 'Churrasqueira elétrica compacta', 'Varanda', 89_900, 2, false, 0, '', ''],
    [apto, 'service', 'Parede ripada da sala', 'Sala', 717_300, 4, false, 0, 'Marcenaria', ''], [apto, 'product', 'Lâmpadas inteligentes (Zigbee)', 'Casa toda', 60_000, 3, false, 0, '', ''],
    [apto, 'product', 'Quadros para sala e corredor', 'Sala', 45_000, 3, true, -60, 'Loja de decoração', ''], [apto, 'product', 'Cafeteira', 'Cozinha', 39_900, 4, true, -90, 'Loja online', ''],
    [apto, 'service', 'Bancada da área de serviço', 'Área de serviço', 120_000, 2, true, -120, 'Marmoraria', 'Pago à vista'], [apto, 'product', 'Chuveiro ducha preto (2x)', 'Banheiro', 32_649, 3, true, -150, 'Loja online', ''],
    [mine, 'product', 'Tablet', '', 250_000, 1, false, 0, '', ''], [mine, 'product', 'SSD 2 TB', '', 65_000, 2, true, -20, 'Loja online', '']
  ];
  const projectItems: ProjectItem[] = items.map(([project, kind, description, area, cents, priority, done, offset, vendor, notes], i) => ({
    ...base(`item-${i}`, project.household_id, addDays(now, -i)), project_id: project.id, kind, description, area, amount_cents: cents, priority, done,
    date: done ? addDays(now, offset) : null, vendor, link: i === 1 ? 'https://www.amazon.com.br/' : i === 5 ? 'https://www.mercadolivre.com.br/' : '', notes, photo: ''
  }));

  const notebooks: Notebook[] = [
    { ...base('nb-mercado', shared), name: 'Mercado', emoji: '🛒', color: '#2BD4A4', sort_order: 0 },
    { ...base('nb-farmacia', personal), name: 'Farmácia', emoji: '💊', color: '#FF6B6B', sort_order: 1 },
    { ...base('nb-pet', shared), name: 'Petshop', emoji: '🐾', color: '#FF9F1C', sort_order: 2 }
  ];
  const list = (id: string, notebook: Notebook, offset: number, done: number | null, cents: number | null): ShoppingList =>
    ({ ...base(id, notebook.household_id, addDays(now, offset)), notebook_id: notebook.id, name: notebook.name, done_at: done === null ? null : stamp(addDays(now, done)), total_cents: cents });
  const lists: ShoppingList[] = [
    ...[38_910, 45_620, 36_480, 52_300, 40_150].map((cents, i) => list(`list-past-${i}`, notebooks[0], -9 - 7 * (5 - i), -8 - 7 * (5 - i), cents)),
    list('list-old', notebooks[0], -9, -8, 41_230),
    list('list-now', notebooks[0], -1, null, null),
    list('list-farm', notebooks[1], -3, null, null),
    list('list-pet', notebooks[2], -12, null, null)
  ];
  // [nome, quantidade, repete]
  const contents: Record<string, [string, string, boolean][]> = {
    mercado: [['Leite', '6', true], ['Pão de forma', '', true], ['Ovos', '1 dz', true], ['Arroz', '5 kg', true], ['Feijão', '2', true], ['Banana', '', true], ['Café', '2', true],
      ['Papel higiênico', '', true], ['Detergente', '3', true], ['Frango', '1 kg', true], ['Cabo de vassoura', '', false], ['Pá de lixo', '', false]],
    farmacia: [['Dipirona', '', true], ['Protetor solar', '', false], ['Vitamina D', '', true]],
    pet: [['Ração 10 kg', '', true], ['Areia', '2', true], ['Petisco', '', true], ['Brinquedo', '', false]],
    nf: [['NF Escola Aprender — outubro', '', true], ['NF Loja Bela — arte da vitrine', '', false]],
    cobrar: [['Escola Aprender — parcela de novembro', '', true], ['Loja Bela — 50% restante', '', false]]
  };
  const shoppingItems: ShoppingItem[] = lists.flatMap((l) => {
    const rows = contents[{ 'nb-farmacia': 'farmacia', 'nb-pet': 'pet', 'nb-nf': 'nf', 'nb-cobrar': 'cobrar' }[l.notebook_id ?? ''] ?? 'mercado'];
    return rows.map(([name, quantity, repeat], i) => ({
      ...base(`${l.id}-${i}`, l.household_id, addDays(now, -1)), list_id: l.id, name, quantity, repeat, checked: l.done_at !== null || (l.id === 'list-now' && i < 3), sort_order: i
    }));
  });

  return {
    spaces: [{ id: personal, name: 'Minha casa', kind: 'personal', invite_code: '' }, { id: shared, name: 'Nós dois', kind: 'shared', invite_code: 'DEMO1234' }],
    members: [{ household_id: shared, user_id: '', display_name: 'Você' }, { household_id: shared, user_id: 'demo-esposa', display_name: 'Esposa' }],
    vehicles: [car], vehicle_logs: logs, maintenance_items: plan, projects: [apto, mine], project_items: projectItems, notebooks,
    shopping_lists: lists, shopping_items: shoppingItems
  };
}
