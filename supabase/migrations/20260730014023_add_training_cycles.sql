create table if not exists public.training_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  goal text not null check (goal in ('general_fitness', 'weight_loss', 'hypertrophy', 'strength', 'conditioning')),
  training_focus text[] not null default '{}',
  starts_on date not null,
  duration_weeks smallint not null check (duration_weeks between 4 and 6),
  target_sessions_per_week smallint not null check (target_sessions_per_week between 1 and 7),
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create unique index if not exists training_cycles_one_active_per_user_idx
  on public.training_cycles (user_id)
  where status = 'active';

create index if not exists training_cycles_user_start_idx
  on public.training_cycles (user_id, starts_on desc);

alter table public.training_cycles enable row level security;

revoke all on table public.training_cycles from anon;
revoke all on table public.training_cycles from authenticated;
grant select, insert, update, delete on table public.training_cycles to authenticated;

create policy "Users can read their own training cycles"
  on public.training_cycles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own training cycles"
  on public.training_cycles for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own training cycles"
  on public.training_cycles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own training cycles"
  on public.training_cycles for delete to authenticated
  using ((select auth.uid()) = user_id);
