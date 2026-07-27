-- Prescrições por série para a divisão periodizada.
-- Este arquivo é versionado localmente; sua aplicação remota exige autorização separada.

alter table public.exercise_catalog
  add column if not exists set_rep_ranges jsonb not null default '[]'::jsonb;

alter table public.exercise_catalog
  drop constraint if exists exercise_catalog_set_rep_ranges_check;

alter table public.exercise_catalog
  add constraint exercise_catalog_set_rep_ranges_check
  check (jsonb_typeof(set_rep_ranges) = 'array');

insert into public.exercise_catalog (
  key, name, default_sets, reps_min, reps_max, muscle, movement, equipment, avoid_when, set_rep_ranges
)
values
  ('machine-bench-press', 'Supino articulado', 4, 6, 12, 'peito', 'empurrar-horizontal', 'máquina articulada', '{}', '[{"min":12,"max":12},{"min":10,"max":10},{"min":8,"max":8},{"min":6,"max":8}]'),
  ('incline-dumbbell-bench', 'Supino inclinado com halteres', 3, 8, 12, 'peito', 'empurrar-horizontal', 'halteres', '{}', '[{"min":12,"max":12},{"min":10,"max":10},{"min":8,"max":10}]'),
  ('cable-crossover', 'Crossover', 3, 10, 12, 'peito', 'empurrar-horizontal', 'cabos', '{}', '[{"min":12,"max":12},{"min":12,"max":12},{"min":10,"max":12}]'),
  ('dumbbell-shoulder-press', 'Desenvolvimento com halteres', 3, 8, 12, 'ombros', 'empurrar-vertical', 'halteres', '{}', '[{"min":12,"max":12},{"min":10,"max":10},{"min":8,"max":8}]'),
  ('lateral-raise', 'Elevação lateral', 3, 10, 12, 'ombros', 'empurrar-vertical', 'halteres', '{}', '[{"min":12,"max":12},{"min":12,"max":12},{"min":10,"max":10}]'),
  ('rope-triceps', 'Tríceps corda', 3, 8, 12, 'triceps', 'isolar-braco', 'corda no cabo', '{}', '[{"min":12,"max":12},{"min":10,"max":12},{"min":8,"max":10}]')
on conflict (key) do update set
  name = excluded.name, default_sets = excluded.default_sets,
  reps_min = excluded.reps_min, reps_max = excluded.reps_max,
  muscle = excluded.muscle, movement = excluded.movement,
  equipment = excluded.equipment, avoid_when = excluded.avoid_when,
  set_rep_ranges = excluded.set_rep_ranges, active = true, updated_at = now();

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
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(btrim(p_workout_label), '') is null or length(btrim(p_workout_label)) > 120 then
    raise exception 'INVALID_WORKOUT_NAME';
  end if;
  if cardinality(p_exercise_keys) not between 1 and 12 then raise exception 'INVALID_EXERCISE_COUNT'; end if;
  if (select count(*) from unnest(p_exercise_keys) as key) <>
     (select count(distinct key) from unnest(p_exercise_keys) as key) then
    raise exception 'DUPLICATE_EXERCISE';
  end if;
  if not exists (
    select 1 from public.workout_sessions
    where id = p_session_id and user_id = v_user_id and status in ('active', 'paused')
  ) then raise exception 'WORKOUT_NOT_EDITABLE'; end if;
  if exists (
    select 1 from public.set_logs sets
    join public.exercise_logs exercise on exercise.id = sets.exercise_log_id
    where exercise.session_id = p_session_id and sets.completed
  ) then raise exception 'WORKOUT_ALREADY_STARTED'; end if;
  if exists (
    select 1 from unnest(p_exercise_keys) as requested(key)
    where not exists (
      select 1 from public.exercise_catalog catalog
      where catalog.key = requested.key and catalog.active
    )
  ) then raise exception 'EXERCISE_NOT_AVAILABLE'; end if;

  update public.workout_sessions
  set workout_label = btrim(p_workout_label), status = 'active', paused_at = null
  where id = p_session_id and user_id = v_user_id;

  delete from public.exercise_logs where session_id = p_session_id and user_id = v_user_id;

  foreach v_key in array p_exercise_keys loop
    v_position := v_position + 1;
    select key, name, default_sets, reps_min, reps_max, set_rep_ranges
      into strict v_catalog
    from public.exercise_catalog
    where key = v_key and active;

    insert into public.exercise_logs (
      session_id, user_id, exercise_key, exercise_name, position, rest_seconds, transition_rest_seconds
    )
    values (p_session_id, v_user_id, v_catalog.key, v_catalog.name, v_position, 120, 180)
    returning id into v_exercise_id;

    insert into public.set_logs (
      exercise_log_id, user_id, set_number, target_reps_min, target_reps_max
    )
    select
      v_exercise_id,
      v_user_id,
      series,
      coalesce((v_catalog.set_rep_ranges -> (series - 1) ->> 'min')::smallint, v_catalog.reps_min),
      coalesce((v_catalog.set_rep_ranges -> (series - 1) ->> 'max')::smallint, v_catalog.reps_max)
    from generate_series(1, v_catalog.default_sets) as series;
  end loop;
end;
$$;

revoke all on function public.replace_unstarted_workout(uuid, text, text[]) from public, anon;
grant execute on function public.replace_unstarted_workout(uuid, text, text[]) to authenticated;
