alter table public.exercise_logs
  add column if not exists original_exercise_key text,
  add column if not exists substitution_reason text;

comment on column public.exercise_logs.original_exercise_key is 'Chave original preservada quando há substituição; impede mistura silenciosa de históricos.';
comment on column public.exercise_logs.substitution_reason is 'Motivo informado pelo usuário: indisponibilidade, desconforto ou restrição.';

create index if not exists exercise_logs_user_key_history_idx
on public.exercise_logs (user_id, exercise_key, created_at desc);
