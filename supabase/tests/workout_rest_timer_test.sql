begin;

select plan(6);

select has_column('public', 'exercise_logs', 'rest_seconds');
select has_column('public', 'exercise_logs', 'transition_rest_seconds');
select has_column('public', 'set_logs', 'target_rest_seconds');
select has_column('public', 'set_logs', 'actual_rest_seconds');

select col_default_is('public', 'exercise_logs', 'rest_seconds', '120');
select col_default_is('public', 'exercise_logs', 'transition_rest_seconds', '180');

select * from finish();
rollback;
