-- Contas fixas: forma de pagamento, valor fixo/variável e frequência (todo mês ou 1x por ano num mês).
alter table public.bills add column if not exists method text not null default 'account' check (method in ('cash', 'account', 'card'));
alter table public.bills add column if not exists variable boolean not null default false;
alter table public.bills add column if not exists frequency text not null default 'monthly' check (frequency in ('monthly', 'yearly'));
alter table public.bills add column if not exists month_of_year int check (month_of_year between 1 and 12);
