alter table public.workout_sessions
  add column if not exists profile_id uuid references public.profiles(id) on delete restrict,
  add column if not exists profile_name text,
  add column if not exists applied_restrictions jsonb not null default '[]'::jsonb;

create index if not exists workout_sessions_profile_date_idx
  on public.workout_sessions (profile_id, training_date desc)
  where profile_id is not null;

comment on column public.workout_sessions.profile_id is
  'Perfil ativo vinculado ao usuário no momento da criação da sessão.';
comment on column public.workout_sessions.profile_name is
  'Nome do perfil preservado para auditoria histórica.';
comment on column public.workout_sessions.applied_restrictions is
  'Retrato imutável das restrições consideradas no planejamento.';

revoke all on public.workout_sessions from anon;
grant select, insert, update, delete on public.workout_sessions to authenticated;
