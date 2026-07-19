begin;
select plan(4);

select has_column('public', 'workout_sessions', 'profile_id', 'sessão possui perfil auditável');
select has_column('public', 'workout_sessions', 'applied_restrictions', 'sessão preserva restrições aplicadas');
select policies_are('public', 'workout_sessions', array['users manage own workout sessions'], 'RLS de sessões permanece restrita ao usuário');
select table_privs_are('public', 'workout_sessions', 'anon', array[]::text[], 'anon não acessa sessões');

select * from finish();
rollback;
