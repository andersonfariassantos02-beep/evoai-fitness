alter table public.profiles drop constraint if exists profiles_training_goal_check;
alter table public.profiles add constraint profiles_training_goal_check
  check (training_goal in ('general_fitness', 'weight_loss', 'hypertrophy', 'strength', 'conditioning'));

alter table public.profiles
  add column if not exists training_focus text[] not null default array['full_body']::text[];

alter table public.profiles drop constraint if exists profiles_training_focus_check;
alter table public.profiles add constraint profiles_training_focus_check
  check (
    cardinality(training_focus) between 1 and 4
    and training_focus <@ array['full_body', 'glutes', 'legs', 'chest', 'back', 'shoulders', 'arms', 'core']::text[]
  );

comment on column public.profiles.training_focus is
  'Áreas que o usuário deseja priorizar na prescrição; não substituem restrições de segurança.';
