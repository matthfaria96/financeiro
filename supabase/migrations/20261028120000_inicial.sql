-- Financeiro: base inicial.
-- Tudo pertence a uma "casa" (household). Só quem é membro da casa lê ou escreve os dados dela (RLS em
-- todas as tabelas). Visitantes sem login (papel anon) não têm acesso a nada.

create extension if not exists pgcrypto;

-- Casas e membros ----------------------------------------------------------------------------------

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Minha casa',
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default '',
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- Membro da casa? (security definer: lê household_members sem depender das políticas da própria tabela)
create or replace function public.is_member(hh uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from household_members where household_id = hh and user_id = auth.uid());
$$;

-- Cria a casa do usuário logado (primeiro acesso).
create or replace function public.create_household(house_name text default 'Minha casa', member_name text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare hh uuid;
begin
  if auth.uid() is null then raise exception 'login necessário'; end if;
  select household_id into hh from household_members where user_id = auth.uid() limit 1;
  if hh is not null then return hh; end if;
  insert into households(name) values (coalesce(nullif(trim(house_name), ''), 'Minha casa')) returning id into hh;
  insert into household_members(household_id, user_id, display_name) values (hh, auth.uid(), coalesce(member_name, ''));
  return hh;
end $$;

-- Entra na casa de outra pessoa com o código de convite.
create or replace function public.join_household(code text, member_name text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare hh uuid;
begin
  if auth.uid() is null then raise exception 'login necessário'; end if;
  select id into hh from households where invite_code = upper(trim(code));
  if hh is null then raise exception 'código inválido'; end if;
  insert into household_members(household_id, user_id, display_name) values (hh, auth.uid(), coalesce(member_name, ''))
    on conflict do nothing;
  return hh;
end $$;

-- Gera um código novo (o antigo deixa de valer).
create or replace function public.rotate_invite_code(hh uuid) returns text
language plpgsql security definer set search_path = public as $$
declare code text;
begin
  if not is_member(hh) then raise exception 'sem acesso'; end if;
  code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
  update households set invite_code = code where id = hh;
  return code;
end $$;

-- Cadastros ----------------------------------------------------------------------------------------

create table public.people (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  key text not null default '',
  name text not null,
  role text not null default 'other',
  color text not null default '#64B5F6',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  symbol text not null default 'layers',
  color text not null default '#2EC4B6',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  key text not null default '',
  name text not null,
  symbol text not null default 'tag',
  color text not null default '#78909C',
  kind text not null default 'expense' check (kind in ('expense', 'income', 'transfer')),
  cost_type text not null default '' check (cost_type in ('', 'fixed', 'variable')),
  parent_id uuid references public.categories(id) on delete set null,
  extra_keywords text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  bank text not null default 'other' check (bank in ('nubank', 'inter', 'other')),
  kind text not null default 'checking' check (kind in ('checking', 'creditCard', 'savings', 'cash')),
  external_id text not null default '',
  color text not null default '',
  last_digits text not null default '',
  archived boolean not null default false,
  sort_order int not null default 0,
  closing_day int not null default 2 check (closing_day between 1 and 31),
  due_day int not null default 10 check (due_day between 1 and 31),
  workspace_id uuid references public.workspaces(id) on delete set null,
  default_person_id uuid references public.people(id) on delete set null,
  investment_source_id uuid references public.accounts(id) on delete set null,
  -- Saldo conhecido numa data (extrato ou digitado) e o anterior, para desfazer a importação que o trouxe.
  anchor_balance_cents bigint,
  anchor_date date,
  anchor_batch_id uuid,
  prev_anchor_balance_cents bigint,
  prev_anchor_date date,
  created_at timestamptz not null default now()
);

create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  key text not null default '',
  name text not null,
  patterns text not null default '',
  image_url text not null default '',
  -- Foto enviada pelo usuário, já comprimida no navegador (data URL WebP, ~5 KB).
  image_data text not null default '' check (length(image_data) <= 60000),
  is_logo boolean not null default false,
  website text not null default '',
  emoji text not null default '',
  color text not null default '#2BD4A4',
  cost_type text not null default '' check (cost_type in ('', 'fixed', 'variable')),
  rename_to text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  person_id uuid references public.people(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete cascade,
  file_name text not null default '',
  format text not null default '',
  summary text not null default '',
  added_count int not null default 0,
  skipped_count int not null default 0,
  first_date date,
  last_date date,
  imported_at timestamptz not null default now()
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  date date not null,
  amount_cents bigint not null,
  title text not null default '',
  original_title text not null default '',
  memo text not null default '',
  notes text not null default '',
  installment_current int not null default 0,
  installment_total int not null default 0,
  import_key text not null default '',
  bank_category text not null default '',
  user_edited boolean not null default false,
  cost_type text not null default '' check (cost_type in ('', 'fixed', 'variable')),
  bill_due_date date,
  is_mirror boolean not null default false,
  category_id uuid references public.categories(id) on delete set null,
  person_id uuid references public.people(id) on delete set null,
  merchant_id uuid references public.merchants(id) on delete set null,
  batch_id uuid references public.import_batches(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Mesmo lançamento importado duas vezes na mesma conta é barrado pelo próprio banco de dados.
create unique index entries_account_import_key on public.entries(account_id, import_key) where import_key <> '';
create index entries_household_date on public.entries(household_id, date);

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  amount_cents bigint not null default 0,
  day_of_month int not null default 1 check (day_of_month between 1 and 31),
  match_pattern text not null default '',
  active boolean not null default true,
  category_id uuid references public.categories(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  person_id uuid references public.people(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Segurança ----------------------------------------------------------------------------------------

alter table public.households enable row level security;
alter table public.household_members enable row level security;

create policy "membros leem a casa" on public.households for select to authenticated using (is_member(id));
create policy "membros editam a casa" on public.households for update to authenticated using (is_member(id)) with check (is_member(id));
create policy "membros veem os membros" on public.household_members for select to authenticated using (is_member(household_id));
create policy "membro sai da casa" on public.household_members for delete to authenticated using (user_id = auth.uid());
create policy "membro muda o próprio nome" on public.household_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['people', 'workspaces', 'categories', 'accounts', 'merchants', 'import_batches', 'entries', 'bills'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "casa" on public.%I for all to authenticated using (is_member(household_id)) with check (is_member(household_id))', t);
  end loop;
end $$;

-- Sem login, nada.
revoke all on all tables in schema public from anon;
revoke execute on function public.create_household(text, text), public.join_household(text, text), public.rotate_invite_code(uuid) from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Tempo real entre aparelhos.
alter publication supabase_realtime add table public.accounts, public.entries, public.categories, public.merchants,
  public.people, public.workspaces, public.bills, public.import_batches, public.households;
