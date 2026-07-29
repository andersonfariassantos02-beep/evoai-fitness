create table if not exists public.daily_readiness_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null,
  sleep_hours numeric(3,1) not null,
  energy smallint not null,
  soreness smallint not null,
  fatigue smallint not null,
  joint_discomfort boolean not null default false,
  available_minutes smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_readiness_checkins_user_date_key unique (user_id, checkin_date),
  constraint daily_readiness_checkins_sleep_hours_check check (sleep_hours between 0 and 16),
  constraint daily_readiness_checkins_energy_check check (energy between 1 and 5),
  constraint daily_readiness_checkins_soreness_check check (soreness between 1 and 5),
  constraint daily_readiness_checkins_fatigue_check check (fatigue between 1 and 5),
  constraint daily_readiness_checkins_available_minutes_check check (available_minutes between 15 and 240)
);

alter table public.daily_readiness_checkins enable row level security;

create policy "Users can read their own readiness checkins"
on public.daily_readiness_checkins
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own readiness checkins"
on public.daily_readiness_checkins
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own readiness checkins"
on public.daily_readiness_checkins
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own readiness checkins"
on public.daily_readiness_checkins
for delete
to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.daily_readiness_checkins to authenticated;

create index if not exists daily_readiness_checkins_user_date_idx
on public.daily_readiness_checkins (user_id, checkin_date desc);

comment on table public.daily_readiness_checkins is
  'Daily subjective recovery data used to tailor workout suggestions and fatigue guidance.';

