-- Fotos do carro, dos projetos e dos itens: comprimidas no navegador (WebP) e guardadas como data URL.
alter table public.vehicles add column if not exists photo text not null default '' check (length(photo) <= 160000);
alter table public.projects add column if not exists photo text not null default '' check (length(photo) <= 160000);
alter table public.project_items add column if not exists photo text not null default '' check (length(photo) <= 60000);
