create table if not exists public.training_calendar_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  training_date date not null,
  available boolean not null default false,
  completed boolean not null default false,
  completed_was_planned boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, training_date),
  constraint training_calendar_completed_plan_state check (
    completed or completed_was_planned is null
  ),
  constraint training_calendar_nonempty_entry check (
    available or completed
  )
);

create table if not exists public.schedule_adjustments (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  event_date date not null,
  reason text not null check (reason in ('unplanned_workout_completed')),
  created_at timestamptz not null default now()
);

create index if not exists training_calendar_entries_user_date_idx
  on public.training_calendar_entries (user_id, training_date);

create index if not exists schedule_adjustments_user_week_idx
  on public.schedule_adjustments (user_id, week_start, created_at);

create or replace function private.audit_unplanned_workout()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is distinct from (select auth.uid()) then
    raise exception 'calendar audit user mismatch';
  end if;

  if not new.completed or new.completed_was_planned is distinct from false then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.completed then
      return new;
    end if;
  end if;

  insert into public.schedule_adjustments (
    user_id,
    week_start,
    event_date,
    reason
  ) values (
    new.user_id,
    new.training_date - (extract(isodow from new.training_date)::integer - 1),
    new.training_date,
    'unplanned_workout_completed'
  );

  return new;
end;
$$;

revoke all on function private.audit_unplanned_workout() from public, anon, authenticated;

drop trigger if exists training_calendar_set_updated_at on public.training_calendar_entries;
create trigger training_calendar_set_updated_at
before update on public.training_calendar_entries
for each row execute function private.set_updated_at();

drop trigger if exists training_calendar_audit_unplanned on public.training_calendar_entries;
create trigger training_calendar_audit_unplanned
after insert or update of completed on public.training_calendar_entries
for each row execute function private.audit_unplanned_workout();

alter table public.training_calendar_entries enable row level security;
alter table public.schedule_adjustments enable row level security;

drop policy if exists "users can read own training calendar" on public.training_calendar_entries;
create policy "users can read own training calendar"
on public.training_calendar_entries
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users can create own training calendar" on public.training_calendar_entries;
create policy "users can create own training calendar"
on public.training_calendar_entries
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "users can update own training calendar" on public.training_calendar_entries;
create policy "users can update own training calendar"
on public.training_calendar_entries
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "users can delete own training calendar" on public.training_calendar_entries;
create policy "users can delete own training calendar"
on public.training_calendar_entries
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users can read own schedule adjustments" on public.schedule_adjustments;
create policy "users can read own schedule adjustments"
on public.schedule_adjustments
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.training_calendar_entries from anon;
revoke all on public.schedule_adjustments from anon;
grant select, insert, update, delete on public.training_calendar_entries to authenticated;
grant select on public.schedule_adjustments to authenticated;
