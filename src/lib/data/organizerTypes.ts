import type { Day } from '$lib/core/dates';

/** Linhas das tabelas de Organizar (carro, casa e projetos, lista de compras), como no banco de dados. */
export type LogKind = 'fuel' | 'service' | 'tax' | 'insurance' | 'fee' | 'product' | 'wash' | 'parking' | 'other';
export type Fuel = '' | 'etanol' | 'gasolina' | 'aditivada' | 'diesel' | 'gnv' | 'eletrico';

export interface Space {
  id: string;
  name: string;
  kind: 'personal' | 'shared';
  invite_code: string;
}

export interface SpaceMember {
  household_id: string;
  user_id: string;
  display_name: string;
}

interface Row {
  id: string;
  household_id: string;
  created_at: string;
}

export interface Vehicle extends Row {
  name: string;
  model: string;
  plate: string;
  year: string;
  value_cents: number | null;
  odometer: number | null;
  notes: string;
  /** Foto comprimida (data URL WebP, até ~120 KB). */
  photo: string;
  archived: boolean;
  sort_order: number;
}

export interface VehicleLog extends Row {
  vehicle_id: string;
  date: Day;
  kind: LogKind;
  description: string;
  amount_cents: number;
  odometer: number | null;
  liters: number | null;
  fuel: Fuel;
  full_tank: boolean;
  vendor: string;
  notes: string;
}

export interface MaintenanceItem extends Row {
  vehicle_id: string;
  name: string;
  description: string;
  every_km: number | null;
  every_months: number | null;
  last_km: number | null;
  last_date: Day | null;
  sort_order: number;
}

export interface Project extends Row {
  name: string;
  symbol: string;
  color: string;
  budget_cents: number | null;
  photo: string;
  archived: boolean;
  sort_order: number;
}

export interface ProjectItem extends Row {
  project_id: string;
  kind: 'product' | 'service';
  description: string;
  area: string;
  amount_cents: number | null;
  priority: number;
  done: boolean;
  date: Day | null;
  vendor: string;
  link: string;
  notes: string;
  photo: string;
}

/** Caderno de listas (Mercado, Farmácia, Petshop…): a lista mais nova é a atual. */
export interface Notebook extends Row {
  /** Ambiente (área) a que o caderno pertence; vazio = pessoal. */
  workspace_id?: string | null;
  name: string;
  emoji: string;
  color: string;
  sort_order: number;
}

export interface ShoppingList extends Row {
  notebook_id: string | null;
  name: string;
  done_at: string | null;
  total_cents: number | null;
}

export interface ShoppingItem extends Row {
  list_id: string;
  name: string;
  quantity: string;
  checked: boolean;
  /** Passa para a próxima lista ao "gerar nova mantendo os itens". */
  repeat: boolean;
  sort_order: number;
}

export interface OrgTables {
  vehicles: Vehicle;
  vehicle_logs: VehicleLog;
  maintenance_items: MaintenanceItem;
  projects: Project;
  project_items: ProjectItem;
  notebooks: Notebook;
  shopping_lists: ShoppingList;
  shopping_items: ShoppingItem;
}

export type OrgTable = keyof OrgTables;
export const orgTables: OrgTable[] = ['vehicles', 'vehicle_logs', 'maintenance_items', 'projects', 'project_items', 'notebooks', 'shopping_lists', 'shopping_items'];

/** Tabelas filhas: ficam sempre no espaço do pai (o banco garante; aqui espelhamos na tela). */
export const parentOf: Partial<Record<OrgTable, { table: OrgTable; key: string }>> = {
  vehicle_logs: { table: 'vehicles', key: 'vehicle_id' },
  maintenance_items: { table: 'vehicles', key: 'vehicle_id' },
  project_items: { table: 'projects', key: 'project_id' },
  shopping_lists: { table: 'notebooks', key: 'notebook_id' },
  shopping_items: { table: 'shopping_lists', key: 'list_id' }
};

export type OrgSnapshot = { spaces: Space[]; members: SpaceMember[] } & { [K in OrgTable]: OrgTables[K][] };

/** Tipos de lançamento do carro: Combustível ou um Gasto (Seguro, Imposto, Lavagem, Manutenção, Estacionamento, Outro).
 *  'fee' e 'product' são de registros antigos: aparecem como Outro. */
export const expenseKinds: LogKind[] = ['insurance', 'tax', 'wash', 'service', 'parking', 'other'];
export const normalizeKind = (kind: LogKind): LogKind => (kind === 'fee' || kind === 'product' ? 'other' : kind);
export const logKindShort: Record<LogKind, string> = {
  fuel: 'Combustível', service: 'Manutenção', tax: 'Imposto', insurance: 'Seguro', fee: 'Outro', product: 'Outro', wash: 'Lavagem', parking: 'Estacionamento', other: 'Outro'
};
export const logKindName = logKindShort;
export const logKindIcon: Record<LogKind, string> = {
  fuel: 'fuelpump', service: 'wrench.and.screwdriver', tax: 'receipt', insurance: 'shield', fee: 'tag', product: 'tag',
  wash: 'sparkles', parking: 'parkingsign', other: 'tag'
};
export const logKindColor: Record<LogKind, string> = {
  fuel: '#FF9F1C', service: '#7C8CF8', tax: '#FF6B6B', insurance: '#38D9F5', fee: '#78909C', product: '#78909C', wash: '#2EC4B6', parking: '#FFD60A', other: '#78909C'
};
export const fuelName: Record<Fuel, string> = { '': 'Não informado', etanol: 'Etanol', gasolina: 'Gasolina', aditivada: 'Gasolina aditivada', diesel: 'Diesel', gnv: 'GNV', eletrico: 'Elétrico (kWh)' };
