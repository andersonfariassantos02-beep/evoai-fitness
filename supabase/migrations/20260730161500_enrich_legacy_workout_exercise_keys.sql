-- Completa a taxonomia dos identificadores usados pelas fichas existentes.
-- Os nomes exibidos nos planos periodizados são preservados.

update public.exercise_catalog set
  name = 'Supino articulado',
  muscle_region = 'fibras esternocostais',
  movement = 'empurrar-horizontal',
  movement_vector = 'empurrar horizontal convergente',
  mechanics = 'composto',
  laterality = 'bilateral',
  resistance_profile = 'dependente-da-maquina',
  systemic_demand = 'moderada',
  stability_demand = 'baixa',
  technical_complexity = 'baixa',
  exercise_family = 'supino-reto',
  secondary_muscles = '{triceps,ombros}',
  taxonomy_version = 2,
  updated_at = now()
where key = 'machine-bench-press';

update public.exercise_catalog set
  muscle_region = 'fibras esternocostais',
  movement = 'aducao-horizontal',
  movement_vector = 'adução horizontal',
  mechanics = 'isolado',
  laterality = 'bilateral',
  resistance_profile = 'continua',
  systemic_demand = 'baixa',
  stability_demand = 'moderada',
  technical_complexity = 'baixa',
  exercise_family = 'crossover',
  taxonomy_version = 2,
  updated_at = now()
where key = 'cable-crossover';

update public.exercise_catalog set
  muscle_region = 'latíssimo do dorso',
  movement = 'puxar-vertical',
  movement_vector = 'puxar vertical',
  stimulus = coalesce(stimulus, 'costas-puxada-vertical'),
  mechanics = 'composto',
  laterality = 'bilateral',
  resistance_profile = 'dependente-da-maquina',
  systemic_demand = 'moderada',
  stability_demand = 'baixa',
  technical_complexity = 'baixa',
  exercise_family = 'puxada-frontal',
  secondary_muscles = '{biceps}',
  taxonomy_version = 2,
  updated_at = now()
where key in ('pulldown', 'assisted-pullup');

update public.exercise_catalog set
  muscle_region = 'romboides e fibras centrais',
  movement = 'puxar-horizontal',
  movement_vector = 'puxar horizontal',
  stimulus = coalesce(stimulus, 'costas-remada-espessura'),
  mechanics = 'composto',
  laterality = 'bilateral',
  resistance_profile = 'dependente-da-maquina',
  systemic_demand = 'moderada',
  stability_demand = 'baixa',
  technical_complexity = 'baixa',
  exercise_family = 'remada-apoiada',
  secondary_muscles = '{biceps}',
  taxonomy_version = 2,
  updated_at = now()
where key = 'row';

update public.exercise_catalog set
  muscle_region = 'reto femoral e vastos',
  movement = 'agachar',
  movement_vector = 'dominância de joelho',
  stimulus = coalesce(stimulus, 'quadriceps-agachamento'),
  mechanics = 'composto',
  laterality = 'bilateral',
  resistance_profile = 'dependente-da-maquina',
  systemic_demand = 'alta',
  stability_demand = 'baixa',
  technical_complexity = 'moderada',
  exercise_family = 'agachamento-maquina',
  secondary_muscles = '{gluteos}',
  taxonomy_version = 2,
  updated_at = now()
where key = 'squat-pattern';

update public.exercise_catalog set
  muscle_region = 'isquiotibiais',
  movement = 'flexionar-joelho',
  movement_vector = 'flexão de joelho',
  stimulus = coalesce(stimulus, 'posteriores-flexao-joelho'),
  mechanics = 'isolado',
  laterality = 'bilateral',
  resistance_profile = 'dependente-da-maquina',
  systemic_demand = 'baixa',
  stability_demand = 'baixa',
  technical_complexity = 'baixa',
  exercise_family = 'flexora',
  taxonomy_version = 2,
  updated_at = now()
where key = 'leg-curl';

update public.exercise_catalog set
  muscle_region = 'gastrocnêmio',
  movement = 'flexao-plantar',
  movement_vector = 'flexão plantar',
  stimulus = coalesce(stimulus, 'panturrilha-gastrocnemio'),
  mechanics = 'isolado',
  laterality = 'bilateral',
  resistance_profile = 'dependente-da-maquina',
  systemic_demand = 'baixa',
  stability_demand = 'baixa',
  technical_complexity = 'baixa',
  exercise_family = 'panturrilha-em-pe',
  taxonomy_version = 2,
  updated_at = now()
where key = 'calf-raise';

update public.exercise_catalog set
  muscle_region = coalesce(muscle_region, 'bíceps e braquial'),
  movement = 'flexionar-cotovelo',
  movement_vector = 'flexão de cotovelo',
  stimulus = coalesce(stimulus, 'biceps-flexao-supinada'),
  mechanics = 'isolado',
  laterality = 'bilateral',
  resistance_profile = 'intermediaria',
  systemic_demand = 'baixa',
  stability_demand = 'moderada',
  technical_complexity = 'baixa',
  exercise_family = coalesce(exercise_family, 'rosca-direta'),
  taxonomy_version = 2,
  updated_at = now()
where key = 'biceps';

update public.exercise_catalog set
  muscle_region = coalesce(muscle_region, 'cabeças lateral e medial'),
  movement = 'estender-cotovelo',
  movement_vector = 'extensão de cotovelo',
  stimulus = coalesce(stimulus, 'triceps-extensao-cotovelo'),
  mechanics = 'isolado',
  laterality = 'bilateral',
  resistance_profile = 'continua',
  systemic_demand = 'baixa',
  stability_demand = 'baixa',
  technical_complexity = 'baixa',
  exercise_family = coalesce(exercise_family, 'triceps-pulley'),
  taxonomy_version = 2,
  updated_at = now()
where key = 'triceps';
