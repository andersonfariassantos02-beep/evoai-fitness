alter table public.workout_sessions
  add column if not exists cancelled_at timestamptz;

alter table public.workout_sessions
  drop constraint if exists workout_sessions_status_check;

alter table public.workout_sessions
  add constraint workout_sessions_status_check
  check (status in ('active', 'paused', 'completed', 'cancelled'));

alter table public.workout_sessions
  drop constraint if exists workout_sessions_user_id_training_date_key;

drop index if exists public.workout_sessions_user_training_date_unique;

create unique index workout_sessions_current_user_training_date_unique
  on public.workout_sessions (user_id, training_date)
  where status <> 'cancelled';

create index if not exists workout_sessions_cancelled_history_idx
  on public.workout_sessions (user_id, training_date desc, cancelled_at desc)
  where status = 'cancelled';

create or replace function private.protect_completed_workout()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  session_status text;
begin
  if tg_table_name = 'workout_sessions' then
    if old.status in ('completed', 'cancelled') then
      raise exception 'finished workout history is immutable';
    end if;
  elsif tg_table_name = 'exercise_logs' then
    select status into session_status
    from public.workout_sessions
    where id = old.session_id;
    if session_status in ('completed', 'cancelled') then
      raise exception 'finished workout history is immutable';
    end if;
  else
    select session.status into session_status
    from public.exercise_logs exercise
    join public.workout_sessions session on session.id = exercise.session_id
    where exercise.id = old.exercise_log_id;
    if session_status in ('completed', 'cancelled') then
      raise exception 'finished workout history is immutable';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.protect_completed_workout() from public, anon, authenticated;

drop policy if exists "users create exercise logs in own active session" on public.exercise_logs;
create policy "users create exercise logs in own active session"
on public.exercise_logs for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.workout_sessions session
    where session.id = session_id
      and session.user_id = (select auth.uid())
      and session.status in ('active', 'paused')
  )
);

drop policy if exists "users create set logs in own active session" on public.set_logs;
create policy "users create set logs in own active session"
on public.set_logs for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.exercise_logs exercise
    join public.workout_sessions session on session.id = exercise.session_id
    where exercise.id = exercise_log_id
      and exercise.user_id = (select auth.uid())
      and session.status in ('active', 'paused')
  )
);

create or replace function public.cancel_started_workout(p_session_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_session public.workout_sessions%rowtype;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
  into v_session
  from public.workout_sessions
  where id = p_session_id
    and user_id = v_user_id
  for update;

  if not found or v_session.status not in ('active', 'paused') then
    raise exception 'WORKOUT_NOT_CANCELLABLE';
  end if;

  if not exists (
    select 1
    from public.set_logs sets
    join public.exercise_logs exercise on exercise.id = sets.exercise_log_id
    where exercise.session_id = p_session_id
      and sets.completed
  ) then
    raise exception 'WORKOUT_NOT_STARTED';
  end if;

  update public.workout_sessions
  set status = 'cancelled',
      cancelled_at = now(),
      paused_at = null
  where id = p_session_id
    and user_id = v_user_id;
end;
$$;

revoke all on function public.cancel_started_workout(uuid) from public, anon;
grant execute on function public.cancel_started_workout(uuid) to authenticated;

comment on column public.workout_sessions.cancelled_at is
  'Momento em que um treino iniciado foi encerrado para permitir uma nova ficha, preservando seus registros.';

comment on function public.cancel_started_workout(uuid) is
  'Encerra de forma imutável um treino iniciado do usuário autenticado para permitir uma nova ficha na mesma data.';
