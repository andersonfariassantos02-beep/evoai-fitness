create or replace function private.protect_completed_workout()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  session_status text;
  session_kind text;
begin
  if current_setting('app.verified_test_user_cleanup', true) = 'on' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

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

create or replace function public.delete_test_user_data(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from auth.users
    where id = target_user_id
      and coalesce(raw_app_meta_data ->> 'evoai_test_user', 'false') = 'true'
  ) then
    raise exception using message = 'ONLY_TEST_USERS_CAN_BE_DELETED';
  end if;

  if exists (
    select 1
    from public.families family
    join public.family_members member on member.family_id = family.id
    where family.created_by = target_user_id
      and member.user_id <> target_user_id
  ) or exists (
    select 1
    from public.family_members
    where created_by = target_user_id
      and user_id <> target_user_id
  ) or exists (
    select 1
    from public.profiles
    where created_by = target_user_id
      and linked_user_id is distinct from target_user_id
  ) or exists (
    select 1
    from public.user_admin_audit
    where actor_user_id = target_user_id
  ) then
    raise exception using message = 'TEST_USER_HAS_SHARED_OR_AUDITED_DATA';
  end if;

  perform set_config('app.verified_test_user_cleanup', 'on', true);

  delete from public.workout_sessions where user_id = target_user_id;
  delete from public.profile_restrictions where created_by = target_user_id;
  delete from public.profiles
  where linked_user_id = target_user_id or created_by = target_user_id;
  delete from public.family_members
  where user_id = target_user_id or created_by = target_user_id;
  delete from public.families where created_by = target_user_id;
end;
$$;

revoke all on function public.delete_test_user_data(uuid) from public, anon, authenticated;
grant execute on function public.delete_test_user_data(uuid) to service_role;
