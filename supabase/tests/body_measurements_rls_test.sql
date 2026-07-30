begin;

select plan(5);

select has_table('public', 'body_measurements', 'histórico de medidas corporais existe');
select row_security_active('public.body_measurements');
select col_is_pk('public', 'body_measurements', array['id']);
select policies_are(
  'public',
  'body_measurements',
  array[
    'Users can create their own body measurements',
    'Users can delete their own body measurements',
    'Users can read their own body measurements',
    'Users can update their own body measurements'
  ]
);
select table_privs_are('public', 'body_measurements', 'anon', array[]::text[], 'visitantes não acessam medidas corporais');

select * from finish();
rollback;
