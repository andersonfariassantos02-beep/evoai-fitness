# Backlog P1 — EvoAI Fitness

## 1. Banco Mestre de Exercícios

**Status:** pronto para validação em 19 de julho de 2026.

### Objetivo

Centralizar a prescrição dos exercícios no Supabase sem misturar catálogo, sessão executada e histórico.

### Critérios de aceite

- [x] O catálogo possui nome, grupo muscular, padrão de movimento, equipamento, séries e faixa de repetições.
- [x] O frontend lê exercícios ativos do Supabase e mantém fallback local para indisponibilidade temporária.
- [x] Somente usuários autenticados podem ler o catálogo; o frontend não pode alterá-lo.
- [x] A criação de treinos usa a prescrição retornada pelo Banco Mestre.
- [x] Substituições usam equivalências e prescrição do exercício substituto.
- [x] O histórico permanece vinculado à chave do exercício efetivamente executado.

## Próximas prioridades

1. [x] Tela administrativa para curadoria do catálogo, fora do cliente público.
2. Vincular restrições dos perfis automaticamente aos filtros de substituição.
3. Ampliar o catálogo e cadastrar instruções técnicas, mídia e variações por equipamento.
4. [x] Gerar planos semanais por objetivo, disponibilidade e recuperação.

## 2. Restrições do perfil no planejamento

**Status:** pronto para validação em 19 de julho de 2026.

- [x] O perfil ativo vinculado ao usuário é resolvido automaticamente.
- [x] Restrições ativas e vigentes filtram o planejamento e as substituições.
- [x] Restrições informativas não bloqueiam exercícios.
- [x] A sessão preserva perfil, nome e retrato das restrições aplicadas.
- [x] Sem perfil vinculado, o fluxo permanece compatível e sem bloqueio.

## 3. Gestão de perfil e restrições no aplicativo

**Status:** pronto para validação em 19 de julho de 2026.

- [x] A rota protegida `#/perfil` permite editar nome e data de nascimento.
- [x] O usuário pode cadastrar categoria, orientação, período e descrição da restrição.
- [x] Restrições podem ser pausadas, reativadas ou removidas sem apagar o retrato histórico das sessões.
- [x] As operações utilizam as políticas RLS existentes de família, perfil e restrições.
- [x] O aplicativo não presume diagnósticos e informa que a funcionalidade não substitui avaliação profissional.
- [x] Validação automatizada cobre datas inválidas, descrição obrigatória e acesso à rota autenticada.
