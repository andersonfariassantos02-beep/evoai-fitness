create or replace function public.replace_unstarted_workout(
  p_session_id uuid,
  p_workout_label text,
  p_exercise_keys text[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_key text;
  v_position integer := 0;
  v_exercise_id uuid;
  v_catalog record;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if nullif(btrim(p_workout_label), '') is null or length(btrim(p_workout_label)) > 120 then
    raise exception 'INVALID_WORKOUT_NAME';
  end if;
  if cardinality(p_exercise_keys) not between 1 and 12 then
    raise exception 'INVALID_EXERCISE_COUNT';
  end if;
  if (select count(*) from unnest(p_exercise_keys) as key) <>
     (select count(distinct key) from unnest(p_exercise_keys) as key) then
    raise exception 'DUPLICATE_EXERCISE';
  end if;
  if not exists (
    select 1 from public.workout_sessions
    where id = p_session_id and user_id = v_user_id and status in ('active', 'paused')
  ) then
    raise exception 'WORKOUT_NOT_EDITABLE';
  end if;
  if exists (
    select 1
    from public.set_logs sets
    join public.exercise_logs exercise on exercise.id = sets.exercise_log_id
    where exercise.session_id = p_session_id and sets.completed
  ) then
    raise exception 'WORKOUT_ALREADY_STARTED';
  end if;
  if exists (
    select 1 from unnest(p_exercise_keys) as requested(key)
    where not exists (
      select 1 from public.exercise_catalog catalog
      where catalog.key = requested.key and catalog.active
    )
  ) then
    raise exception 'EXERCISE_NOT_AVAILABLE';
  end if;

  update public.workout_sessions
  set workout_label = btrim(p_workout_label), status = 'active', paused_at = null
  where id = p_session_id and user_id = v_user_id;

  delete from public.exercise_logs where session_id = p_session_id and user_id = v_user_id;

  foreach v_key in array p_exercise_keys loop
    v_position := v_position + 1;
    select key, name, default_sets, reps_min, reps_max
      into strict v_catalog
    from public.exercise_catalog
    where key = v_key and active;

    insert into public.exercise_logs (session_id, user_id, exercise_key, exercise_name, position)
    values (p_session_id, v_user_id, v_catalog.key, v_catalog.name, v_position)
    returning id into v_exercise_id;

    insert into public.set_logs (
      exercise_log_id, user_id, set_number, target_reps_min, target_reps_max
    )
    select v_exercise_id, v_user_id, series, v_catalog.reps_min, v_catalog.reps_max
    from generate_series(1, v_catalog.default_sets) as series;
  end loop;
end;
$$;

revoke all on function public.replace_unstarted_workout(uuid, text, text[]) from public, anon;
grant execute on function public.replace_unstarted_workout(uuid, text, text[]) to authenticated;
