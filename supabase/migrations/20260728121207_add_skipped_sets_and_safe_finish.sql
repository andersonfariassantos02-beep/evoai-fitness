alter table public.set_logs
  add column if not exists skipped_at timestamptz,
  add column if not exists skip_reason text;

alter table public.set_logs
  drop constraint if exists set_logs_completion_or_skip_check;

alter table public.set_logs
  add constraint set_logs_completion_or_skip_check
  check (not (completed and skipped_at is not null));

alter table public.set_logs
  drop constraint if exists set_logs_skip_reason_length_check;

alter table public.set_logs
  add constraint set_logs_skip_reason_length_check
  check (skip_reason is null or char_length(skip_reason) between 1 and 120);

create or replace function public.finish_workout_with_pending(
  p_session_id uuid,
  p_notes text,
  p_skip_reason text
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_session public.workout_sessions%rowtype;
  v_completed_count integer;
  v_skipped_count integer;
  v_reason text := nullif(trim(p_skip_reason), '');
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if v_reason is null or char_length(v_reason) > 120 then
    raise exception 'SKIP_REASON_REQUIRED';
  end if;

  select *
  into v_session
  from public.workout_sessions
  where id = p_session_id
    and user_id = v_user_id
  for update;

  if not found or v_session.status not in ('active', 'paused') then
    raise exception 'WORKOUT_NOT_FINISHABLE';
  end if;

  select count(*) filter (where sets.completed),
         count(*) filter (where not sets.completed and sets.skipped_at is null)
  into v_completed_count, v_skipped_count
  from public.set_logs sets
  join public.exercise_logs exercise on exercise.id = sets.exercise_log_id
  where exercise.session_id = p_session_id
    and sets.user_id = v_user_id;

  if v_completed_count = 0 then
    raise exception 'NO_COMPLETED_SETS';
  end if;
  if v_skipped_count = 0 then
    raise exception 'NO_PENDING_SETS';
  end if;

  update public.set_logs sets
  set skipped_at = now(),
      skip_reason = v_reason
  from public.exercise_logs exercise
  where exercise.id = sets.exercise_log_id
    and exercise.session_id = p_session_id
    and sets.user_id = v_user_id
    and not sets.completed
    and sets.skipped_at is null;

  update public.workout_sessions
  set status = 'completed',
      notes = coalesce(p_notes, ''),
      paused_at = null,
      completed_at = now()
  where id = p_session_id
    and user_id = v_user_id;

  return v_skipped_count;
end;
$$;

revoke all on function public.finish_workout_with_pending(uuid, text, text) from public, anon;
grant execute on function public.finish_workout_with_pending(uuid, text, text) to authenticated;

comment on column public.set_logs.skipped_at is
  'Momento em que uma série pendente foi encerrada como não realizada durante a conclusão confirmada do treino.';

comment on column public.set_logs.skip_reason is
  'Motivo informado ao finalizar o treino com séries não realizadas.';

comment on function public.finish_workout_with_pending(uuid, text, text) is
  'Finaliza atomicamente uma sessão própria com pelo menos uma série realizada e registra as séries restantes como não realizadas.';
