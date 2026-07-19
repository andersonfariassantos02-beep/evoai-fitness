begin;

select plan(8);

select has_table('public', 'workout_sessions');
select has_table('public', 'exercise_logs');
select has_table('public', 'set_logs');
select row_security_active('public.workout_sessions');
select row_security_active('public.exercise_logs');
select row_security_active('public.set_logs');
select has_policy('public', 'workout_sessions', 'users manage own workout sessions');
select has_trigger('public', 'set_logs', 'set_logs_protect_completed');

select * from finish();
rollback;
