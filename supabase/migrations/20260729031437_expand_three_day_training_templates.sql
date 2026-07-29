insert into public.exercise_catalog
  (key, name, default_sets, reps_min, reps_max, muscle, movement, equipment, stimulus, avoid_when, instructions, cautions, equipment_variants, active)
values
  (
    'leg-extension', 'Cadeira extensora', 3, 10, 15,
    'quadriceps', 'estender-joelho', 'máquina', 'quadriceps-extensao-joelho',
    '{joelho}', '', '{}', '{}', true
  ),
  (
    'romanian-deadlift', 'Levantamento terra romeno', 3, 8, 12,
    'posteriores', 'estender-quadril', 'halteres', 'posteriores-dobradica-quadril',
    '{lombar}', '', '{}', '{}', true
  ),
  (
    'hip-thrust', 'Elevação pélvica', 3, 10, 12,
    'gluteos', 'estender-quadril', 'máquina', 'gluteos-extensao-quadril',
    '{}', '', '{}', '{}', true
  ),
  (
    'hammer-curl', 'Rosca martelo', 3, 10, 12,
    'biceps', 'isolar-braco', 'halteres', 'biceps-flexao-neutra',
    '{}', '', '{}', '{}', true
  )
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
  active = true,
  updated_at = now();
