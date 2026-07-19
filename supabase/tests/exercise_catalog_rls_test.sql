begin;

select plan(4);
select has_table('public', 'exercise_catalog', 'catálogo mestre existe');
select is((select relrowsecurity from pg_class where oid = 'public.exercise_catalog'::regclass), true, 'RLS está habilitada');
select ok((select count(*) >= 16 from public.exercise_catalog), 'catálogo contém os exercícios iniciais');
select is((select count(*) from public.exercise_catalog where reps_max < reps_min), 0::bigint, 'faixas de repetição são coerentes');

select * from finish();
rollback;

