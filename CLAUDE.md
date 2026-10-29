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
- **Três botões** (desenhos do usuário): Lançamentos (`/transacoes` = analítico do mês; lista completa em `/transacoes/todos`), Início (sempre o mês atual, três cartões empilhados: Saldo — engrenagem escolhe contas em `settings.home_hidden` —, Entradas/Saídas/Balanço e Previsão dos próximos meses; sem carrossel) e Notas (`/notas`: cadernos de lista, Lista de desejos, Transporte). Configuração = `/mais`. Gráficos não têm tela própria: abrem por mini botão (`ui/ChartButton`) num cartão. Conta do mês: `features/analytics.ts`; "falta pagar": `pendingThisMonth()`. Extras só com "Painéis avançados" (`prefs.full`). Preferir tirar a acrescentar.
- **Notas**: `notebooks` → `shopping_lists` (a mais nova é a atual) → `shopping_items` (`repeat`: vai para a próxima lista). "Gerar nova" pergunta se mantém os itens. Projetos = grupos da Lista de desejos. Transporte com 1 veículo abre direto nele.
- **Visual**: computador primeiro (menu lateral `ui/Sidebar.svelte` com tudo; `.page` até 1180 px; `.grid-2/.grid-3/.grid-main`). Vidro de verdade (`.glass`, backdrop-filter) só em barra lateral, folhas e balões; cartões usam degradê + brilho (`--card`, `--highlight`).
- **Gráficos** em `ui/charts/` (SVG puro, com balão no mouse e tabela escondida para leitor de tela): `BarChart` (agrupado/empilhado por `stack`), `LineChart`, `HBars`, `Ring`, `Sparkline`, e `ui/Donut`. Séries fixas usam `seriesColor` (azul/laranja/água, validadas para daltonismo); entidades (categoria, banco) usam a própria cor. Nunca dois eixos.
- **Logos**: `Avatar` usa o logo do site do estabelecimento (`autoLogo`) quando não há imagem; abaixo de 48 px fica o emoji. Itens da lista do mercado têm figurinha por nome (`itemEmoji`).
- **Fotos** (carro, projeto, item, pessoa) passam por `PhotoPicker` → `compressImage(file, 720, 120_000)`; sem foto, item com link mostra o logo da loja.
- **Leve**: sem bibliotecas de UI/gráficos; ícones novos entram em `scripts/icons.mjs` (rodar `node scripts/icons.mjs`); imagens enviadas passam por `compressImage` (≤160 px WebP).

## Conferir
`npm run build && npx vite preview --port 4317`, depois Chrome headless com `?demo` (`&abrir=importar|lancamento|conta` abre as folhas). Teste de cliques em todas as telas: `scripts/smoke.mjs <porta> <url> simples|completa` (Chrome com depuração remota). `?demo&vazio` mostra o primeiro acesso. Entrar/sair da demonstração sempre por `data/demoMode.ts` (precisa recarregar a página) (perfil novo a cada captura: o service worker guarda versões antigas; Chrome headless não fica abaixo de ~485 px de largura).
