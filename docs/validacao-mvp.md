# Validação do MVP — EvoAI Fitness

## Preparação

1. Instale Node.js 22 e execute `npm ci` dentro de `frontend`.
2. Copie `.env.example` para `.env` e informe `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Aplique os arquivos de `supabase/migrations` em ordem cronológica.
4. Execute `npm test` e `npm run build`.

## Cenários RLS

| Cenário | Resultado esperado |
|---|---|
| Usuário autenticado consulta seu calendário, sessões, exercícios e séries | Acesso permitido |
| Usuário autenticado cria ou altera registros vinculados ao próprio `user_id` | Acesso permitido |
| Usuário tenta consultar ou alterar registros de outro `user_id` | Nenhuma linha exposta ou operação rejeitada |
| Chave anônima acessa tabelas de treino | Operação rejeitada |
| Usuário tenta alterar ou apagar treino concluído | Gatilho rejeita a operação |

Os testes pgTAP em `supabase/tests` verificam tabelas, RLS, políticas e gatilhos. Execute-os em um banco de teste com pgTAP habilitado; todos usam transação e `rollback`.

## Aceite funcional

1. Cadastre-se, confirme o e-mail, entre e verifique que logout bloqueia as rotas privadas.
2. Marque disponibilidade no calendário e recarregue a página.
3. Abra o treino planejado, registre carga, repetições e RPE série a série.
4. Pause, recarregue e confirme a restauração da sessão.
5. Substitua um exercício não iniciado e confirme a prescrição própria do substituto.
6. Conclua o treino e confirme calendário, histórico e recomendação seguinte.
7. Tente substituir um exercício já iniciado e confirme o bloqueio de proteção do histórico.

## Critério de aprovação

O MVP está aprovado quando os testes e o build passam, os cenários RLS estão protegidos e o percurso completo continua disponível após encerrar e reabrir o aplicativo.
