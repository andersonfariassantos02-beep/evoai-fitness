alter table public.profiles
  add column if not exists training_goal text not null default 'general_fitness',
  add column if not exists weekly_target smallint not null default 3;

alter table public.profiles drop constraint if exists profiles_training_goal_check;
alter table public.profiles add constraint profiles_training_goal_check
  check (training_goal in ('general_fitness', 'hypertrophy', 'strength', 'conditioning'));

alter table public.profiles drop constraint if exists profiles_weekly_target_check;
alter table public.profiles add constraint profiles_weekly_target_check
  check (weekly_target between 1 and 7);

comment on column public.profiles.training_goal is 'Objetivo usado pelo gerador determinístico do plano semanal.';
comment on column public.profiles.weekly_target is 'Limite semanal; nunca cria sessões fora das datas marcadas como disponíveis.';

revoke all on public.profiles from anon;
grant select, update on public.profiles to authenticated;
