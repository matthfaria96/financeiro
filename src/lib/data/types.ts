import type { Day } from '$lib/core/dates';
import type { Bank } from '$lib/core/statement';
import type { CategoryKind, CostType } from '$lib/core/catalog';

/** Linhas como estão no banco de dados (mesmos nomes de coluna, sem conversão). */
export type AccountKind = 'checking' | 'creditCard' | 'savings' | 'cash';
export type PersonRole = 'me' | 'partner' | 'child' | 'house' | 'other';

export interface Household {
  id: string;
  name: string;
  invite_code: string;
  /** 'personal': o financeiro de alguém. 'shared': espaço compartilhado (carro, casa, listas). */
  kind?: 'personal' | 'shared';
  settings: { forecast_months?: number; workspaces_enabled?: boolean; /** Contas escondidas do Saldo do Início. */ home_hidden?: string[]; /** Notas: cartões desligados e a ordem ('nb:<id>', 'desejos', 'transporte'). */ notes_hidden?: string[]; notes_order?: string[];
    /** Cadernos que o app criou (Mercado, Farmácia, Petshop): não podem ser apagados. */ notes_system?: string[];
    /** Ajuste manual por mês (YYYY-MM): diferença nas entradas/saídas, saldo final, motivo e observação. */
    adjustments?: Record<string, MonthAdjustment>;
    /** Correções de saldo feitas à mão (Seu dinheiro › lápis), da mais antiga à mais nova; guardam o necessário para desfazer. */
    balance_fixes?: BalanceFix[] };
}

export interface BalanceFix {
  id: string;
  /** Dia a que os saldos se referem. */
  day: string;
  created_at: string;
  reason: 'rendimento' | 'banco' | 'dinheiro' | 'outro';
  note: string;
  changes: {
    account_id: string;
    /** O saldo que estava antes (para voltar). */
    before: Pick<Account, 'anchor_balance_cents' | 'anchor_date' | 'anchor_batch_id' | 'prev_anchor_balance_cents' | 'prev_anchor_date'>;
    /** Saldo de referência mudou nesta correção. */
    anchored: boolean;
    /** Lançamento de diferença (rendimento, gastos em dinheiro…): criado nesta correção ou somado a um que já existia. */
    entry_id?: string;
    entry_created?: boolean;
    entry_delta?: number;
  }[];
}

export interface MonthAdjustment {
  income: number;
  expense: number;
  reason: 'juros' | 'antecipacao' | 'outro';
  note: string;
  /** Quanto sobrou nas contas no último dia do mês, informado à mão (substitui o saldo calculado). */
  closing?: number | null;
}

export interface Member {
  household_id: string;
  user_id: string;
  display_name: string;
}

export interface Person {
  id: string;
  household_id: string;
  key: string;
  name: string;
  role: PersonRole;
  color: string;
  /** Foto comprimida (data URL WebP); vazia = ícone do papel. */
  photo?: string;
  sort_order: number;
}

export interface Workspace {
  id: string;
  household_id: string;
  name: string;
  symbol: string;
  color: string;
  sort_order: number;
  /** Ambiente pessoal ou de empresa (MEI): muda o que o Início, Lançamentos e Notas mostram. */
  kind?: 'personal' | 'business';
}

export interface Category {
  id: string;
  household_id: string;
  key: string;
  name: string;
  symbol: string;
  color: string;
  kind: CategoryKind;
  cost_type: '' | CostType;
  parent_id: string | null;
  extra_keywords: string;
  sort_order: number;
}

export interface Account {
  id: string;
  household_id: string;
  name: string;
  bank: Bank;
  kind: AccountKind;
  external_id: string;
  color: string;
  last_digits: string;
  archived: boolean;
  sort_order: number;
  closing_day: number;
  due_day: number;
  workspace_id: string | null;
  default_person_id: string | null;
  investment_source_id: string | null;
  anchor_balance_cents: number | null;
  anchor_date: Day | null;
  anchor_batch_id: string | null;
  prev_anchor_balance_cents: number | null;
  prev_anchor_date: Day | null;
}

export interface Merchant {
  id: string;
  household_id: string;
  key: string;
  name: string;
  patterns: string;
  image_url: string;
  image_data: string;
  is_logo: boolean;
  website: string;
  emoji: string;
  color: string;
  cost_type: '' | CostType;
  rename_to: string;
  category_id: string | null;
  person_id: string | null;
}

export interface ImportBatch {
  id: string;
  household_id: string;
  account_id: string | null;
  file_name: string;
  format: string;
  summary: string;
  added_count: number;
  skipped_count: number;
  first_date: Day | null;
  last_date: Day | null;
  imported_at: string;
}

export interface Entry {
  id: string;
  household_id: string;
  account_id: string;
  date: Day;
  amount_cents: number;
  title: string;
  original_title: string;
  memo: string;
  notes: string;
  installment_current: number;
  installment_total: number;
  import_key: string;
  bank_category: string;
  user_edited: boolean;
  cost_type: '' | CostType;
  bill_due_date: Day | null;
  is_mirror: boolean;
  category_id: string | null;
  person_id: string | null;
  merchant_id: string | null;
  batch_id: string | null;
  created_at: string;
}

export interface Bill {
  id: string;
  household_id: string;
  name: string;
  amount_cents: number;
  day_of_month: number;
  match_pattern: string;
  active: boolean;
  category_id: string | null;
  account_id: string | null;
  person_id: string | null;
  workspace_id: string | null;
  /** Como paga: dinheiro em espécie, conta (débito/Pix/TED/boleto) ou cartão de crédito. */
  method?: BillMethod;
  /** Valor muda todo mês (luz, água): o valor cadastrado é uma estimativa. */
  variable?: boolean;
  frequency?: 'monthly' | 'yearly';
  /** Só nas anuais: o mês em que vence (1–12). */
  month_of_year?: number | null;
}

export type BillMethod = 'cash' | 'account' | 'card';

export interface Tables {
  people: Person;
  workspaces: Workspace;
  categories: Category;
  accounts: Account;
  merchants: Merchant;
  import_batches: ImportBatch;
  entries: Entry;
  bills: Bill;
}

export type TableName = keyof Tables;
export const tableNames: TableName[] = ['people', 'workspaces', 'categories', 'accounts', 'merchants', 'import_batches', 'entries', 'bills'];

export type Snapshot = { household: Household; members: Member[] } & { [K in TableName]: Tables[K][] };
