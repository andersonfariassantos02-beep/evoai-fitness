create table if not exists public.exercise_performance_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_key text not null check (char_length(exercise_key) between 1 and 120),
  exercise_name text not null check (char_length(exercise_name) between 1 and 160),
  metric text not null check (metric in ('load', 'estimated_1rm')),
  target_value numeric(7,2) not null check (target_value > 0 and target_value <= 2000),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, exercise_key)
);

create index if not exists exercise_performance_goals_user_idx
  on public.exercise_performance_goals (user_id, exercise_key);

alter table public.exercise_performance_goals enable row level security;

revoke all on table public.exercise_performance_goals from anon;
revoke all on table public.exercise_performance_goals from authenticated;
grant select, insert, update, delete on table public.exercise_performance_goals to authenticated;

create policy "Users can read their own exercise goals"
  on public.exercise_performance_goals for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own exercise goals"
  on public.exercise_performance_goals for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own exercise goals"
  on public.exercise_performance_goals for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own exercise goals"
  on public.exercise_performance_goals for delete to authenticated
  using ((select auth.uid()) = user_id);
