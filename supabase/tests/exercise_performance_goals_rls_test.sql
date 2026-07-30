begin;

select plan(5);

select has_table('public', 'exercise_performance_goals', 'metas por exercício existem');
select row_security_active('public.exercise_performance_goals');
select col_is_pk('public', 'exercise_performance_goals', array['id']);
select policies_are(
  'public',
  'exercise_performance_goals',
  array[
    'Users can create their own exercise goals',
    'Users can delete their own exercise goals',
    'Users can read their own exercise goals',
    'Users can update their own exercise goals'
  ]
);
select table_privs_are('public', 'exercise_performance_goals', 'anon', array[]::text[], 'visitantes não acessam metas');

select * from finish();
rollback;
