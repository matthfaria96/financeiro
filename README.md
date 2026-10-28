# Financeiro

Controle das contas de casa no navegador: celular, tablet ou computador, instalável na tela inicial. Importa extratos e faturas de 24 bancos e cartões brasileiros (Nubank, Inter, Itaú, Bradesco, Santander, BB, Caixa, C6 e outros; OFX, CSV, PDF), categoriza sozinho, separa por pessoa e área de trabalho e mostra o mês do jeito certo: o que entrou, o que saiu da conta, o que foi comprado no crédito e o que falta pagar.

- **App**: SvelteKit (Svelte 5) estático, publicado no GitHub Pages. Gráficos em SVG puro, ícones Lucide embutidos só os usados, leitor de PDF carregado só quando necessário (~140 KB gzip na abertura).
- **Dados**: Supabase (Postgres) com RLS em todas as tabelas. Tudo pertence a uma "casa"; só membros logados leem ou escrevem. Sem login, nada.
- **Privacidade**: o arquivo do banco é lido no próprio aparelho; só os lançamentos vão para o banco de dados. Logos são buscados pelo domínio da empresa e guardados como link.
- **Rápido**: cópia local no navegador (IndexedDB) para abrir na hora, service worker para funcionar sem internet, tempo real entre aparelhos.

## Configurar o Supabase (uma vez)

1. No [Supabase](https://supabase.com), crie um projeto (plano grátis serve).
2. **SQL Editor** › cole e rode `supabase/migrations/20261028120000_inicial.sql`.
3. **Authentication › Sign In / Providers**: deixe "Email" ligado e **desligue "Allow new users to sign up"** (ninguém se cadastra sozinho).
4. **Authentication › Users › Add user**: crie o seu acesso (e o da sua esposa) com e-mail e senha.
5. **Authentication › URL Configuration**: em *Site URL* ponha o endereço do app (ex.: `https://matthfaria96.github.io/financeiro/`).
6. **Project Settings › API**: copie a *Project URL* e a chave *anon public*.
7. No GitHub, repositório › **Settings › Secrets and variables › Actions › Variables**: crie `PUBLIC_SUPABASE_URL` e `PUBLIC_SUPABASE_ANON_KEY` com esses valores e rode o workflow de novo. Nunca use a chave `service_role` aqui.

O primeiro acesso cria a casa; quem entrar depois usa o **código de convite** (Mais › Ajustes).

## Domínio próprio

No Cloudflare, crie um registro `CNAME financeiro → matthfaria96.github.io` e, no repositório, a variável `CUSTOM_DOMAIN = financeiro.witchmymac.com`. Depois, em Settings › Pages, informe o mesmo domínio e ative HTTPS.

## Desenvolvimento

```sh
npm install
npm run dev          # http://localhost:5173/?demo  (sem .env, abre a demonstração)
npm test             # leitores de extrato, categorização, faturas, previsão
npm run check        # tipos
npm run build        # site estático em build/
```

`?demo` sempre abre a demonstração (dados fictícios em memória, nada é salvo). `?demo&abrir=importar|lancamento` abre as folhas.
