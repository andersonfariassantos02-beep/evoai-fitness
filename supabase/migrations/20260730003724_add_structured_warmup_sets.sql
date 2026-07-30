alter table public.set_logs
  add column if not exists is_warmup boolean not null default false;

alter table public.set_logs
  drop constraint if exists set_logs_exercise_log_id_set_number_key;

create unique index if not exists set_logs_exercise_kind_number_idx
  on public.set_logs (exercise_log_id, is_warmup, set_number);

comment on column public.set_logs.is_warmup is
  'Identifica séries preparatórias, excluídas de volume, recordes e progressão.';
