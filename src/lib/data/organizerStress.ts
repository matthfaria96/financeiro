import { addDays, today } from '$lib/core/dates';
import { buildOrganizerDemo } from './organizerDemo';
import type { OrgSnapshot, Project, ProjectItem, ShoppingItem, ShoppingList, VehicleLog } from './organizerTypes';

/** Notas da demonstração pesada (`?demo&muito`): listas com 200+ itens, muitos desejos e o carro com 300 registros. Tudo fictício. */
export function buildOrganizerStress(personal: string): OrgSnapshot {
  const demo = buildOrganizerDemo(personal);
  const now = today();
  const stamp = (offset: number) => `${addDays(now, offset)}T12:00:00.000Z`;
  const words = ['Arroz', 'Feijão', 'Leite', 'Café', 'Açúcar', 'Banana', 'Maçã', 'Tomate', 'Cebola', 'Alho', 'Batata', 'Cenoura', 'Frango', 'Carne moída', 'Ovos', 'Queijo', 'Presunto', 'Iogurte',
    'Manteiga', 'Pão de forma', 'Macarrão', 'Molho de tomate', 'Azeite', 'Sal', 'Detergente', 'Sabão em pó', 'Amaciante', 'Papel higiênico', 'Esponja', 'Desinfetante', 'Shampoo', 'Sabonete'];
  const brands = ['', ' integral', ' light', ' grande', ' pequeno', ' orgânico', ' da marca da loja'];

  // A lista atual do Mercado com 240 itens e 30 listas antigas (cada uma com 40 itens).
  const mercado = demo.notebooks[0];
  const past: ShoppingList[] = Array.from({ length: 30 }, (_, i) => ({ id: `st-list-${i}`, household_id: mercado.household_id, created_at: stamp(-60 - i * 7), notebook_id: mercado.id,
    name: mercado.name, done_at: stamp(-59 - i * 7), total_cents: 30_000 + ((i * 3_719) % 25_000) }));
  const item = (list: ShoppingList, i: number, checked: boolean): ShoppingItem => ({ id: `${list.id}-st${i}`, household_id: list.household_id, created_at: list.created_at, list_id: list.id,
    name: `${words[i % words.length]}${brands[Math.floor(i / words.length) % brands.length]}`, quantity: i % 4 ? '' : String(1 + (i % 5)), checked, repeat: i % 3 !== 0, sort_order: 100 + i });
  const current = demo.shopping_lists.find((l) => l.id === 'list-now')!;
  const farm = demo.shopping_lists.find((l) => l.id === 'list-farm')!;
  const items: ShoppingItem[] = [
    ...Array.from({ length: 240 }, (_, i) => item(current, i, i % 7 === 0)),
    ...Array.from({ length: 210 }, (_, i) => item(farm, i, false)),
    ...past.flatMap((list) => Array.from({ length: 40 }, (_, i) => item(list, i, true)))
  ];

  // Lista de desejos: 6 projetos, 180 itens.
  const projects: Project[] = ['Cozinha nova', 'Viagem de férias', 'Quarto do bebê', 'Escritório', 'Jardim', 'Garagem'].map((name, i) => ({
    id: `st-prj-${i}`, household_id: i % 2 ? personal : demo.spaces[1].id, created_at: stamp(-i), name, symbol: ['house', 'airplane', 'heart', 'briefcase', 'leaf', 'car'][i],
    color: ['#FF9F1C', '#38D9F5', '#FF8FAB', '#7C8CF8', '#2BD4A4', '#FFD60A'][i], budget_cents: i % 3 ? 1_500_000 + i * 250_000 : null, photo: '', archived: false, sort_order: 2 + i }));
  const wishes: ProjectItem[] = Array.from({ length: 180 }, (_, i) => {
    const project = projects[i % projects.length];
    const done = i % 4 === 0;
    return { id: `st-wish-${i}`, household_id: project.household_id, created_at: stamp(-i), project_id: project.id, kind: i % 5 ? 'product' : 'service',
      description: `${['Luminária', 'Cadeira', 'Prateleira', 'Tapete', 'Cortina', 'Mesa', 'Vaso', 'Ferramenta', 'Mala', 'Armário'][i % 10]} ${Math.floor(i / 10) + 1}`,
      area: ['Sala', 'Cozinha', 'Quarto', 'Varanda', ''][i % 5], amount_cents: i % 9 ? 5_000 + ((i * 7_919) % 200_000) : null, priority: 1 + (i % 4), done,
      date: done ? addDays(now, -i) : null, vendor: i % 3 ? 'Loja online' : '', link: '', notes: '', photo: '' };
  });

  // Carro: 300 registros em 3 anos (abastecimentos a cada ~4 dias, revisões, lavagens, estacionamento).
  const car = demo.vehicles[0];
  let km = 40_000;
  const logs: VehicleLog[] = Array.from({ length: 300 }, (_, i) => {
    const date = addDays(now, -1095 + Math.round(i * 3.62));
    const fuel = i % 6 !== 5;
    const liters = 30 + ((i * 7) % 14);
    km += fuel ? Math.round(liters * 11.5) : 0;
    const kind: VehicleLog['kind'] = fuel ? 'fuel' : (['service', 'wash', 'parking', 'other', 'fee'] as const)[i % 5];
    return { id: `st-log-${i}`, household_id: car.household_id, created_at: `${date}T12:00:00.000Z`, vehicle_id: car.id, date, kind, description: fuel ? '' : `Registro ${i}`,
      amount_cents: fuel ? Math.round(liters * (4.9 + (i % 7) * 0.08) * 100) : 2_000 + ((i * 3_331) % 60_000), odometer: fuel ? km : null, liters: fuel ? liters : null,
      fuel: fuel ? (i % 3 ? 'gasolina' : 'etanol') : '', full_tank: true, vendor: fuel ? (i % 2 ? 'Posto Ipiranga' : 'Posto Shell') : 'Oficina do bairro', notes: '' };
  });

  return {
    ...demo,
    vehicles: [{ ...car, odometer: km }],
    vehicle_logs: [...demo.vehicle_logs, ...logs],
    projects: [...demo.projects, ...projects],
    project_items: [...demo.project_items, ...wishes],
    shopping_lists: [...past, ...demo.shopping_lists],
    shopping_items: [...demo.shopping_items, ...items]
  };
}
