create table if not exists public.training_deload_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'active'
    check (status in ('active', 'completed', 'cancelled')),
  volume_reduction_percent smallint not null default 35
    check (volume_reduction_percent between 20 and 50),
  target_rpe_min numeric(2, 1) not null default 6,
  target_rpe_max numeric(2, 1) not null default 7,
  reason text not null default '',
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint training_deload_periods_valid_dates check (ends_on >= starts_on),
  constraint training_deload_periods_valid_rpe check (
    target_rpe_min between 1 and 10
    and target_rpe_max between target_rpe_min and 10
  )
);

create index if not exists training_deload_periods_user_dates_idx
  on public.training_deload_periods (user_id, starts_on desc, ends_on desc);

create unique index if not exists training_deload_periods_one_active_per_user_idx
  on public.training_deload_periods (user_id)
  where status = 'active';

alter table public.training_deload_periods enable row level security;

revoke all on table public.training_deload_periods from anon;
revoke all on table public.training_deload_periods from authenticated;
grant select, insert, update, delete on table public.training_deload_periods to authenticated;

create policy "Users can read their own deload periods"
  on public.training_deload_periods
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own deload periods"
  on public.training_deload_periods
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own deload periods"
  on public.training_deload_periods
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own deload periods"
  on public.training_deload_periods
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
