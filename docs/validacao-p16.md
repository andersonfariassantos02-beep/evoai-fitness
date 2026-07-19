# Validação P1.6 — Orientação técnica e mídia

## Entregas

- instruções técnicas e cautelas por exercício;
- variações de equipamento mantidas no Banco Mestre;
- mídia opcional limitada a URL HTTPS;
- edição dos novos campos pela curadoria administrativa;
- exibição progressiva da orientação durante o treino;
- fallback compatível quando a orientação ainda não estiver cadastrada.

## Validação

1. Executar a migração `20260719230000_add_exercise_guidance_media.sql` no Supabase.
2. Executar `exercise_guidance_media_test.sql` e confirmar sucesso.
3. No frontend, executar `npm test`, `npm run typecheck` e `npm run build`.
4. Acessar `#/admin/exercicios`, editar instrução, cautelas, mídia HTTPS e variações.
5. Abrir um treino e confirmar que a seção “Como executar” mostra os dados salvos.
6. Confirmar que URL sem HTTPS é recusada e que o histórico de séries não é alterado.
