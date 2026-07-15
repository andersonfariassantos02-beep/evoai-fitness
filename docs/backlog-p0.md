# Backlog P0 — EvoAI Fitness

> Status: aprovado para execução  
> Repositório: `andersonfariassantos02-beep/evoai-fitness`  
> Prioridade: P0 — fundação e fluxo principal  
> Atualizado em: 15 de julho de 2026

## Objetivo da etapa

Entregar uma vertical slice confiável e instalável:

`login → perfil → treino planejado → registro série a série → substituição → conclusão → histórico → nova recomendação`

O trabalho deve preservar três princípios:

1. a próxima série permanece sempre visível durante o treino;
2. dados e histórico não dependem do chat nem desaparecem entre sessões;
3. recomendações são determinísticas, justificadas e nunca alteram registros silenciosamente.

## Ordem recomendada

1. Consolidar frontend em React + TypeScript + Vite PWA.
2. Implementar autenticação e rotas protegidas.
3. Criar schema Supabase para família, perfis e restrições.
4. Implementar fluxo de treino série a série.
5. Implementar substituições e progressão determinística.
6. Adicionar testes e critérios de conclusão do MVP.

## 1. [P0] Consolidar frontend em React + TypeScript + Vite PWA

**Status:** concluído em 15 de julho de 2026.

### Objetivo

Consolidar a base do frontend na arquitetura definida para o EvoAI Fitness: React + TypeScript + Vite como PWA instalável.

### Critérios de aceite

- [x] O projeto instala dependências e executa em ambiente local.
- [x] O comando de build termina sem erros.
- [x] A documentação deixa de indicar Next.js e passa a refletir React + TypeScript + Vite.
- [x] Manifesto, ícones e configuração mínima de PWA estão presentes.
- [x] A estrutura inicial está pronta para autenticação, perfis e treino ao vivo.

## 2. [P0] Implementar autenticação e rotas protegidas

### Objetivo

Transformar a integração inicial com Supabase Auth em um fluxo completo de acesso ao aplicativo.

### Critérios de aceite

- [ ] Login por e-mail e senha funciona com Supabase.
- [ ] A sessão permanece válida após recarregar o aplicativo.
- [ ] Estados de carregamento e mensagens de erro ficam visíveis.
- [ ] Usuários não autenticados são direcionados para a tela de login.
- [ ] Usuários autenticados acessam as rotas protegidas.
- [ ] Logout encerra a sessão e retorna à tela de login.

## 3. [P0] Criar schema Supabase para família, perfis e restrições

### Objetivo

Criar a fundação persistente e segura para uso pessoal e familiar do EvoAI Fitness.

### Critérios de aceite

- [ ] Migrações versionadas criam famílias, perfis, vínculos/papéis e restrições.
- [ ] Cada conta pode acessar somente famílias e perfis autorizados.
- [ ] As políticas de Row Level Security estão habilitadas e testadas.
- [ ] O responsável pode administrar os perfis permitidos da família.
- [ ] Restrições de treino podem ser associadas individualmente a cada perfil.
- [ ] O schema pode ser recriado a partir das migrações sem ajustes manuais.

## 4. [P0] Implementar fluxo de treino série a série

### Objetivo

Entregar o percurso principal do EvoAI Fitness para executar e registrar um treino completo no celular.

### Critérios de aceite

- [ ] O usuário abre o treino planejado do perfil selecionado.
- [ ] Cada exercício apresenta séries, faixa de repetições e carga sugerida.
- [ ] O usuário registra carga, repetições, RPE e observações.
- [ ] A próxima série permanece sempre visível após cada registro.
- [ ] A sessão pode ser pausada, retomada e concluída.
- [ ] Ao reabrir o aplicativo, os registros e o histórico continuam disponíveis.

## 5. [P0] Implementar substituições e progressão determinística

### Objetivo

Permitir substituições equivalentes e recomendações reproduzíveis com base no histórico do perfil.

### Critérios de aceite

- [ ] O usuário pode substituir um exercício quando houver indisponibilidade ou desconforto.
- [ ] As equivalências consideram grupo muscular, padrão de movimento, equipamento e restrições.
- [ ] Séries e repetições recomendadas acompanham o exercício substituto.
- [ ] O histórico do exercício original não é misturado com o histórico do substituto.
- [ ] A próxima recomendação considera carga, repetições, RPE, falha e execução anterior.
- [ ] A interface apresenta uma justificativa curta para cada recomendação.

## 6. [P0] Adicionar testes e critérios de conclusão do MVP

### Objetivo

Estabelecer uma barreira mínima de qualidade para o fluxo P0 do EvoAI Fitness.

### Critérios de aceite

- [ ] Existem testes unitários para substituições e progressão.
- [ ] O fluxo de autenticação e sessão possui validação automatizada.
- [ ] O percurso `treino planejado → séries → conclusão → histórico` é testado.
- [ ] As políticas RLS possuem cenários positivos e negativos documentados.
- [ ] O build de produção é executado automaticamente.
- [ ] A documentação informa como instalar, configurar, testar e validar o MVP.

## Definição de pronto do P0

O P0 estará concluído quando um usuário autenticado puder escolher um perfil autorizado, executar um treino completo série a série, realizar uma substituição, concluir a sessão, fechar o aplicativo e reencontrar o histórico e a próxima recomendação ao retornar.
