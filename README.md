# EvoAI Fitness

PWA mobile-first para treino série a série, nutrição e evolução física.

## Stack

- React 19 + TypeScript
- Vite 8 + vite-plugin-pwa
- Supabase Auth e Postgres

## Executar localmente

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Preencha no `.env` a URL do projeto e uma chave publicável do Supabase. Nunca use uma chave secreta ou `service_role` no frontend.

No painel do Supabase, mantenha o provedor de e-mail habilitado e configure a URL do aplicativo em **Authentication → URL Configuration**. Em projetos hospedados, a confirmação de e-mail fica habilitada por padrão.

## Fluxo de acesso

- `#/login`: login por e-mail e senha;
- `#/cadastro`: criação de conta e confirmação por e-mail;
- `#/app`: área protegida, disponível somente com sessão válida;
- logout: encerra a sessão e retorna ao login.

O roteamento por hash permite abrir as rotas diretamente em hospedagens estáticas sem regras adicionais de rewrite.

## Validar

```bash
npm run typecheck
npm run build
npm run preview
```

O build gera o manifesto e o service worker da PWA em `frontend/dist/`.

## Planejamento

- [Arquitetura](docs/arquitetura.md)
- [Backlog P0](docs/backlog-p0.md)
