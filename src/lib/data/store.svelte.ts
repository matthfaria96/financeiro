import { categorySeeds, merchantSeeds } from '$lib/core/catalog';
import { MemoryBackend, SupabaseBackend, currentSession, myHouseholdId, supabase, supabaseConfigured, type Backend, type Change } from './backend';
import { clearCache, readCache, writeCache } from './cache';
import { buildDemo } from './demo';
import { tableNames, type Account, type Category, type Entry, type Household, type Member, type Merchant, type Person, type Snapshot, type TableName, type Tables, type Workspace } from './types';

export type Status = 'loading' | 'signedOut' | 'noHousehold' | 'ready' | 'error' | 'setPassword';

export interface Toast {
  id: number;
  text: string;
  tone: 'ok' | 'error' | 'info';
}

const uuid = () => crypto.randomUUID();

/** Estado do app: dados da casa em memória, gravação otimista e tempo real.
 *  Toda escrita muda a tela na hora e vai para o Supabase em segundo plano; se falhar, desfaz e avisa. */
class Store {
  status = $state<Status>('loading');
  error = $state('');
  demo = $state(false);
  userEmail = $state('');
  userId = $state('');
  household = $state<Household | null>(null);
  // Tabelas em `$state.raw`: só a troca da lista inteira avisa a tela (toda escrita cria uma lista nova).
  // Com proxies profundos, ler 18 mil lançamentos registrava uma dependência por campo e travava as telas.
  members = $state.raw<Member[]>([]);
  people = $state.raw<Tables['people'][]>([]);
  workspaces = $state.raw<Tables['workspaces'][]>([]);
  categories = $state.raw<Tables['categories'][]>([]);
  accounts = $state.raw<Tables['accounts'][]>([]);
  merchants = $state.raw<Tables['merchants'][]>([]);
  import_batches = $state.raw<Tables['import_batches'][]>([]);
  entries = $state.raw<Tables['entries'][]>([]);
  bills = $state.raw<Tables['bills'][]>([]);
  toasts = $state<Toast[]>([]);
  /** Área aberta ('' = Tudo), por aparelho. */
  selectedWorkspace = $state('');

  private backend: Backend = new MemoryBackend(buildDemo());
  private unsubscribe: (() => void) | null = null;
  private toastId = 0;
  private cacheTimer: ReturnType<typeof setTimeout> | null = null;

  // Índices --------------------------------------------------------------------------------------
  categoryById = $derived(new Map(this.categories.map((c) => [c.id, c])));
  categoryByKey = $derived(new Map(this.categories.map((c) => [c.key || c.id, c])));
  accountById = $derived(new Map(this.accounts.map((a) => [a.id, a])));
  personById = $derived(new Map(this.people.map((p) => [p.id, p])));
  merchantById = $derived(new Map(this.merchants.map((m) => [m.id, m])));
  workspaceById = $derived(new Map(this.workspaces.map((w) => [w.id, w])));
  entriesByAccount = $derived.by(() => {
    const map = new Map<string, Entry[]>();
    for (const entry of this.entries) {
      const list = map.get(entry.account_id);
      if (list) list.push(entry);
      else map.set(entry.account_id, [entry]);
    }
    return map;
  });

  workspacesEnabled = $derived(Boolean(this.household?.settings.workspaces_enabled));
  forecastMonths = $derived(this.household?.settings.forecast_months ?? 6);
  /** Área aberta válida (uma apagada volta para Tudo). */
  // Ambientes (áreas de trabalho) estão desligados por enquanto: ver docs/ideias/ambientes.md.
  scopeId = $derived('');

