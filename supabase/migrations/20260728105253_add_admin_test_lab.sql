alter table public.workout_sessions
  add column if not exists session_kind text not null default 'real';

alter table public.workout_sessions
  drop constraint if exists workout_sessions_session_kind_check;

alter table public.workout_sessions
  add constraint workout_sessions_session_kind_check
  check (session_kind in ('real', 'test'));

drop index if exists public.workout_sessions_current_user_training_date_unique;

create unique index workout_sessions_current_user_training_date_unique
  on public.workout_sessions (user_id, training_date, session_kind)
  where status <> 'cancelled';

create index if not exists workout_sessions_test_lab_idx
  on public.workout_sessions (user_id, created_at desc)
  where session_kind = 'test';

drop policy if exists "users manage own workout sessions" on public.workout_sessions;

create policy "users read own workout sessions"
on public.workout_sessions for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users create own real workouts or admins create tests"
on public.workout_sessions for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    session_kind = 'real'
    or (session_kind = 'test' and (select private.is_app_admin()))
  )
);

create policy "users update own real workouts or admins update tests"
on public.workout_sessions for update
to authenticated
using (
  (select auth.uid()) = user_id
  and (
    session_kind = 'real'
    or (session_kind = 'test' and (select private.is_app_admin()))
  )
)
with check (
  (select auth.uid()) = user_id
  and (
    session_kind = 'real'
    or (session_kind = 'test' and (select private.is_app_admin()))
  )
);

create policy "users delete own real workouts or admins delete tests"
on public.workout_sessions for delete
to authenticated
using (
  (select auth.uid()) = user_id
  and (
    session_kind = 'real'
    or (session_kind = 'test' and (select private.is_app_admin()))
  )
);

create or replace function private.protect_completed_workout()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  session_status text;
  session_kind text;
begin
  if tg_table_name = 'workout_sessions' then
    if tg_op = 'DELETE'
      and old.session_kind = 'test'
      and old.user_id = (select auth.uid())
      and (select private.is_app_admin())
    then
      return old;
    end if;
    if old.status in ('completed', 'cancelled') then
      raise exception 'finished workout history is immutable';
    end if;
  elsif tg_table_name = 'exercise_logs' then
    select status, workout_sessions.session_kind
      into session_status, session_kind
    from public.workout_sessions
    where id = old.session_id;
    if tg_op = 'DELETE'
      and session_kind = 'test'
      and old.user_id = (select auth.uid())
      and (select private.is_app_admin())
    then
      return old;
    end if;
    if session_status in ('completed', 'cancelled') then
      raise exception 'finished workout history is immutable';
    end if;
  else
    select session.status, session.session_kind
      into session_status, session_kind
    from public.exercise_logs exercise
    join public.workout_sessions session on session.id = exercise.session_id
    where exercise.id = old.exercise_log_id;
    if tg_op = 'DELETE'
      and session_kind = 'test'
      and old.user_id = (select auth.uid())
      and (select private.is_app_admin())
    then
      return old;
    end if;
    if session_status in ('completed', 'cancelled') then
      raise exception 'finished workout history is immutable';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.protect_completed_workout() from public, anon, authenticated;

alter table public.user_admin_audit
  drop constraint if exists user_admin_audit_action_check;

alter table public.user_admin_audit
  add constraint user_admin_audit_action_check
  check (action in (
    'invite_user',
    'grant_admin',
    'revoke_admin',
    'send_password_reset',
    'delete_test_workout'
  ));

drop policy if exists "app admins record own test deletions" on public.user_admin_audit;
create policy "app admins record own test deletions"
on public.user_admin_audit for insert
to authenticated
with check (
  actor_user_id = (select auth.uid())
  and action = 'delete_test_workout'
  and (select private.is_app_admin())
);

grant insert on public.user_admin_audit to authenticated;
grant usage, select on sequence public.user_admin_audit_id_seq to authenticated;

create or replace function public.delete_test_workout(p_session_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_deleted_label text;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if not (select private.is_app_admin()) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  delete from public.workout_sessions
  where id = p_session_id
    and user_id = v_user_id
    and session_kind = 'test'
  returning workout_label into v_deleted_label;

  if v_deleted_label is null then
    raise exception 'TEST_WORKOUT_NOT_FOUND';
  end if;

  insert into public.user_admin_audit (
    actor_user_id,
    target_user_id,
    action
  )
  values (
    v_user_id,
    v_user_id,
    'delete_test_workout'
  );
end;
$$;

revoke all on function public.delete_test_workout(uuid) from public, anon;
grant execute on function public.delete_test_workout(uuid) to authenticated;

comment on column public.workout_sessions.session_kind is
  'Separa treinos reais de simulações administrativas que não afetam calendário, progressão ou relatórios.';

comment on function public.delete_test_workout(uuid) is
  'Exclui atomicamente uma sessão de teste pertencente ao administrador autenticado e registra auditoria.';
