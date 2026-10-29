import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './backend';
import { readKey, writeKey } from './cache';
import { describe, store } from './store.svelte';
import { buildOrganizerDemo } from './organizerDemo';
import { stressDemo } from './demoMode';
import { orgTables, parentOf, type OrgSnapshot, type OrgTable, type OrgTables, type Space, type SpaceMember } from './organizerTypes';

const uuid = () => crypto.randomUUID();
const PAGE = 1000;

/**
 * Carro, casa/projetos e listas de compras. Diferente do financeiro, cada item mora num "espaço":
 * a casa pessoal ou um espaço compartilhado (as duas pessoas veem). As leituras pegam tudo o que o
 * usuário pode ver (o banco filtra pelos espaços dele); a escrita é otimista como no `store`.
 */
class Organizer {
  loadedFor = $state('');
  spaces = $state<Space[]>([]);
  members = $state<SpaceMember[]>([]);
  vehicles = $state<OrgTables['vehicles'][]>([]);
  vehicle_logs = $state<OrgTables['vehicle_logs'][]>([]);
  maintenance_items = $state<OrgTables['maintenance_items'][]>([]);
  projects = $state<OrgTables['projects'][]>([]);
  project_items = $state<OrgTables['project_items'][]>([]);
  notebooks = $state<OrgTables['notebooks'][]>([]);
  shopping_lists = $state<OrgTables['shopping_lists'][]>([]);
  shopping_items = $state<OrgTables['shopping_items'][]>([]);

  private channel: RealtimeChannel | null = null;
  private cacheTimer: ReturnType<typeof setTimeout> | null = null;

  personalId = $derived(store.household?.id ?? '');
  shared = $derived(this.spaces.filter((space) => space.kind === 'shared'));
  spaceById = $derived(new Map(this.spaces.map((space) => [space.id, space])));

  isShared(householdId: string) {
    return this.spaceById.get(householdId)?.kind === 'shared';
  }

  /** Nome de quem participa de um espaço ("Você" para o próprio usuário). */
  memberNames(spaceId: string): string[] {
    return this.members.filter((m) => m.household_id === spaceId).map((m) => (m.user_id === store.userId ? 'Você' : m.display_name || 'Sem nome'));
  }

  async start() {
    const key = store.demo ? 'demo' : store.userId;
    if (!key || this.loadedFor === key) return;
    this.loadedFor = key;
    if (store.demo) {
      const demo = stressDemo ? (await import('./organizerStress')).buildOrganizerStress(this.personalId) : buildOrganizerDemo(this.personalId);
      // Na demonstração, "Você" é o próprio usuário (para não aparecer duas vezes na família).
      demo.members = demo.members.map((m) => (m.display_name === 'Você' ? { ...m, user_id: store.userId || m.user_id } : m));
      return this.apply(demo);
    }
    const cached = await readKey<OrgSnapshot>(this.cacheKey);
    if (cached) this.apply(cached);
    try {
      this.apply(await this.load());
      this.persist();
      this.subscribe();
    } catch (error) {
      if (!cached) store.toast(`Não consegui carregar carro, casa e listas: ${describe(error)}`, 'error');
    }
  }

  reset() {
    if (this.channel) void supabase().removeChannel(this.channel);
    this.channel = null;
    this.loadedFor = '';
    this.spaces = [];
    this.members = [];
    for (const table of orgTables) this.setList(table, []);
  }

  private get cacheKey() {
    return `organizar:${store.userId}`;
  }

  private async load(): Promise<OrgSnapshot> {
    const db = supabase();
    const [{ data: spaces, error }, { data: members }] = await Promise.all([
      db.from('households').select('id, name, kind, invite_code'),
      db.from('household_members').select('household_id, user_id, display_name')
    ]);
    if (error) throw error;
    const snapshot = { spaces: spaces ?? [], members: members ?? [] } as OrgSnapshot;
    const tables = await Promise.all(orgTables.map((table) => this.all(table)));
    orgTables.forEach((table, index) => ((snapshot as Record<string, unknown>)[table] = tables[index]));
    return snapshot;
  }

  private async all(table: OrgTable) {
    const rows: unknown[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase().from(table).select('*').range(from, from + PAGE - 1);
      if (error) throw error;
      rows.push(...(data ?? []));
      if (!data || data.length < PAGE) return rows;
    }
  }

