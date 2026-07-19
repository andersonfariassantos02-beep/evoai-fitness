-- Retoma com segurança a configuração caso a execução anterior tenha parado nos gatilhos.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'workout_sessions' and column_name = 'nome'
  ) then
    execute 'alter table public.workout_sessions alter column nome set default ''Treino''';
  end if;
end
$$;

create unique index if not exists workout_sessions_user_training_date_unique
on public.workout_sessions (user_id, training_date);

drop trigger if exists exercise_logs_protect_completed on public.exercise_logs;
create trigger exercise_logs_protect_completed
before update or delete on public.exercise_logs
for each row execute function private.protect_completed_workout();

drop trigger if exists set_logs_protect_completed on public.set_logs;
create trigger set_logs_protect_completed
before update or delete on public.set_logs
for each row execute function private.protect_completed_workout();

alter table public.workout_sessions enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.set_logs enable row level security;

drop policy if exists "users manage own workout sessions" on public.workout_sessions;
create policy "users manage own workout sessions" on public.workout_sessions for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "users read own exercise logs" on public.exercise_logs;
create policy "users read own exercise logs" on public.exercise_logs for select to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists "users create exercise logs in own active session" on public.exercise_logs;
create policy "users create exercise logs in own active session" on public.exercise_logs for insert to authenticated
with check ((select auth.uid()) = user_id and exists (
  select 1 from public.workout_sessions session
  where session.id = session_id and session.user_id = (select auth.uid()) and session.status <> 'completed'
));
drop policy if exists "users change own exercise logs" on public.exercise_logs;
create policy "users change own exercise logs" on public.exercise_logs for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "users delete own exercise logs" on public.exercise_logs;
create policy "users delete own exercise logs" on public.exercise_logs for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users read own set logs" on public.set_logs;
create policy "users read own set logs" on public.set_logs for select to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists "users create set logs in own active session" on public.set_logs;
create policy "users create set logs in own active session" on public.set_logs for insert to authenticated
with check ((select auth.uid()) = user_id and exists (
  select 1 from public.exercise_logs exercise
  join public.workout_sessions session on session.id = exercise.session_id
  where exercise.id = exercise_log_id and exercise.user_id = (select auth.uid()) and session.status <> 'completed'
));
drop policy if exists "users change own set logs" on public.set_logs;
create policy "users change own set logs" on public.set_logs for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "users delete own set logs" on public.set_logs;
create policy "users delete own set logs" on public.set_logs for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.workout_sessions, public.exercise_logs, public.set_logs from anon;
grant select, insert, update, delete on public.workout_sessions, public.exercise_logs, public.set_logs to authenticated;
