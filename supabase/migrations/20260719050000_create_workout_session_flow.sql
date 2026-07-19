create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  training_date date not null,
  workout_label text not null check (char_length(trim(workout_label)) between 1 and 120),
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  notes text not null default '',
  started_at timestamptz not null default now(),
  paused_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, training_date)
);

create table if not exists public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_key text not null,
  exercise_name text not null,
  position smallint not null check (position > 0),
  created_at timestamptz not null default now(),
  unique (session_id, position)
);

create table if not exists public.set_logs (
  id uuid primary key default gen_random_uuid(),
  exercise_log_id uuid not null references public.exercise_logs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  set_number smallint not null check (set_number > 0),
  target_reps_min smallint not null check (target_reps_min > 0),
  target_reps_max smallint not null check (target_reps_max >= target_reps_min),
  actual_reps smallint check (actual_reps >= 0),
  load_kg numeric(7,2) check (load_kg >= 0),
  rpe numeric(3,1) check (rpe between 1 and 10),
  notes text not null default '',
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exercise_log_id, set_number)
);

-- Compatibilidade com tabelas legadas já existentes no projeto.
alter table public.workout_sessions
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists training_date date,
  add column if not exists workout_label text,
  add column if not exists status text default 'active',
  add column if not exists notes text default '',
  add column if not exists started_at timestamptz default now(),
  add column if not exists paused_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.workout_sessions
set training_date = coalesce(training_date, started_at::date, created_at::date, current_date),
    workout_label = coalesce(nullif(trim(workout_label), ''), 'Treino legado'),
    status = coalesce(status, 'active'),
    notes = coalesce(notes, ''),
    started_at = coalesce(started_at, created_at, now()),
    created_at = coalesce(created_at, started_at, now()),
    updated_at = coalesce(updated_at, created_at, now())
where training_date is null or workout_label is null or status is null or notes is null
   or started_at is null or created_at is null or updated_at is null;

alter table public.exercise_logs
  add column if not exists session_id uuid references public.workout_sessions(id) on delete cascade,
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists exercise_key text,
  add column if not exists exercise_name text,
  add column if not exists position smallint,
  add column if not exists created_at timestamptz default now();

alter table public.set_logs
  add column if not exists exercise_log_id uuid references public.exercise_logs(id) on delete cascade,
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists set_number smallint,
  add column if not exists target_reps_min smallint,
  add column if not exists target_reps_max smallint,
  add column if not exists actual_reps smallint,
  add column if not exists load_kg numeric(7,2),
  add column if not exists rpe numeric(3,1),
  add column if not exists notes text default '',
  add column if not exists completed boolean default false,
  add column if not exists completed_at timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create index if not exists workout_sessions_user_date_idx on public.workout_sessions (user_id, training_date desc);
create index if not exists exercise_logs_session_idx on public.exercise_logs (session_id, position);
create index if not exists set_logs_exercise_idx on public.set_logs (exercise_log_id, set_number);

create or replace function private.protect_completed_workout()
returns trigger language plpgsql set search_path = '' as $$
declare session_status text;
begin
  if tg_table_name = 'workout_sessions' then
    if old.status = 'completed' then raise exception 'completed workout history is immutable'; end if;
  elsif tg_table_name = 'exercise_logs' then
    select status into session_status from public.workout_sessions where id = old.session_id;
    if session_status = 'completed' then raise exception 'completed workout history is immutable'; end if;
  else
    select session.status into session_status
    from public.exercise_logs exercise
    join public.workout_sessions session on session.id = exercise.session_id
    where exercise.id = old.exercise_log_id;
    if session_status = 'completed' then raise exception 'completed workout history is immutable'; end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.protect_completed_workout() from public, anon, authenticated;

drop trigger if exists workout_sessions_updated_at on public.workout_sessions;
create trigger workout_sessions_updated_at before update on public.workout_sessions for each row execute function private.set_updated_at();
drop trigger if exists set_logs_updated_at on public.set_logs;
create trigger set_logs_updated_at before update on public.set_logs for each row execute function private.set_updated_at();
drop trigger if exists workout_sessions_protect_completed on public.workout_sessions;
create trigger workout_sessions_protect_completed before update or delete on public.workout_sessions for each row execute function private.protect_completed_workout();
drop trigger if exists exercise_logs_protect_completed on public.exercise_logs;
create trigger exercise_logs_protect_completed before update or delete on public.exercise_logs for each row execute function private.protect_completed_workout();
drop trigger if exists set_logs_protect_completed on public.set_logs;
create trigger set_logs_protect_completed before update or delete on public.set_logs for each row execute function private.protect_completed_workout();

alter table public.workout_sessions enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.set_logs enable row level security;

create policy "users manage own workout sessions" on public.workout_sessions for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "users read own exercise logs" on public.exercise_logs for select to authenticated
using ((select auth.uid()) = user_id);
create policy "users create exercise logs in own active session" on public.exercise_logs for insert to authenticated
with check ((select auth.uid()) = user_id and exists (
  select 1 from public.workout_sessions session
  where session.id = session_id and session.user_id = (select auth.uid()) and session.status <> 'completed'
));
create policy "users change own exercise logs" on public.exercise_logs for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users delete own exercise logs" on public.exercise_logs for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "users read own set logs" on public.set_logs for select to authenticated
using ((select auth.uid()) = user_id);
create policy "users create set logs in own active session" on public.set_logs for insert to authenticated
with check ((select auth.uid()) = user_id and exists (
  select 1 from public.exercise_logs exercise
  join public.workout_sessions session on session.id = exercise.session_id
  where exercise.id = exercise_log_id and exercise.user_id = (select auth.uid()) and session.status <> 'completed'
));
create policy "users change own set logs" on public.set_logs for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users delete own set logs" on public.set_logs for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.workout_sessions, public.exercise_logs, public.set_logs from anon;
grant select, insert, update, delete on public.workout_sessions, public.exercise_logs, public.set_logs to authenticated;
