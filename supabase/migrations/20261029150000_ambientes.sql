-- Ambientes: Pessoal e Empresa (MEI). Usa as áreas de trabalho, agora com tipo; cadernos de Notas podem ser de um ambiente.
alter table public.workspaces add column if not exists kind text not null default 'personal' check (kind in ('personal', 'business'));
alter table public.notebooks add column if not exists workspace_id uuid;
