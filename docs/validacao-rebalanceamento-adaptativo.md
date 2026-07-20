# Validação — rebalanceamento adaptativo

## Comportamento entregue

- Uma sessão iniciada em data fora do plano recebe o próximo treino pendente da sequência.
- Ao concluir, a ocorrência é registrada como não planejada e passa a consumir essa sessão.
- O histórico concluído é reconstruído a partir de `workout_sessions` e mantém data e rótulo originais.
- Somente as sessões pendentes são distribuídas novamente nas disponibilidades futuras marcadas.
- Datas disponíveis já passadas não voltam ao plano.
- O intervalo de recuperação continua sendo respeitado quando houver datas suficientes.

## Verificação automatizada

- `npm test`: 7 arquivos e 22 testes aprovados.
- `npm run build`: typecheck e build PWA de produção aprovados.

## Cenários cobertos

1. Treino fora do planejamento consome `Superior A` e o restante segue com `Inferiores` e `Superior B`.
2. A disponibilidade anterior que deixou de ser útil não recebe nova sessão.
3. Rótulos reais de múltiplas sessões concluídas permanecem inalterados.
4. Finalização distingue sessão planejada por meio do parâmetro `planned=1`.
