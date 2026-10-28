-- Mais bancos: a lista fica no app (src/lib/core/banks.ts); aqui só garante um identificador curto e simples.
alter table public.accounts drop constraint if exists accounts_bank_check;
alter table public.accounts add constraint accounts_bank_check check (bank ~ '^[a-z0-9]{1,24}$');
