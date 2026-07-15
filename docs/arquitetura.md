# EvoAI Fitness

## Objetivo

Plataforma inteligente de treino, nutrição e evolução física com IA.

## Tecnologias

### Frontend
- React 19
- TypeScript
- Vite 8
- PWA com service worker e manifesto

### Backend
- Supabase

### Banco de Dados
- PostgreSQL

### IA
- OpenAI

## Estrutura atual

- `frontend/src`: aplicação React tipada
- `frontend/public`: ícones e recursos públicos da PWA
- `frontend/vite.config.ts`: build, manifesto e service worker
- `docs/backlog-p0.md`: ordem de execução e critérios de aceite

O frontend usa somente a URL do projeto e uma chave publicável do Supabase. Chaves secretas e `service_role` não pertencem ao navegador.

## Módulos

### Autenticação
- Login
- Cadastro
- Recuperação de senha

### Treino
- Exercícios
- Sessões
- Séries
- Progressão

### Nutrição
- Refeições
- Calorias
- Macronutrientes

### Evolução
- Peso
- Medidas
- Fotos
- Gráficos

### IA
- Análise de treino
- Recomendações
- Progressão automática

## Roadmap MVP

### Fase 1
- Login
- Dashboard
- Registro de treino
- Histórico

### Fase 2
- Nutrição
- Peso e medidas
- Gráficos

### Fase 3
- IA Coach
- Recomendações automáticas
- Progressão de carga
