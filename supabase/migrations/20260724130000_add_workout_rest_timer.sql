-- Prescrição e registro do descanso do modo de treino série por série.
-- A migração não cria novas tabelas expostas; mantém as políticas RLS existentes.

alter table public.exercise_logs
  add column if not exists rest_seconds smallint not null default 120
    check (rest_seconds between 30 and 600),
  add column if not exists transition_rest_seconds smallint not null default 180
    check (transition_rest_seconds between 30 and 600);

alter table public.set_logs
  add column if not exists target_rest_seconds smallint
    check (target_rest_seconds between 30 and 600),
  add column if not exists actual_rest_seconds smallint
    check (actual_rest_seconds between 0 and 3600);

comment on column public.exercise_logs.rest_seconds is
  'Descanso prescrito entre séries do mesmo exercício, em segundos.';
comment on column public.exercise_logs.transition_rest_seconds is
  'Descanso prescrito após a última série antes do próximo exercício, em segundos.';
comment on column public.set_logs.target_rest_seconds is
  'Descanso recomendado pelo coach após a série, em segundos.';
comment on column public.set_logs.actual_rest_seconds is
  'Descanso efetivamente realizado após a série, em segundos.';
