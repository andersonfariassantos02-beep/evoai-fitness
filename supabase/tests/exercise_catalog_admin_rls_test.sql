begin;
select plan(4);
select has_table('public', 'app_admins', 'allowlist administrativa existe');
select policies_are('public', 'app_admins', array['users read own app admin membership']);
select ok(has_function_privilege('authenticated', 'private.is_app_admin()', 'EXECUTE'), 'authenticated pode consultar função segura');
select policies_are('public', 'exercise_catalog', array[
  'app admins create exercise catalog',
  'app admins read all exercise catalog',
  'app admins update exercise catalog',
  'authenticated users read active exercise catalog'
]);
select * from finish();
rollback;
