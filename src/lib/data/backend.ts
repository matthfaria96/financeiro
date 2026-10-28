import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';
import { tableNames, type Household, type Snapshot, type TableName, type Tables } from './types';

export type Change<K extends TableName = TableName> =
  | { table: K; type: 'upsert'; row: Tables[K] }
  | { table: K; type: 'delete'; id: string }
  | { table: 'households'; type: 'upsert'; row: Household };

/** Onde os dados moram: Supabase (de verdade) ou memória (demonstração). */
export interface Backend {
  load(householdId: string): Promise<Snapshot>;
  insert<K extends TableName>(table: K, rows: Tables[K][]): Promise<void>;
  update<K extends TableName>(table: K, id: string, patch: Partial<Tables[K]>): Promise<void>;
  remove(table: TableName, ids: string[]): Promise<void>;
  updateHousehold(id: string, patch: Partial<Household>): Promise<void>;
  subscribe(householdId: string, onChange: (change: Change) => void): () => void;
}

export const supabaseConfigured = Boolean(env.PUBLIC_SUPABASE_URL && env.PUBLIC_SUPABASE_ANON_KEY);

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(env.PUBLIC_SUPABASE_URL!, env.PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }
  return client;
}

const PAGE = 1000;

export class SupabaseBackend implements Backend {
  private get db() {
    return supabase();
  }

  async load(householdId: string): Promise<Snapshot> {
    const [{ data: household, error: householdError }, { data: members }] = await Promise.all([
      this.db.from('households').select('*').eq('id', householdId).single(),
      this.db.from('household_members').select('*').eq('household_id', householdId)
    ]);
    if (householdError) throw householdError;
    const tables = await Promise.all(tableNames.map((table) => this.all(table, householdId)));
    const snapshot = { household, members: members ?? [] } as Snapshot;
    tableNames.forEach((table, index) => ((snapshot as Record<string, unknown>)[table] = tables[index]));
    return snapshot;
  }

  /** Busca em páginas (o Supabase devolve no máximo 1000 linhas por vez). */
  private async all(table: TableName, householdId: string) {
    const rows: unknown[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await this.db.from(table).select('*').eq('household_id', householdId).range(from, from + PAGE - 1);
      if (error) throw error;
      rows.push(...(data ?? []));
      if (!data || data.length < PAGE) return rows;
    }
  }

  async insert<K extends TableName>(table: K, rows: Tables[K][]) {
    for (let index = 0; index < rows.length; index += 500) {
      const { error } = await this.db.from(table).insert(rows.slice(index, index + 500));
      if (error) throw error;
    }
  }

  async update<K extends TableName>(table: K, id: string, patch: Partial<Tables[K]>) {
    const { error } = await this.db.from(table).update(patch as never).eq('id', id);
    if (error) throw error;
  }

  async remove(table: TableName, ids: string[]) {
    for (let index = 0; index < ids.length; index += 300) {
      const { error } = await this.db.from(table).delete().in('id', ids.slice(index, index + 300));
      if (error) throw error;
    }
  }

  async updateHousehold(id: string, patch: Partial<Household>) {
    const { error } = await this.db.from('households').update(patch).eq('id', id);
    if (error) throw error;
  }

  subscribe(householdId: string, onChange: (change: Change) => void) {
    const channel = this.db.channel(`casa-${householdId}`);
    for (const table of [...tableNames, 'households'] as const) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: table === 'households' ? `id=eq.${householdId}` : `household_id=eq.${householdId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') onChange({ table: table as TableName, type: 'delete', id: (payload.old as { id: string }).id });
          else onChange({ table, type: 'upsert', row: payload.new } as Change);
        }
      );
    }
    channel.subscribe();
    return () => void this.db.removeChannel(channel);
  }
}

/** Demonstração: tudo em memória, nada sai do navegador. */
export class MemoryBackend implements Backend {
  constructor(private snapshot: Snapshot) {}
  async load() {
    return this.snapshot;
  }
  async insert() {}
  async update() {}
  async remove() {}
  async updateHousehold() {}
  subscribe() {
    return () => {};
  }
}

export async function currentSession(): Promise<Session | null> {
  if (!supabaseConfigured) return null;
  const { data } = await supabase().auth.getSession();
  return data.session;
}

/** Casa do usuário logado (a primeira em que é membro). */
export async function myHouseholdId(userId: string): Promise<string | null> {
  const { data } = await supabase().from('household_members').select('household_id').eq('user_id', userId).limit(1);
  return data?.[0]?.household_id ?? null;
}
