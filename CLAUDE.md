# Financeiro (web) — notas para quem for mexer

Substitui o app nativo Swift (arquivado em `../Financeiro`). SvelteKit 2 + Svelte 5 (runes), estático (adapter-static, roteamento por hash), GitHub Pages; dados no Supabase.

## Regras
- **Segurança**: toda tabela nova precisa de `household_id`, RLS e a política `is_member(household_id)` (ver a migração). Nunca usar a chave service_role no app. Arquivos de banco são lidos no navegador.
- **Dinheiro em centavos inteiros**, datas como dia `"YYYY-MM-DD"` (`core/dates.ts`), sem fuso.
- **Lógica pura em `src/lib/core`** (portada do Swift, com testes em `tests/`). Rodar `npm test` depois de mexer em leitores, categorizador, faturas ou previsão. Fixtures são sintéticas, nunca extratos reais.
- **Bancos** ficam todos em `core/banks.ts` (código COMPE do OFX, trechos de texto que identificam o banco, cores do cartão, caminho de exportação). Banco novo: só acrescentar lá (o banco de dados aceita qualquer id curto) e um teste em `tests/banks.test.ts`.
- **Organizar** (carro, casa/projetos, lista de compras) usa `data/organizer.svelte.ts`, não o `store`: cada item mora num espaço (`household_id` = casa pessoal ou espaço `kind = 'shared'`). O financeiro nunca vai para espaço compartilhado. Itens filhos herdam o espaço do pai por gatilho no banco; mover o pai (`organizer.move`) leva os filhos. Lógica pura em `core/vehicle.ts`, `core/shopping.ts`, `core/sheet.ts`.
- **Escrita otimista** pelo `store` (`data/store.svelte.ts`): `insert/update/remove` mudam a tela na hora e desfazem se o Supabase recusar.
- **Cópias de investimento** (`is_mirror`): depois de mexer em lançamentos chamar `reconcileMirrors()`; nunca criar/apagar à mão.
- **Mês do usuário**: Entrou / Saiu (conta + dinheiro, inclui fatura paga) / Crédito (informativo, vai para "a pagar" no mês da fatura) — `features/month.ts`.
- **Áreas de trabalho** separam tudo: filtrar com `inScope*` de `features/model.ts`; itens novos nascem em `store.scopeId`.
- **Todo controle tem `use:hint={['Título', 'o que faz']}`** (balão no mouse, descrição acessível no toque).
- **Leve**: sem bibliotecas de UI/gráficos; ícones novos entram em `scripts/icons.mjs` (rodar `node scripts/icons.mjs`); imagens enviadas passam por `compressImage` (≤160 px WebP).

## Conferir
`npm run build && npx vite preview --port 4317`, depois Chrome headless com `?demo` (`&abrir=importar|lancamento|conta` abre as folhas) (perfil novo a cada captura: o service worker guarda versões antigas; Chrome headless não fica abaixo de ~485 px de largura).