  /** Recarrega espaços e membros (depois de criar, entrar ou sair de um espaço). */
  async refreshSpaces() {
    if (store.demo) return;
    this.apply(await this.load());
    this.persist();
  }

  private apply(snapshot: OrgSnapshot) {
    this.spaces = snapshot.spaces;
    this.members = snapshot.members;
    for (const table of orgTables) this.setList(table, snapshot[table] ?? []);
  }

  private persist() {
    if (store.demo) return;
    if (this.cacheTimer) clearTimeout(this.cacheTimer);
    this.cacheTimer = setTimeout(() => {
      const snapshot = { spaces: this.spaces, members: this.members } as OrgSnapshot;
      for (const table of orgTables) (snapshot as Record<string, unknown>)[table] = $state.snapshot(this.list(table));
      void writeKey(this.cacheKey, snapshot);
    }, 800);
  }

  private subscribe() {
    if (this.channel) void supabase().removeChannel(this.channel);
    const channel = supabase().channel(`organizar-${store.userId}`);
    for (const table of orgTables) {
      // O banco só manda o que o usuário pode ver; apagados chegam só com o id.
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        const list = this.list(table);
        if (payload.eventType === 'DELETE') {
          const id = (payload.old as { id: string }).id;
          this.setList(table, list.filter((row) => row.id !== id));
        } else {
          const row = payload.new as OrgTables[typeof table];
          const visible = this.spaceById.has(row.household_id);
          const index = list.findIndex((item) => item.id === row.id);
          if (!visible) this.setList(table, list.filter((item) => item.id !== row.id));
          else if (index >= 0) list[index] = row as never;
          else list.push(row as never);
        }
        this.persist();
      });
    }
    channel.subscribe();
    this.channel = channel;
  }

  // Leitura e escrita ----------------------------------------------------------------------------
  list<K extends OrgTable>(table: K): OrgTables[K][] {
    return (this as unknown as Record<OrgTable, OrgTables[K][]>)[table];
  }

  private setList<K extends OrgTable>(table: K, rows: OrgTables[K][]) {
    (this as unknown as Record<OrgTable, OrgTables[K][]>)[table] = rows;
  }

  /** Espaço onde a linha nova mora: o do pai (itens filhos) ou o escolhido (padrão: a casa pessoal). */
  private spaceFor<K extends OrgTable>(table: K, row: Partial<OrgTables[K]>, spaceId?: string): string {
    const parent = parentOf[table];
    if (parent) {
      const parentId = (row as Record<string, unknown>)[parent.key];
      const found = this.list(parent.table).find((item) => item.id === parentId);
      if (found) return found.household_id;
    }
    return spaceId || this.personalId;
  }

  async insert<K extends OrgTable>(table: K, rows: Partial<OrgTables[K]>[], spaceId?: string): Promise<OrgTables[K][]> {
    const now = Date.now();
    const complete = rows.map((row, index) => ({
      ...row,
      id: row.id ?? uuid(),
      household_id: this.spaceFor(table, row, spaceId),
      created_at: row.created_at ?? new Date(now + index).toISOString()
    })) as OrgTables[K][];
    if (!complete.length) return [];
    this.setList(table, [...this.list(table), ...complete]);
    if (store.demo) return complete;
    try {
      for (let index = 0; index < complete.length; index += 500) {
        const { error } = await supabase().from(table).insert(complete.slice(index, index + 500) as never);
        if (error) throw error;
      }
      this.persist();
    } catch (error) {
      const ids = new Set(complete.map((row) => row.id));
      this.setList(table, this.list(table).filter((row) => !ids.has(row.id)));
      store.toast(`Não foi possível salvar: ${describe(error)}`, 'error');
      throw error;
    }
    return complete;
  }

  async update<K extends OrgTable>(table: K, id: string, patch: Partial<OrgTables[K]>) {
    const list = this.list(table);
    const index = list.findIndex((row) => row.id === id);
    if (index < 0) return;
    const before = list[index];
    list[index] = { ...before, ...patch };
    if (store.demo) return;
    const { error } = await supabase().from(table).update(patch as never).eq('id', id);
    if (!error) return this.persist();
    const current = this.list(table);
    const at = current.findIndex((row) => row.id === id);
    if (at >= 0) current[at] = before;
    store.toast(`Não foi possível salvar: ${describe(error)}`, 'error');
  }

  async remove(table: OrgTable, ids: string[]) {
    if (!ids.length) return;
    const saved = new Map<OrgTable, unknown[]>();
    // O banco apaga os filhos em cascata (inclusive netos: caderno → listas → itens); aqui espelhamos.
    const drop = (target: OrgTable, gone: Set<string>, key: string | null) => {
      const list = this.list(target);
      const removed = list.filter((row) => gone.has(key ? ((row as unknown as Record<string, unknown>)[key] as string) : row.id));
      if (!removed.length) return;
      if (!saved.has(target)) saved.set(target, list);
      this.setList(target, list.filter((row) => !removed.includes(row)));
      const removedIds = new Set(removed.map((row) => row.id));
      for (const [child, parent] of Object.entries(parentOf) as [OrgTable, { table: OrgTable; key: string }][]) {
        if (parent.table === target) drop(child, removedIds, parent.key);
      }
    };
    drop(table, new Set(ids), null);
    if (store.demo) return;
    const { error } = await supabase().from(table).delete().in('id', ids);
    if (!error) return this.persist();
    for (const [target, rows] of saved) this.setList(target, rows as never);
    store.toast(`Não foi possível apagar: ${describe(error)}`, 'error');
  }

  /** Leva um carro, projeto, caderno ou lista (com tudo que tem dentro) para outro espaço. */
  async move(table: 'vehicles' | 'projects' | 'notebooks' | 'shopping_lists', id: string, spaceId: string) {
    const item = this.list(table).find((row) => row.id === id);
    if (!item || item.household_id === spaceId) return;
    const from = item.household_id;
    const relabel = (target: OrgTable, ids: Set<string>, key: string | null, space: string) => {
      const moved: string[] = [];
      this.setList(target, this.list(target).map((row) => {
        const hit = ids.has(key ? ((row as unknown as Record<string, unknown>)[key] as string) : row.id);
        if (hit) moved.push(row.id);
        return hit ? { ...row, household_id: space } : row;
      }) as never);
      const next = new Set(moved);
      for (const [child, parent] of Object.entries(parentOf) as [OrgTable, { table: OrgTable; key: string }][]) {
        if (parent.table === target && next.size) relabel(child, next, parent.key, space);
      }
    };
    relabel(table, new Set([id]), null, spaceId);
    if (store.demo) return;
    const { error } = await supabase().from(table).update({ household_id: spaceId } as never).eq('id', id);
    if (!error) return this.persist();
    relabel(table, new Set([id]), null, from);
    store.toast(`Não foi possível mover: ${describe(error)}`, 'error');
  }

  // Espaços compartilhados -----------------------------------------------------------------------
  async createSpace(name: string) {
    if (store.demo) {
      this.spaces = [...this.spaces, { id: uuid(), name, kind: 'shared', invite_code: 'DEMO1234' }];
      return;
    }
    const { error } = await supabase().rpc('create_shared_space', { space_name: name, member_name: this.myName() });
    if (error) throw new Error(describe(error));
    await this.refreshSpaces();
  }

  async joinSpace(code: string) {
    if (store.demo) throw new Error('Na demonstração não dá para entrar em outro espaço.');
    const { error } = await supabase().rpc('join_household', { code, member_name: this.myName() });
    if (error) throw new Error(error.message.includes('inválido') ? 'Código não encontrado. Confira com quem te convidou.' : describe(error));
    await this.refreshSpaces();
  }

  async leaveSpace(spaceId: string) {
    if (!store.demo) {
      const { error } = await supabase().from('household_members').delete().eq('household_id', spaceId).eq('user_id', store.userId);
      if (error) return store.toast(describe(error), 'error');
    }
    this.spaces = this.spaces.filter((space) => space.id !== spaceId);
    for (const table of orgTables) this.setList(table, this.list(table).filter((row) => row.household_id !== spaceId) as never);
    this.persist();
  }

  async rotateCode(spaceId: string) {
    if (store.demo) return;
    const { data, error } = await supabase().rpc('rotate_invite_code', { hh: spaceId });
    if (error) return store.toast(describe(error), 'error');
    this.spaces = this.spaces.map((space) => (space.id === spaceId ? { ...space, invite_code: data as string } : space));
  }

  private myName(): string {
    return store.people.find((p) => p.role === 'me')?.name.replace(/^Eu$/, '') || store.userEmail.split('@')[0];
  }
}

export const organizer = new Organizer();
