begin;

select plan(12);

select has_column('public', 'exercise_catalog', 'muscle_region');
select has_column('public', 'exercise_catalog', 'secondary_muscles');
select has_column('public', 'exercise_catalog', 'mechanics');
select has_column('public', 'exercise_catalog', 'laterality');
select has_column('public', 'exercise_catalog', 'resistance_profile');
select has_column('public', 'exercise_catalog', 'movement_vector');
select has_column('public', 'exercise_catalog', 'systemic_demand');
select has_column('public', 'exercise_catalog', 'stability_demand');
select has_column('public', 'exercise_catalog', 'technical_complexity');
select has_column('public', 'exercise_catalog', 'exercise_family');

select ok(
  (select count(*) >= 65 from public.exercise_catalog where taxonomy_version = 2),
  'catálogo biomecânico normalizado foi carregado'
);
select ok(
  (select count(*) >= 5 from public.exercise_catalog where muscle = 'core' and active),
  'grupo Core possui exercícios ativos'
);

select * from finish();
rollback;
