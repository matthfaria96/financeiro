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
  settings: { forecast_months?: number; workspaces_enabled?: boolean };
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
  sort_order: number;
}

export interface Workspace {
  id: string;
  household_id: string;
  name: string;
  symbol: string;
  color: string;
  sort_order: number;
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
}

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
