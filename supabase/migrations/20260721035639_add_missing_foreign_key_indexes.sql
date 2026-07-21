create index if not exists families_created_by_idx
  on public.families (created_by);

create index if not exists family_members_created_by_idx
  on public.family_members (created_by);

create index if not exists profile_restrictions_created_by_idx
  on public.profile_restrictions (created_by);

create index if not exists profiles_created_by_idx
  on public.profiles (created_by);

create index if not exists profiles_linked_user_id_idx
  on public.profiles (linked_user_id)
  where linked_user_id is not null;

create index if not exists set_logs_user_id_idx
  on public.set_logs (user_id);

create index if not exists workout_logs_exercise_id_idx
  on public.workout_logs (exercise_id);

create index if not exists workout_sets_exercise_id_idx
  on public.workout_sets (exercise_id);

create index if not exists workout_sets_session_id_idx
  on public.workout_sets (session_id);
