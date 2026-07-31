create or replace function public.replace_unstarted_workout_prescription(
  p_session_id uuid,
  p_workout_label text,
  p_prescription jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_item jsonb;
  v_position integer := 0;
  v_exercise_id uuid;
  v_catalog record;
  v_sets integer;
  v_reps_min integer;
  v_reps_max integer;
  v_ranges jsonb;
  v_rest integer;
  v_transition_rest integer;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(btrim(p_workout_label), '') is null or length(btrim(p_workout_label)) > 120 then
    raise exception 'INVALID_WORKOUT_NAME';
  end if;
  if jsonb_typeof(p_prescription) <> 'array'
     or jsonb_array_length(p_prescription) not between 1 and 12 then
    raise exception 'INVALID_EXERCISE_COUNT';
  end if;
  if (
    select count(*) <> count(distinct item ->> 'key')
    from jsonb_array_elements(p_prescription) as item
  ) then raise exception 'DUPLICATE_EXERCISE'; end if;
  if not exists (
    select 1 from public.workout_sessions
    where id = p_session_id and user_id = v_user_id and status in ('active', 'paused')
  ) then raise exception 'WORKOUT_NOT_EDITABLE'; end if;
  if exists (
    select 1 from public.set_logs sets
    join public.exercise_logs exercise on exercise.id = sets.exercise_log_id
    where exercise.session_id = p_session_id and sets.completed
  ) then raise exception 'WORKOUT_ALREADY_STARTED'; end if;

  update public.workout_sessions
  set workout_label = btrim(p_workout_label), status = 'active', paused_at = null
  where id = p_session_id and user_id = v_user_id;

  delete from public.exercise_logs
  where session_id = p_session_id and user_id = v_user_id;

  for v_item in select value from jsonb_array_elements(p_prescription)
  loop
    v_position := v_position + 1;
    select key, name into strict v_catalog
    from public.exercise_catalog
    where key = v_item ->> 'key' and active;

    v_sets := (v_item ->> 'sets')::integer;
    v_reps_min := (v_item ->> 'reps_min')::integer;
    v_reps_max := (v_item ->> 'reps_max')::integer;
    v_ranges := coalesce(v_item -> 'set_rep_ranges', '[]'::jsonb);
    v_rest := coalesce((v_item ->> 'rest_seconds')::integer, 120);
    v_transition_rest := coalesce((v_item ->> 'transition_rest_seconds')::integer, 180);

    if v_sets not between 1 and 12
       or v_reps_min not between 1 and 100
       or v_reps_max not between v_reps_min and 100
       or jsonb_typeof(v_ranges) <> 'array'
       or v_rest not between 30 and 600
       or v_transition_rest not between 30 and 600 then
      raise exception 'INVALID_PRESCRIPTION';
    end if;

    insert into public.exercise_logs (
      session_id, user_id, exercise_key, exercise_name, position,
      rest_seconds, transition_rest_seconds
    )
    values (
      p_session_id, v_user_id, v_catalog.key, v_catalog.name, v_position,
      v_rest, v_transition_rest
    )
    returning id into v_exercise_id;

    insert into public.set_logs (
      exercise_log_id, user_id, set_number, target_reps_min, target_reps_max
    )
    select
      v_exercise_id,
      v_user_id,
      series,
      coalesce((v_ranges -> (series - 1) ->> 'min')::smallint, v_reps_min),
      coalesce((v_ranges -> (series - 1) ->> 'max')::smallint, v_reps_max)
    from generate_series(1, v_sets) as series;
  end loop;
end;
$$;

revoke all on function public.replace_unstarted_workout_prescription(uuid, text, jsonb)
  from public, anon;
grant execute on function public.replace_unstarted_workout_prescription(uuid, text, jsonb)
  to authenticated;
