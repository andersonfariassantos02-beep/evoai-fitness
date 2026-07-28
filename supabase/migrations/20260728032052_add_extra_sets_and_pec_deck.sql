alter table public.set_logs
  add column if not exists is_extra boolean not null default false;

insert into public.exercise_catalog
  (key, name, default_sets, reps_min, reps_max, muscle, movement, equipment, stimulus, avoid_when, instructions, cautions, equipment_variants, active)
values
  ('pec-deck', 'Fly / Peck Deck', 3, 12, 15, 'peito', 'empurrar-horizontal', 'máquina', 'peito-aducao-horizontal', '{}', '', '{}', '{}', true)
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
