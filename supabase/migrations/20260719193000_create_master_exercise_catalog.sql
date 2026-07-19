create table if not exists public.exercise_catalog (
  key text primary key check (key ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(trim(name)) between 2 and 120),
  muscle text not null,
  movement text not null,
  equipment text not null,
  default_sets smallint not null check (default_sets between 1 and 10),
  reps_min smallint not null check (reps_min between 1 and 100),
  reps_max smallint not null check (reps_max between reps_min and 100),
  avoid_when text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.exercise_catalog enable row level security;

drop policy if exists "authenticated users read active exercise catalog" on public.exercise_catalog;
create policy "authenticated users read active exercise catalog"
on public.exercise_catalog for select to authenticated
using (active = true);

revoke all on public.exercise_catalog from anon;
revoke insert, update, delete, truncate, references, trigger on public.exercise_catalog from authenticated;
grant select on public.exercise_catalog to authenticated;

insert into public.exercise_catalog (key, name, default_sets, reps_min, reps_max, muscle, movement, equipment, avoid_when)
values
  ('chest-press', 'Press de peito', 3, 8, 12, 'peito', 'empurrar-horizontal', 'máquina', '{}'),
  ('dumbbell-bench', 'Supino com halteres', 3, 8, 12, 'peito', 'empurrar-horizontal', 'halteres', '{ombro}'),
  ('cable-chest-press', 'Press de peito no cabo', 3, 8, 12, 'peito', 'empurrar-horizontal', 'cabos', '{}'),
  ('row', 'Remada', 3, 8, 12, 'costas', 'puxar-horizontal', 'máquina', '{}'),
  ('cable-row', 'Remada baixa no cabo', 3, 8, 12, 'costas', 'puxar-horizontal', 'cabos', '{}'),
  ('dumbbell-row', 'Remada unilateral', 3, 8, 12, 'costas', 'puxar-horizontal', 'halteres', '{lombar}'),
  ('shoulder-press', 'Desenvolvimento', 3, 8, 12, 'ombros', 'empurrar-vertical', 'máquina', '{ombro}'),
  ('pulldown', 'Puxada', 3, 8, 12, 'costas', 'puxar-vertical', 'máquina', '{}'),
  ('assisted-pullup', 'Barra fixa assistida', 3, 8, 12, 'costas', 'puxar-vertical', 'máquina', '{}'),
  ('squat-pattern', 'Agachamento guiado', 3, 8, 12, 'quadriceps', 'agachar', 'máquina', '{joelho}'),
  ('leg-press', 'Leg press', 3, 10, 15, 'quadriceps', 'agachar', 'máquina', '{joelho}'),
  ('goblet-squat', 'Agachamento goblet', 3, 10, 15, 'quadriceps', 'agachar', 'halteres', '{}'),
  ('leg-curl', 'Flexão de joelhos', 3, 10, 15, 'posteriores', 'flexionar-joelho', 'máquina', '{}'),
  ('calf-raise', 'Panturrilha', 3, 12, 20, 'panturrilhas', 'panturrilha', 'máquina', '{}'),
  ('biceps', 'Rosca de bíceps', 3, 10, 15, 'biceps', 'isolar-braco', 'halteres', '{}'),
  ('triceps', 'Extensão de tríceps', 3, 10, 15, 'triceps', 'isolar-braco', 'cabos', '{}')
on conflict (key) do update set
  name = excluded.name,
  default_sets = excluded.default_sets,
  reps_min = excluded.reps_min,
  reps_max = excluded.reps_max,
  muscle = excluded.muscle,
  movement = excluded.movement,
  equipment = excluded.equipment,
  avoid_when = excluded.avoid_when,
  active = true,
  updated_at = now();