  // Início ---------------------------------------------------------------------------------------
  async start() {
    try {
      this.selectedWorkspace = localStorage.getItem('financeiro.workspace') ?? '';
    } catch {
      this.selectedWorkspace = '';
    }
    const demo = new URLSearchParams(location.search).has('demo') || !supabaseConfigured;
    if (demo) return this.startDemo();
    supabase().auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') this.reset('signedOut');
      // Veio do link "esqueci a senha": pede a senha nova antes de entrar.
      if (event === 'PASSWORD_RECOVERY' && session) {
        this.userId = session.user.id;
        this.userEmail = session.user.email ?? '';
        this.status = 'setPassword';
      }
    });
    const session = await currentSession();
    if (this.status === 'setPassword') return;
    if (!session) return void (this.status = 'signedOut');
    // Convidado por um familiar: entrou com a senha provisória, então cria a dele antes de tudo.
    if (session.user.user_metadata?.must_change_password) {
      this.userId = session.user.id;
      this.userEmail = session.user.email ?? '';
      return void (this.status = 'setPassword');
    }
    await this.enter(session.user.id, session.user.email ?? '');
  }

  async startDemo() {
    this.demo = true;
    this.userId = 'demo';
    this.backend = new MemoryBackend(buildDemo());
    this.apply(await this.backend.load(''));
    this.status = 'ready';
  }

  async enter(userId: string, email: string) {
    this.userId = userId;
    this.userEmail = email;
    this.backend = new SupabaseBackend();
    const householdId = await myHouseholdId(userId);
    if (!householdId) return void (this.status = 'noHousehold');
    const cached = await readCache(householdId);
    if (cached) {
      this.apply(cached);
      this.status = 'ready';
    }
    try {
      const fresh = await this.backend.load(householdId);
      this.apply(fresh);
      this.status = 'ready';
      if (!fresh.categories.length) await this.seedDefaults();
      this.persistCache();
      this.unsubscribe?.();
      this.unsubscribe = this.backend.subscribe(householdId, (change) => this.receive(change));
    } catch (error) {
      if (!cached) {
        this.error = describe(error);
        this.status = 'error';
      } else this.toast('Sem conexão: mostrando a última cópia salva neste aparelho.', 'info');
    }
  }

  async createHousehold(houseName: string, memberName: string) {
    const { data, error } = await supabase().rpc('create_household', { house_name: houseName, member_name: memberName });
    if (error) throw error;
    await this.enter(this.userId, this.userEmail);
    return data as string;
  }

  async joinHousehold(code: string, memberName: string) {
    const { error } = await supabase().rpc('join_household', { code, member_name: memberName });
    if (error) throw new Error(error.message.includes('inválido') ? 'Código não encontrado. Confira com quem te convidou.' : error.message);
    await this.enter(this.userId, this.userEmail);
  }

  async changePassword(password: string) {
    const { error } = await supabase().auth.updateUser({ password, data: { must_change_password: false } });
    if (error) throw new Error(error.message.includes('different') ? 'A senha nova precisa ser diferente da atual.' : error.message);
  }

  async signOut() {
    await clearCache();
    if (!this.demo) await supabase().auth.signOut();
    this.reset('signedOut');
  }

  private reset(status: Status) {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.household = null;
    for (const table of tableNames) (this as unknown as Record<string, unknown[]>)[table] = [];
    this.members = [];
    this.status = status;
  }

  private apply(snapshot: Snapshot) {
    this.household = snapshot.household;
    this.members = snapshot.members;
    for (const table of tableNames) (this as unknown as Record<string, unknown[]>)[table] = snapshot[table];
  }

  private snapshot(): Snapshot {
    const result = { household: this.household!, members: this.members } as Snapshot;
    for (const table of tableNames) (result as Record<string, unknown>)[table] = $state.snapshot(this.list(table));
    return result;
  }

  private persistCache() {
    if (this.demo || !this.household) return;
    if (this.cacheTimer) clearTimeout(this.cacheTimer);
    this.cacheTimer = setTimeout(() => writeCache(this.snapshot()), 800);
  }

  private receive(change: Change) {
    if (change.table === 'households') {
      if (change.type === 'upsert') this.household = change.row as Household;
      return;
    }
    const list = this.list(change.table);
    if (change.type === 'delete') {
      this.setList(change.table, list.filter((row) => row.id !== change.id));
    } else {
      const row = change.row as never as (typeof list)[number];
      const index = list.findIndex((item) => item.id === row.id);
      this.setList(change.table, index >= 0 ? list.with(index, row) : [...list, row]);
    }
    this.persistCache();
  }

  // Leitura e escrita ----------------------------------------------------------------------------
  list<K extends TableName>(table: K): Tables[K][] {
    return (this as unknown as Record<TableName, Tables[K][]>)[table];
  }

  private setList<K extends TableName>(table: K, rows: Tables[K][]) {
    (this as unknown as Record<TableName, Tables[K][]>)[table] = rows;
  }

  /** Cria linhas (com id e casa preenchidos). */
  async insert<K extends TableName>(table: K, rows: Omit<Tables[K], 'id' | 'household_id'> & Partial<Pick<Tables[K], 'id'>>[] | (Partial<Tables[K]>)[]): Promise<Tables[K][]> {
    const complete = (rows as Partial<Tables[K]>[]).map((row) => ({ ...row, id: (row as { id?: string }).id ?? uuid(), household_id: this.household!.id })) as Tables[K][];
    if (!complete.length) return [];
    this.setList(table, [...this.list(table), ...complete]);
    try {
      await this.backend.insert(table, complete);
      this.persistCache();
    } catch (error) {
      const ids = new Set(complete.map((row) => row.id));
      this.setList(table, this.list(table).filter((row) => !ids.has(row.id)));
      this.toast(`Não foi possível salvar: ${describe(error)}`, 'error');
      throw error;
    }
    return complete;
  }

  async update<K extends TableName>(table: K, id: string, patch: Partial<Tables[K]>) {
    await this.updateMany(table, [{ id, patch }]);
  }

  /** Atualiza várias linhas da mesma tabela (cada uma com seu patch): a tela muda de uma vez só, numa lista nova. */
  async updateMany<K extends TableName>(table: K, patches: { id: string; patch: Partial<Tables[K]> }[]) {
    const byId = new Map<string, Partial<Tables[K]>>();
    for (const { id, patch } of patches) byId.set(id, { ...byId.get(id), ...patch });
    const before = new Map<string, Tables[K]>();
    const list = this.list(table);
    const next = list.map((row) => {
      const patch = byId.get(row.id);
      if (!patch) return row;
      before.set(row.id, row);
      return { ...row, ...patch };
    });
    if (!before.size) return;
    this.setList(table, next);
    await Promise.all(patches.filter((p) => before.has(p.id)).map(async ({ id, patch }) => {
      try {
        await this.backend.update(table, id, patch);
        this.persistCache();
      } catch (error) {
        const old = before.get(id)!;
        this.setList(table, this.list(table).map((row) => (row.id === id ? old : row)));
        this.toast(`Não foi possível salvar: ${describe(error)}`, 'error');
      }
    }));
  }

  async remove(table: TableName, ids: string[]) {
    if (!ids.length) return;
    const set = new Set(ids);
    const before = this.list(table);
    this.setList(table, before.filter((row) => !set.has(row.id)));
    // O banco apaga em cascata; aqui espelhamos o que depende do que saiu.
    if (table === 'accounts') this.entries = this.entries.filter((e) => !set.has(e.account_id));
    if (table === 'import_batches') this.entries = this.entries.filter((e) => !e.batch_id || !set.has(e.batch_id));
    try {
      await this.backend.remove(table, ids);
      this.persistCache();
    } catch (error) {
      this.setList(table, before);
      this.toast(`Não foi possível apagar: ${describe(error)}`, 'error');
    }
  }

  async updateSettings(patch: Household['settings']) {
    if (!this.household) return;
    const settings = { ...this.household.settings, ...patch };
    this.household = { ...this.household, settings };
    await this.backend.updateHousehold(this.household.id, { settings }).catch((error) => this.toast(describe(error), 'error'));
  }

  async rotateInvite() {
    if (!this.household || this.demo) return;
    const { data, error } = await supabase().rpc('rotate_invite_code', { hh: this.household.id });
    if (error) return this.toast(describe(error), 'error');
    this.household = { ...this.household, invite_code: data as string };
  }

  setWorkspace(id: string) {
    this.selectedWorkspace = id;
    try {
      localStorage.setItem('financeiro.workspace', id);
    } catch {
      // aba privada: vale só nesta sessão
    }
  }

  toast(text: string, tone: Toast['tone'] = 'ok') {
    const id = ++this.toastId;
    this.toasts = [...this.toasts, { id, text, tone }];
    setTimeout(() => (this.toasts = this.toasts.filter((t) => t.id !== id)), tone === 'error' ? 7000 : 3500);
  }

  /** Categorias, estabelecimentos e pessoas padrão de uma casa nova. */
  async seedDefaults() {
    const byKey = new Map<string, string>();
    const categories = categorySeeds.map((seed, index) => {
      const id = uuid();
      byKey.set(seed.key, id);
      return { id, key: seed.key, name: seed.name, symbol: seed.symbol, color: seed.color, kind: seed.kind, cost_type: seed.kind === 'expense' ? seed.cost : '', parent_id: null, extra_keywords: '', sort_order: index } as Partial<Category>;
    });
    categorySeeds.forEach((seed, index) => {
      if (seed.parent) categories[index].parent_id = byKey.get(seed.parent) ?? null;
    });
    // Pais antes dos filhos (chave estrangeira).
    await this.insert('categories', categories.filter((c) => !c.parent_id));
    await this.insert('categories', categories.filter((c) => c.parent_id));
    await this.insert('merchants', merchantSeeds.map((seed) => ({
      key: seed.key, name: seed.name, patterns: seed.patterns.join(', '), image_url: '', image_data: '', is_logo: false, website: seed.domain,
      emoji: seed.emoji, color: seed.color, cost_type: seed.cost ?? '', rename_to: '', category_id: byKey.get(seed.category) ?? null, person_id: null
    } as Partial<Merchant>)));
    await this.insert('people', defaultPeople.map((person, index) => ({ ...person, sort_order: index } as Partial<Person>)));
  }

  /** Apaga todos os dados da casa (a casa e os membros continuam). */
  async eraseAll() {
    const order: TableName[] = ['entries', 'import_batches', 'bills', 'merchants', 'accounts', 'categories', 'people', 'workspaces'];
    for (const table of order) await this.remove(table, this.list(table).map((row) => row.id));
    await this.seedDefaults();
  }
}

export const defaultPeople: Partial<Person>[] = [
  { key: 'eu', name: 'Eu', role: 'me', color: '#2BD4A4' },
  { key: 'conjuge', name: 'Esposa', role: 'partner', color: '#FF8FAB' },
  { key: 'casa', name: 'Casa', role: 'house', color: '#38D9F5' },
  { key: 'filho', name: 'Filho', role: 'child', color: '#FFD60A' }
];

export function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message);
  return 'erro desconhecido';
}

export const store = new Store();

// Tipos úteis nas telas
export type { Account, Category, Entry, Merchant, Person, Workspace };
