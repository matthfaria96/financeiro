-- Organizar: carro, casa/projetos e lista de compras, com espaço compartilhado.
-- Cada pessoa tem a sua casa pessoal (o financeiro). Um espaço compartilhado é outra "casa" (kind = 'shared')
-- da qual as duas pessoas são membros: o que for colocado nele, as duas veem. O financeiro nunca vai para lá.

alter table public.households add column if not exists kind text not null default 'personal' check (kind in ('personal', 'shared'));

-- A casa pessoal é só a 'personal' (entrar num espaço compartilhado não conta como ter casa).
create or replace function public.create_household(house_name text default 'Minha casa', member_name text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare hh uuid;
begin
  if auth.uid() is null then raise exception 'login necessário'; end if;
  select m.household_id into hh from household_members m join households h on h.id = m.household_id
    where m.user_id = auth.uid() and h.kind = 'personal' limit 1;
  if hh is not null then return hh; end if;
  insert into households(name) values (coalesce(nullif(trim(house_name), ''), 'Minha casa')) returning id into hh;
  insert into household_members(household_id, user_id, display_name) values (hh, auth.uid(), coalesce(member_name, ''));
  return hh;
end $$;

-- Entrar com código. Se for um espaço compartilhado e a pessoa ainda não tiver casa, cria a dela também.
create or replace function public.join_household(code text, member_name text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare hh uuid; space_kind text;
begin
  if auth.uid() is null then raise exception 'login necessário'; end if;
  select id, kind into hh, space_kind from households where invite_code = upper(trim(code));
  if hh is null then raise exception 'código inválido'; end if;
  insert into household_members(household_id, user_id, display_name) values (hh, auth.uid(), coalesce(member_name, ''))
    on conflict do nothing;
  if space_kind = 'shared' then perform create_household('Minha casa', member_name); end if;
  return hh;
end $$;

create or replace function public.create_shared_space(space_name text default 'Nós dois', member_name text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare hh uuid;
begin
  if auth.uid() is null then raise exception 'login necessário'; end if;
  insert into households(name, kind) values (coalesce(nullif(trim(space_name), ''), 'Nós dois'), 'shared') returning id into hh;
  insert into household_members(household_id, user_id, display_name) values (hh, auth.uid(), coalesce(member_name, ''));
  return hh;
end $$;

revoke execute on function public.create_shared_space(text, text) from anon;

-- Carro ---------------------------------------------------------------------------------------------

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  model text not null default '',
  plate text not null default '',
  year text not null default '',
  value_cents bigint,
  odometer int,
  notes text not null default '',
  archived boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.vehicle_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  date date not null,
  kind text not null default 'fuel' check (kind in ('fuel', 'service', 'tax', 'insurance', 'fee', 'product', 'wash', 'parking', 'other')),
  description text not null default '',
  amount_cents bigint not null default 0,
  odometer int,
  liters numeric(8, 3),
  fuel text not null default '' check (fuel in ('', 'etanol', 'gasolina', 'aditivada', 'diesel', 'gnv', 'eletrico')),
  full_tank boolean not null default true,
  vendor text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.maintenance_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  name text not null,
  description text not null default '',
  every_km int check (every_km is null or every_km > 0),
  every_months int check (every_months is null or every_months > 0),
  last_km int,
  last_date date,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Casa e compras planejadas -------------------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  symbol text not null default 'house',
  color text not null default '#38D9F5',
  budget_cents bigint,
  archived boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.project_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null default 'product' check (kind in ('product', 'service')),
  description text not null,
  area text not null default '',
  amount_cents bigint,
  priority int not null default 3 check (priority between 1 and 5),
  done boolean not null default false,
  date date,
  vendor text not null default '',
  link text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- Lista de compras ----------------------------------------------------------------------------------

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  done_at timestamptz,
  total_cents bigint,
  created_at timestamptz not null default now()
);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  list_id uuid not null references public.shopping_lists(id) on delete cascade,
  name text not null,
  quantity text not null default '',
  checked boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index vehicle_logs_vehicle on public.vehicle_logs(vehicle_id, date);
create index maintenance_items_vehicle on public.maintenance_items(vehicle_id);
create index project_items_project on public.project_items(project_id);
create index shopping_items_list on public.shopping_items(list_id);

-- Item filho sempre no mesmo espaço do pai; mover o pai leva os filhos junto ------------------------

create or replace function public.inherit_household() returns trigger language plpgsql set search_path = public as $$
declare parent uuid;
begin
  execute format('select household_id from public.%I where id = $1', tg_argv[0]) into parent using (to_jsonb(new) ->> tg_argv[1])::uuid;
  if parent is null then raise exception 'sem acesso'; end if;
  new.household_id := parent;
  return new;
end $$;

create trigger vehicle_logs_household before insert or update on public.vehicle_logs for each row execute function public.inherit_household('vehicles', 'vehicle_id');
create trigger maintenance_items_household before insert or update on public.maintenance_items for each row execute function public.inherit_household('vehicles', 'vehicle_id');
create trigger project_items_household before insert or update on public.project_items for each row execute function public.inherit_household('projects', 'project_id');
create trigger shopping_items_household before insert or update on public.shopping_items for each row execute function public.inherit_household('shopping_lists', 'list_id');

create or replace function public.move_children() returns trigger language plpgsql set search_path = public as $$
begin
  if new.household_id is distinct from old.household_id then
    if tg_table_name = 'vehicles' then
      update vehicle_logs set household_id = new.household_id where vehicle_id = new.id;
      update maintenance_items set household_id = new.household_id where vehicle_id = new.id;
    elsif tg_table_name = 'projects' then
      update project_items set household_id = new.household_id where project_id = new.id;
    elsif tg_table_name = 'shopping_lists' then
      update shopping_items set household_id = new.household_id where list_id = new.id;
    end if;
  end if;
  return new;
end $$;

create trigger vehicles_move after update of household_id on public.vehicles for each row execute function public.move_children();
create trigger projects_move after update of household_id on public.projects for each row execute function public.move_children();
create trigger shopping_lists_move after update of household_id on public.shopping_lists for each row execute function public.move_children();

-- Segurança ----------------------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['vehicles', 'vehicle_logs', 'maintenance_items', 'projects', 'project_items', 'shopping_lists', 'shopping_items'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "espaço" on public.%I for all to authenticated using (is_member(household_id)) with check (is_member(household_id))', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

alter publication supabase_realtime add table public.vehicles, public.vehicle_logs, public.maintenance_items, public.projects,
  public.project_items, public.shopping_lists, public.shopping_items;
