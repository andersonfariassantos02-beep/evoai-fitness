alter table public.exercise_catalog
  add column if not exists stimulus text;

update public.exercise_catalog
set stimulus = case
  when key in ('machine-bench-press', 'chest-press', 'dumbbell-bench', 'cable-chest-press') then 'peito-press-horizontal'
  when key in ('incline-dumbbell-bench', 'supino-inclinado-articulado') then 'peito-press-inclinado'
  when key = 'cable-crossover' then 'peito-aducao-horizontal'
  when key in ('dumbbell-shoulder-press', 'shoulder-press') then 'ombros-press-vertical'
  when key = 'lateral-raise' then 'ombros-abducao-lateral'
  when key in ('rope-triceps', 'triceps') then 'triceps-extensao-cotovelo'
  when key = 'reverse-cable-fly' then 'ombros-deltoide-posterior'
  else stimulus
end;

insert into public.exercise_catalog
  (key, name, default_sets, reps_min, reps_max, muscle, movement, equipment, stimulus, avoid_when, instructions, cautions, equipment_variants, active)
values
  ('dumbbell-fly', 'Crucifixo com halteres', 3, 12, 15, 'peito', 'empurrar-horizontal', 'halteres', 'peito-aducao-horizontal', '{}', '', '{}', '{}', true),
  ('cable-lateral-raise', 'Elevação lateral no cabo', 4, 12, 15, 'ombros', 'empurrar-vertical', 'cabos', 'ombros-abducao-lateral', '{ombro}', '', '{}', '{}', true),
  ('machine-lateral-raise', 'Elevação lateral na máquina', 4, 12, 15, 'ombros', 'empurrar-vertical', 'máquina', 'ombros-abducao-lateral', '{ombro}', '', '{}', '{}', true),
  ('reverse-pec-deck', 'Crucifixo inverso na máquina', 2, 12, 15, 'ombros', 'puxar-horizontal', 'máquina', 'ombros-deltoide-posterior', '{ombro}', '', '{}', '{}', true)
on conflict (key) do update set
  name = excluded.name,
  default_sets = excluded.default_sets,
  reps_min = excluded.reps_min,
  reps_max = excluded.reps_max,
  muscle = excluded.muscle,
  movement = excluded.movement,
  equipment = excluded.equipment,
  stimulus = excluded.stimulus,
  avoid_when = excluded.avoid_when,
  active = true;

update public.exercise_catalog
set default_sets = values_to_apply.default_sets,
    reps_min = values_to_apply.reps_min,
    reps_max = values_to_apply.reps_max,
    set_rep_ranges = '[]'::jsonb
from (values
  ('machine-bench-press', 3, 10, 12),
  ('incline-dumbbell-bench', 3, 10, 12),
  ('cable-crossover', 3, 12, 15),
  ('dumbbell-shoulder-press', 3, 10, 12),
  ('lateral-raise', 4, 12, 15),
  ('rope-triceps', 3, 10, 12),
  ('reverse-cable-fly', 2, 12, 15)
) as values_to_apply(key, default_sets, reps_min, reps_max)
where public.exercise_catalog.key = values_to_apply.key;
