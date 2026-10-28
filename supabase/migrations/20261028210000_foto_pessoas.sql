-- Foto de cada pessoa (comprimida no navegador, ~10 KB).
alter table public.people add column if not exists photo text not null default '' check (length(photo) <= 60000);
