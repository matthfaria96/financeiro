-- Notas: cadernos de lista (Mercado, Farmácia, Petshop, os que a pessoa criar). Cada caderno tem várias
-- listas (a mais nova é a atual, as outras são o histórico). Itens marcados "repete" passam para a próxima.

create table public.notebooks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  emoji text not null default '📝',
  color text not null default '#2BD4A4',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.shopping_lists add column if not exists notebook_id uuid references public.notebooks(id) on delete cascade;
alter table public.shopping_items add column if not exists repeat boolean not null default true;
create index shopping_lists_notebook on public.shopping_lists(notebook_id, created_at);

-- Lista dentro de caderno fica no espaço do caderno; mover o caderno leva as listas (e os itens delas).
create or replace function public.list_household() returns trigger language plpgsql set search_path = public as $$
declare parent uuid;
begin
  if new.notebook_id is null then return new; end if;
  select household_id into parent from notebooks where id = new.notebook_id;
  if parent is null then raise exception 'sem acesso'; end if;
  new.household_id := parent;
  return new;
end $$;
create trigger shopping_lists_household before insert or update on public.shopping_lists for each row execute function public.list_household();

create or replace function public.move_notebook_lists() returns trigger language plpgsql set search_path = public as $$
begin
  if new.household_id is distinct from old.household_id then
    update shopping_lists set household_id = new.household_id where notebook_id = new.id;
  end if;
  return new;
end $$;
create trigger notebooks_move after update of household_id on public.notebooks for each row execute function public.move_notebook_lists();

alter table public.notebooks enable row level security;
create policy "espaço" on public.notebooks for all to authenticated using (is_member(household_id)) with check (is_member(household_id));
revoke all on public.notebooks from anon;
grant select, insert, update, delete on public.notebooks to authenticated;
alter publication supabase_realtime add table public.notebooks;
