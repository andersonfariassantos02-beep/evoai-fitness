# EvoAI Fitness

## Objetivo

Plataforma inteligente de treino, nutrição e evolução física com IA.

## Tecnologias

### Frontend
- React 19
- TypeScript
- Vite 8
- PWA com service worker e manifesto
- React Router com rotas por hash

### Backend
- Supabase

### Banco de Dados
- PostgreSQL
- Migrações versionadas pelo Supabase CLI
- Row Level Security para isolamento entre famílias

### IA
- OpenAI

## Estrutura atual

- `frontend/src`: aplicação React tipada
- `frontend/public`: ícones e recursos públicos da PWA
- `frontend/vite.config.ts`: build, manifesto e service worker
- `docs/backlog-p0.md`: ordem de execução e critérios de aceite

O frontend usa somente a URL do projeto e uma chave publicável do Supabase. Chaves secretas e `service_role` não pertencem ao navegador.

O Supabase Auth é centralizado no `AuthProvider`, responsável por restaurar a sessão e acompanhar eventos de autenticação. As rotas `#/login` e `#/cadastro` são públicas; `#/app` exige sessão válida. O roteamento por hash mantém a navegação compatível com hospedagens estáticas sem regras adicionais de rewrite.

O domínio familiar é persistido nas tabelas `families`, `family_members`, `profiles` e `profile_restrictions`. O acesso é concedido por vínculo e papel (`owner`, `admin` ou `member`), com políticas RLS em todas as tabelas expostas. Funções auxiliares de autorização ficam no schema privado `private`, fora da Data API.

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
- Calendário de disponibilidade informado pelo usuário
- Planejamento semanal adaptativo e ajustes por treino antecipado, extra ou perdido

O aplicativo não fixa nem deduz escala de trabalho. O calendário mensal é a entrada de disponibilidade e o resumo semanal é derivado exclusivamente das datas marcadas. Treinos concluídos permanecem preservados no histórico; quando uma sessão acontece fora do plano, somente as sessões futuras são redistribuídas.

As marcações são locais primeiro e sincronizadas com `training_calendar_entries` no Supabase. Uma fila persistente mantém alterações feitas sem conexão e tenta enviá-las novamente quando a rede retorna. O estado da sincronização fica visível na tela. Reajustes causados por treino fora do plano são registrados de forma append-only em `schedule_adjustments`; suas políticas RLS restringem leitura e escrita ao próprio usuário.

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
