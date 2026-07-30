-- Evolui o Banco Mestre para um dicionário biomecânico.
-- default_sets/reps_* e set_rep_ranges permanecem temporariamente apenas para
-- compatibilidade com fichas manuais e migrações antigas. Novas prescrições
-- são definidas pelo gerador e congeladas em exercise_logs/set_logs.

alter table public.exercise_catalog
  add column if not exists muscle_region text,
  add column if not exists secondary_muscles text[] not null default '{}',
  add column if not exists mechanics text not null default 'isolado',
  add column if not exists laterality text not null default 'bilateral',
  add column if not exists resistance_profile text not null default 'variavel',
  add column if not exists movement_vector text,
  add column if not exists systemic_demand text not null default 'moderada',
  add column if not exists stability_demand text not null default 'moderada',
  add column if not exists technical_complexity text not null default 'moderada',
  add column if not exists exercise_family text,
  add column if not exists taxonomy_version smallint not null default 2;

alter table public.exercise_catalog
  drop constraint if exists exercise_catalog_mechanics_check,
  drop constraint if exists exercise_catalog_laterality_check,
  drop constraint if exists exercise_catalog_resistance_profile_check,
  drop constraint if exists exercise_catalog_systemic_demand_check,
  drop constraint if exists exercise_catalog_stability_demand_check,
  drop constraint if exists exercise_catalog_technical_complexity_check;

alter table public.exercise_catalog
  add constraint exercise_catalog_mechanics_check
    check (mechanics in ('composto', 'isolado', 'isometrico')),
  add constraint exercise_catalog_laterality_check
    check (laterality in ('bilateral', 'unilateral', 'alternado')),
  add constraint exercise_catalog_resistance_profile_check
    check (resistance_profile in ('alongada', 'intermediaria', 'encurtada', 'continua', 'variavel', 'dependente-da-maquina')),
  add constraint exercise_catalog_systemic_demand_check
    check (systemic_demand in ('baixa', 'moderada', 'alta')),
  add constraint exercise_catalog_stability_demand_check
    check (stability_demand in ('baixa', 'moderada', 'alta')),
  add constraint exercise_catalog_technical_complexity_check
    check (technical_complexity in ('baixa', 'moderada', 'alta'));

create index if not exists exercise_catalog_muscle_region_idx
  on public.exercise_catalog (muscle, muscle_region)
  where active;
create index if not exists exercise_catalog_family_idx
  on public.exercise_catalog (exercise_family)
  where active and exercise_family is not null;
create index if not exists exercise_catalog_stimulus_idx
  on public.exercise_catalog (stimulus)
  where active and stimulus is not null;

-- A curadoria separa implementos que possuem históricos de carga diferentes.
-- Os valores 3x8-12 abaixo são somente a ponte de compatibilidade exigida pelo
-- esquema antigo; não representam uma prescrição fixa do exercício.
insert into public.exercise_catalog (
  key, name, default_sets, reps_min, reps_max, muscle, muscle_region,
  movement, movement_vector, equipment, stimulus, mechanics, laterality,
  resistance_profile, systemic_demand, stability_demand, technical_complexity,
  exercise_family, avoid_when, secondary_muscles, active
)
values
  ('incline-barbell-bench', 'Supino inclinado com barra', 3, 8, 12, 'peito', 'fibras claviculares', 'empurrar-diagonal', 'empurrar diagonal', 'barra', 'peito-press-inclinado', 'composto', 'bilateral', 'alongada', 'alta', 'alta', 'alta', 'supino-inclinado', '{ombro}', '{triceps,ombros}', true),
  ('incline-dumbbell-bench', 'Supino inclinado com halteres', 3, 8, 12, 'peito', 'fibras claviculares', 'empurrar-diagonal', 'empurrar diagonal', 'halteres', 'peito-press-inclinado', 'composto', 'bilateral', 'alongada', 'alta', 'alta', 'moderada', 'supino-inclinado', '{ombro}', '{triceps,ombros}', true),
  ('incline-machine-bench', 'Supino inclinado articulado', 3, 8, 12, 'peito', 'fibras claviculares', 'empurrar-diagonal', 'empurrar diagonal convergente', 'máquina articulada', 'peito-press-inclinado', 'composto', 'bilateral', 'dependente-da-maquina', 'moderada', 'baixa', 'baixa', 'supino-inclinado', '{ombro}', '{triceps,ombros}', true),
  ('incline-cable-fly', 'Crucifixo inclinado na polia', 3, 8, 12, 'peito', 'fibras claviculares', 'aducao-horizontal', 'adução horizontal diagonal', 'polia', 'peito-aducao-inclinada', 'isolado', 'bilateral', 'continua', 'baixa', 'moderada', 'moderada', 'crucifixo-inclinado', '{}', '{}', true),
  ('low-cable-crossover', 'Crossover na polia baixa', 3, 8, 12, 'peito', 'fibras claviculares', 'aducao-horizontal', 'adução horizontal ascendente', 'polia', 'peito-aducao-inclinada', 'isolado', 'bilateral', 'continua', 'baixa', 'moderada', 'baixa', 'crossover', '{}', '{}', true),
  ('barbell-bench', 'Supino reto com barra', 3, 8, 12, 'peito', 'fibras esternocostais', 'empurrar-horizontal', 'empurrar horizontal', 'barra', 'peito-press-horizontal', 'composto', 'bilateral', 'alongada', 'alta', 'alta', 'alta', 'supino-reto', '{ombro}', '{triceps,ombros}', true),
  ('dumbbell-bench', 'Supino reto com halteres', 3, 8, 12, 'peito', 'fibras esternocostais', 'empurrar-horizontal', 'empurrar horizontal', 'halteres', 'peito-press-horizontal', 'composto', 'bilateral', 'alongada', 'alta', 'alta', 'moderada', 'supino-reto', '{ombro}', '{triceps,ombros}', true),
  ('machine-bench-press', 'Supino reto articulado', 3, 8, 12, 'peito', 'fibras esternocostais', 'empurrar-horizontal', 'empurrar horizontal convergente', 'máquina articulada', 'peito-press-horizontal', 'composto', 'bilateral', 'dependente-da-maquina', 'moderada', 'baixa', 'baixa', 'supino-reto', '{ombro}', '{triceps,ombros}', true),
  ('pec-deck', 'Crucifixo máquina (Peck Deck)', 3, 8, 12, 'peito', 'fibras esternocostais', 'aducao-horizontal', 'adução horizontal', 'máquina', 'peito-aducao-horizontal', 'isolado', 'bilateral', 'encurtada', 'baixa', 'baixa', 'baixa', 'crucifixo-reto', '{}', '{}', true),
  ('mid-cable-crossover', 'Crossover na polia média', 3, 8, 12, 'peito', 'fibras esternocostais', 'aducao-horizontal', 'adução horizontal', 'polia', 'peito-aducao-horizontal', 'isolado', 'bilateral', 'continua', 'baixa', 'moderada', 'baixa', 'crossover', '{}', '{}', true),
  ('chest-dips', 'Paralelas com tronco inclinado', 3, 8, 12, 'peito', 'fibras costais', 'empurrar-vertical', 'empurrar vertical descendente', 'peso corporal', 'peito-press-declinado', 'composto', 'bilateral', 'alongada', 'alta', 'alta', 'alta', 'paralelas', '{ombro}', '{triceps,ombros}', true),
  ('decline-barbell-bench', 'Supino declinado com barra', 3, 8, 12, 'peito', 'fibras costais', 'empurrar-diagonal', 'empurrar declinado', 'barra', 'peito-press-declinado', 'composto', 'bilateral', 'alongada', 'alta', 'alta', 'alta', 'supino-declinado', '{ombro}', '{triceps,ombros}', true),
  ('decline-machine-bench', 'Supino declinado articulado', 3, 8, 12, 'peito', 'fibras costais', 'empurrar-diagonal', 'empurrar declinado convergente', 'máquina articulada', 'peito-press-declinado', 'composto', 'bilateral', 'dependente-da-maquina', 'moderada', 'baixa', 'baixa', 'supino-declinado', '{ombro}', '{triceps,ombros}', true),
  ('high-cable-crossover', 'Crossover na polia alta', 3, 8, 12, 'peito', 'fibras costais', 'aducao-horizontal', 'adução horizontal descendente', 'polia', 'peito-aducao-declinada', 'isolado', 'bilateral', 'continua', 'baixa', 'moderada', 'baixa', 'crossover', '{}', '{}', true),

  ('wide-grip-lat-pulldown', 'Puxada frontal aberta pronada', 3, 8, 12, 'costas', 'latíssimo do dorso', 'puxar-vertical', 'puxar vertical', 'polia', 'costas-puxada-vertical', 'composto', 'bilateral', 'dependente-da-maquina', 'moderada', 'baixa', 'moderada', 'puxada-frontal', '{}', '{biceps}', true),
  ('articulated-front-pulldown', 'Puxada frontal articulada', 3, 8, 12, 'costas', 'latíssimo do dorso', 'puxar-vertical', 'puxar vertical', 'máquina articulada', 'costas-puxada-vertical', 'composto', 'bilateral', 'dependente-da-maquina', 'moderada', 'baixa', 'baixa', 'puxada-frontal', '{}', '{biceps}', true),
  ('dumbbell-row', 'Remada unilateral com halter', 3, 8, 12, 'costas', 'latíssimo do dorso', 'puxar-horizontal', 'puxar horizontal', 'halter', 'costas-remada-latissimo', 'composto', 'unilateral', 'alongada', 'moderada', 'alta', 'moderada', 'remada-unilateral', '{lombar}', '{biceps}', true),
  ('low-articulated-row', 'Remada articulada baixa', 3, 8, 12, 'costas', 'latíssimo do dorso', 'puxar-horizontal', 'puxar horizontal', 'máquina articulada', 'costas-remada-latissimo', 'composto', 'bilateral', 'dependente-da-maquina', 'moderada', 'baixa', 'baixa', 'remada-baixa', '{}', '{biceps}', true),
  ('straight-arm-pulldown', 'Pulldown de braços estendidos', 3, 8, 12, 'costas', 'latíssimo do dorso', 'extensao-ombro', 'extensão de ombro', 'polia', 'costas-extensao-ombro', 'isolado', 'bilateral', 'continua', 'baixa', 'moderada', 'baixa', 'pulldown-bracos-estendidos', '{}', '{}', true),
  ('barbell-bent-row', 'Remada curvada com barra', 3, 8, 12, 'costas', 'romboides e fibras centrais', 'puxar-horizontal', 'puxar horizontal', 'barra', 'costas-remada-espessura', 'composto', 'bilateral', 'alongada', 'alta', 'alta', 'alta', 'remada-curvada', '{lombar}', '{biceps,posteriores}', true),
  ('cable-row', 'Remada sentada na polia', 3, 8, 12, 'costas', 'romboides e fibras centrais', 'puxar-horizontal', 'puxar horizontal', 'polia', 'costas-remada-espessura', 'composto', 'bilateral', 'continua', 'moderada', 'baixa', 'baixa', 'remada-sentada', '{}', '{biceps}', true),
  ('chest-supported-machine-row', 'Remada máquina apoiada no peito', 3, 8, 12, 'costas', 'romboides e fibras centrais', 'puxar-horizontal', 'puxar horizontal', 'máquina', 'costas-remada-espessura', 'composto', 'bilateral', 'dependente-da-maquina', 'moderada', 'baixa', 'baixa', 'remada-apoiada', '{}', '{biceps}', true),
  ('high-articulated-row', 'Remada articulada alta', 3, 8, 12, 'costas', 'romboides e fibras centrais', 'puxar-horizontal', 'puxar horizontal aberto', 'máquina articulada', 'costas-remada-alta', 'composto', 'bilateral', 'dependente-da-maquina', 'moderada', 'baixa', 'baixa', 'remada-alta', '{}', '{biceps,ombros}', true),
  ('dumbbell-shrug', 'Encolhimento com halteres', 3, 8, 12, 'costas', 'trapézio superior', 'elevacao-escapular', 'elevação escapular', 'halteres', 'trapezio-elevacao', 'isolado', 'bilateral', 'encurtada', 'moderada', 'moderada', 'baixa', 'encolhimento', '{}', '{}', true),
  ('barbell-shrug', 'Encolhimento com barra', 3, 8, 12, 'costas', 'trapézio superior', 'elevacao-escapular', 'elevação escapular', 'barra', 'trapezio-elevacao', 'isolado', 'bilateral', 'encurtada', 'moderada', 'moderada', 'baixa', 'encolhimento', '{}', '{}', true),
  ('face-pull', 'Face pull na polia', 3, 8, 12, 'costas', 'trapézio médio e inferior', 'rotacao-externa', 'puxar horizontal com rotação externa', 'polia', 'escapulas-rotacao-externa', 'composto', 'bilateral', 'continua', 'baixa', 'moderada', 'moderada', 'face-pull', '{}', '{ombros}', true),
  ('reverse-pec-deck', 'Crucifixo invertido na máquina', 3, 8, 12, 'ombros', 'deltoide posterior', 'abducao-horizontal', 'abdução horizontal', 'máquina', 'ombros-deltoide-posterior', 'isolado', 'bilateral', 'dependente-da-maquina', 'baixa', 'baixa', 'baixa', 'crucifixo-invertido', '{}', '{costas}', true),
  ('reverse-cable-fly', 'Crucifixo invertido na polia', 3, 8, 12, 'ombros', 'deltoide posterior', 'abducao-horizontal', 'abdução horizontal', 'polia', 'ombros-deltoide-posterior', 'isolado', 'bilateral', 'continua', 'baixa', 'moderada', 'moderada', 'crucifixo-invertido', '{}', '{costas}', true),
  ('deadlift', 'Levantamento terra', 3, 8, 12, 'costas', 'eretores da espinha', 'estender-quadril', 'dobradiça de quadril', 'barra', 'cadeia-posterior-hinge', 'composto', 'bilateral', 'alongada', 'alta', 'alta', 'alta', 'levantamento-terra', '{lombar}', '{posteriores,gluteos}', true),
  ('back-extension', 'Extensão lombar no banco romano', 3, 8, 12, 'costas', 'eretores da espinha', 'estender-tronco', 'extensão de tronco', 'peso corporal', 'eretores-extensao-tronco', 'isolado', 'bilateral', 'encurtada', 'moderada', 'moderada', 'moderada', 'extensao-lombar', '{lombar}', '{posteriores,gluteos}', true),

  ('barbell-shoulder-press', 'Desenvolvimento com barra', 3, 8, 12, 'ombros', 'deltoide anterior', 'empurrar-vertical', 'empurrar vertical', 'barra', 'ombros-press-vertical', 'composto', 'bilateral', 'alongada', 'alta', 'alta', 'alta', 'desenvolvimento', '{ombro}', '{triceps}', true),
  ('dumbbell-shoulder-press', 'Desenvolvimento com halteres', 3, 8, 12, 'ombros', 'deltoide anterior', 'empurrar-vertical', 'empurrar vertical', 'halteres', 'ombros-press-vertical', 'composto', 'bilateral', 'alongada', 'moderada', 'alta', 'moderada', 'desenvolvimento', '{ombro}', '{triceps}', true),
  ('shoulder-press', 'Desenvolvimento articulado', 3, 8, 12, 'ombros', 'deltoide anterior', 'empurrar-vertical', 'empurrar vertical convergente', 'máquina articulada', 'ombros-press-vertical', 'composto', 'bilateral', 'dependente-da-maquina', 'moderada', 'baixa', 'baixa', 'desenvolvimento', '{ombro}', '{triceps}', true),
  ('cable-front-raise', 'Elevação frontal na polia', 3, 8, 12, 'ombros', 'deltoide anterior', 'flexao-ombro', 'flexão de ombro', 'polia', 'ombros-flexao-anterior', 'isolado', 'unilateral', 'continua', 'baixa', 'moderada', 'baixa', 'elevacao-frontal', '{ombro}', '{}', true),
  ('dumbbell-front-raise', 'Elevação frontal com halter', 3, 8, 12, 'ombros', 'deltoide anterior', 'flexao-ombro', 'flexão de ombro', 'halter', 'ombros-flexao-anterior', 'isolado', 'alternado', 'intermediaria', 'baixa', 'moderada', 'baixa', 'elevacao-frontal', '{ombro}', '{}', true),
  ('lateral-raise', 'Elevação lateral com halteres', 3, 8, 12, 'ombros', 'deltoide lateral', 'abducao-ombro', 'abdução de ombro', 'halteres', 'ombros-abducao-lateral', 'isolado', 'bilateral', 'intermediaria', 'baixa', 'moderada', 'baixa', 'elevacao-lateral', '{ombro}', '{}', true),
  ('cable-lateral-raise', 'Elevação lateral na polia', 3, 8, 12, 'ombros', 'deltoide lateral', 'abducao-ombro', 'abdução de ombro', 'polia', 'ombros-abducao-lateral', 'isolado', 'unilateral', 'continua', 'baixa', 'moderada', 'baixa', 'elevacao-lateral', '{ombro}', '{}', true),
  ('bent-over-reverse-fly', 'Crucifixo invertido com halteres', 3, 8, 12, 'ombros', 'deltoide posterior', 'abducao-horizontal', 'abdução horizontal', 'halteres', 'ombros-deltoide-posterior', 'isolado', 'bilateral', 'encurtada', 'baixa', 'alta', 'moderada', 'crucifixo-invertido', '{lombar}', '{costas}', true),

  ('incline-dumbbell-curl', 'Rosca inclinada com halteres', 3, 8, 12, 'biceps', 'cabeça longa', 'flexionar-cotovelo', 'flexão de cotovelo com ombro estendido', 'halteres', 'biceps-alongado', 'isolado', 'bilateral', 'alongada', 'baixa', 'moderada', 'baixa', 'rosca-alongada', '{}', '{}', true),
  ('bayesian-curl', 'Rosca bayesiana na polia', 3, 8, 12, 'biceps', 'cabeça longa', 'flexionar-cotovelo', 'flexão de cotovelo com ombro estendido', 'polia', 'biceps-alongado', 'isolado', 'unilateral', 'alongada', 'baixa', 'moderada', 'moderada', 'rosca-alongada', '{}', '{}', true),
  ('machine-preacher-curl', 'Rosca Scott na máquina', 3, 8, 12, 'biceps', 'cabeça curta', 'flexionar-cotovelo', 'flexão de cotovelo com ombro flexionado', 'máquina', 'biceps-scott', 'isolado', 'bilateral', 'dependente-da-maquina', 'baixa', 'baixa', 'baixa', 'rosca-scott', '{}', '{}', true),
  ('ez-preacher-curl', 'Rosca Scott com barra W', 3, 8, 12, 'biceps', 'cabeça curta', 'flexionar-cotovelo', 'flexão de cotovelo com ombro flexionado', 'barra W', 'biceps-scott', 'isolado', 'bilateral', 'alongada', 'baixa', 'moderada', 'moderada', 'rosca-scott', '{}', '{}', true),
  ('barbell-curl', 'Rosca direta com barra', 3, 8, 12, 'biceps', 'cabeça curta', 'flexionar-cotovelo', 'flexão de cotovelo', 'barra', 'biceps-flexao-supinada', 'isolado', 'bilateral', 'intermediaria', 'baixa', 'moderada', 'baixa', 'rosca-direta', '{}', '{}', true),
  ('hammer-curl', 'Rosca martelo com halteres', 3, 8, 12, 'biceps', 'braquial e braquiorradial', 'flexionar-cotovelo', 'flexão de cotovelo neutra', 'halteres', 'biceps-flexao-neutra', 'isolado', 'bilateral', 'intermediaria', 'baixa', 'moderada', 'baixa', 'rosca-martelo', '{}', '{}', true),
  ('rope-hammer-curl', 'Rosca martelo com corda', 3, 8, 12, 'biceps', 'braquial e braquiorradial', 'flexionar-cotovelo', 'flexão de cotovelo neutra', 'polia', 'biceps-flexao-neutra', 'isolado', 'bilateral', 'continua', 'baixa', 'baixa', 'baixa', 'rosca-martelo', '{}', '{}', true),
  ('reverse-curl', 'Rosca inversa', 3, 8, 12, 'biceps', 'braquial e braquiorradial', 'flexionar-cotovelo', 'flexão de cotovelo pronada', 'barra W', 'biceps-flexao-pronada', 'isolado', 'bilateral', 'intermediaria', 'baixa', 'moderada', 'moderada', 'rosca-inversa', '{}', '{}', true),

  ('overhead-rope-triceps', 'Tríceps francês com corda', 3, 8, 12, 'triceps', 'cabeça longa', 'estender-cotovelo', 'extensão de cotovelo com ombro flexionado', 'polia', 'triceps-alongado', 'isolado', 'bilateral', 'alongada', 'baixa', 'moderada', 'moderada', 'triceps-frances', '{ombro}', '{}', true),
  ('overhead-dumbbell-triceps', 'Tríceps francês com halter', 3, 8, 12, 'triceps', 'cabeça longa', 'estender-cotovelo', 'extensão de cotovelo com ombro flexionado', 'halter', 'triceps-alongado', 'isolado', 'bilateral', 'alongada', 'baixa', 'moderada', 'moderada', 'triceps-frances', '{ombro}', '{}', true),
  ('ez-skull-crusher', 'Tríceps testa com barra W', 3, 8, 12, 'triceps', 'cabeça longa', 'estender-cotovelo', 'extensão de cotovelo', 'barra W', 'triceps-alongado', 'isolado', 'bilateral', 'alongada', 'baixa', 'moderada', 'moderada', 'triceps-testa', '{cotovelo}', '{}', true),
  ('rope-triceps', 'Tríceps pulley com corda', 3, 8, 12, 'triceps', 'cabeças lateral e medial', 'estender-cotovelo', 'extensão de cotovelo', 'polia', 'triceps-extensao-cotovelo', 'isolado', 'bilateral', 'continua', 'baixa', 'baixa', 'baixa', 'triceps-pulley', '{}', '{}', true),
  ('bar-pushdown', 'Tríceps pulley com barra reta', 3, 8, 12, 'triceps', 'cabeças lateral e medial', 'estender-cotovelo', 'extensão de cotovelo', 'polia', 'triceps-extensao-cotovelo', 'isolado', 'bilateral', 'continua', 'baixa', 'baixa', 'baixa', 'triceps-pulley', '{}', '{}', true),
  ('close-grip-bench', 'Supino fechado', 3, 8, 12, 'triceps', 'cabeças lateral e medial', 'empurrar-horizontal', 'empurrar horizontal com pegada fechada', 'barra', 'triceps-composto', 'composto', 'bilateral', 'intermediaria', 'alta', 'alta', 'alta', 'supino-fechado', '{ombro,cotovelo}', '{peito,ombros}', true),

  ('back-squat', 'Agachamento livre', 3, 8, 12, 'quadriceps', 'reto femoral e vastos', 'agachar', 'dominância de joelho e quadril', 'barra', 'quadriceps-agachamento', 'composto', 'bilateral', 'alongada', 'alta', 'alta', 'alta', 'agachamento', '{joelho,lombar}', '{gluteos,posteriores}', true),
  ('bulgarian-split-squat', 'Agachamento búlgaro', 3, 8, 12, 'quadriceps', 'reto femoral e vastos', 'agachar', 'dominância de joelho unilateral', 'halteres', 'quadriceps-agachamento-unilateral', 'composto', 'unilateral', 'alongada', 'alta', 'alta', 'alta', 'agachamento-unilateral', '{joelho}', '{gluteos}', true),
  ('hack-squat', 'Hack squat articulado', 3, 8, 12, 'quadriceps', 'reto femoral e vastos', 'agachar', 'alta dominância de joelho', 'máquina articulada', 'quadriceps-agachamento', 'composto', 'bilateral', 'alongada', 'alta', 'baixa', 'moderada', 'agachamento-maquina', '{joelho}', '{gluteos}', true),
  ('pendulum-squat', 'Agachamento pêndulo', 3, 8, 12, 'quadriceps', 'reto femoral e vastos', 'agachar', 'alta dominância de quadríceps', 'máquina articulada', 'quadriceps-agachamento', 'composto', 'bilateral', 'dependente-da-maquina', 'alta', 'baixa', 'moderada', 'agachamento-maquina', '{joelho}', '{gluteos}', true),
  ('leg-press', 'Leg press 45°', 3, 8, 12, 'quadriceps', 'reto femoral e vastos', 'agachar', 'empurrar diagonal', 'máquina', 'quadriceps-leg-press', 'composto', 'bilateral', 'dependente-da-maquina', 'alta', 'baixa', 'baixa', 'leg-press', '{joelho}', '{gluteos}', true),
  ('unilateral-articulated-leg-press', 'Leg press articulado unilateral', 3, 8, 12, 'quadriceps', 'reto femoral e vastos', 'agachar', 'empurrar diagonal unilateral', 'máquina articulada', 'quadriceps-leg-press', 'composto', 'unilateral', 'dependente-da-maquina', 'moderada', 'baixa', 'baixa', 'leg-press', '{joelho}', '{gluteos}', true),
  ('leg-extension', 'Cadeira extensora', 3, 8, 12, 'quadriceps', 'reto femoral e vastos', 'estender-joelho', 'extensão de joelho', 'máquina', 'quadriceps-extensao-joelho', 'isolado', 'bilateral', 'dependente-da-maquina', 'baixa', 'baixa', 'baixa', 'extensora', '{joelho}', '{}', true),
  ('romanian-deadlift', 'Stiff com halteres', 3, 8, 12, 'posteriores', 'isquiotibiais', 'estender-quadril', 'dobradiça de quadril', 'halteres', 'posteriores-dobradica-quadril', 'composto', 'bilateral', 'alongada', 'alta', 'alta', 'alta', 'stiff', '{lombar}', '{gluteos,costas}', true),
  ('barbell-stiff', 'Stiff com barra', 3, 8, 12, 'posteriores', 'isquiotibiais', 'estender-quadril', 'dobradiça de quadril', 'barra', 'posteriores-dobradica-quadril', 'composto', 'bilateral', 'alongada', 'alta', 'alta', 'alta', 'stiff', '{lombar}', '{gluteos,costas}', true),
  ('seated-leg-curl', 'Cadeira flexora', 3, 8, 12, 'posteriores', 'isquiotibiais', 'flexionar-joelho', 'flexão de joelho', 'máquina', 'posteriores-flexao-joelho', 'isolado', 'bilateral', 'dependente-da-maquina', 'baixa', 'baixa', 'baixa', 'flexora', '{}', '{}', true),
  ('lying-leg-curl', 'Mesa flexora', 3, 8, 12, 'posteriores', 'isquiotibiais', 'flexionar-joelho', 'flexão de joelho', 'máquina', 'posteriores-flexao-joelho', 'isolado', 'bilateral', 'dependente-da-maquina', 'baixa', 'baixa', 'baixa', 'flexora', '{}', '{}', true),

  ('hip-thrust', 'Elevação pélvica', 3, 8, 12, 'gluteos', 'glúteo máximo', 'estender-quadril', 'extensão de quadril', 'máquina', 'gluteos-extensao-quadril', 'composto', 'bilateral', 'dependente-da-maquina', 'moderada', 'baixa', 'baixa', 'hip-thrust', '{}', '{posteriores}', true),
  ('sumo-squat', 'Agachamento sumô', 3, 8, 12, 'gluteos', 'glúteo máximo', 'agachar', 'dominância de quadril', 'peso livre', 'gluteos-agachamento', 'composto', 'bilateral', 'alongada', 'alta', 'alta', 'moderada', 'agachamento-sumo', '{lombar}', '{quadriceps,posteriores}', true),
  ('hip-abduction-machine', 'Cadeira abdutora', 3, 8, 12, 'gluteos', 'glúteo médio e mínimo', 'abduzir-quadril', 'abdução de quadril', 'máquina', 'gluteos-abducao', 'isolado', 'bilateral', 'dependente-da-maquina', 'baixa', 'baixa', 'baixa', 'abducao-quadril', '{}', '{}', true),
  ('cable-hip-abduction', 'Abdução de quadril na polia', 3, 8, 12, 'gluteos', 'glúteo médio e mínimo', 'abduzir-quadril', 'abdução de quadril', 'polia', 'gluteos-abducao', 'isolado', 'unilateral', 'continua', 'baixa', 'moderada', 'moderada', 'abducao-quadril', '{}', '{}', true),

  ('standing-calf-raise', 'Panturrilha em pé', 3, 8, 12, 'panturrilhas', 'gastrocnêmio', 'flexao-plantar', 'flexão plantar com joelhos estendidos', 'máquina', 'panturrilha-gastrocnemio', 'isolado', 'bilateral', 'dependente-da-maquina', 'baixa', 'baixa', 'baixa', 'panturrilha-em-pe', '{}', '{}', true),
  ('leg-press-calf-raise', 'Panturrilha no leg press', 3, 8, 12, 'panturrilhas', 'gastrocnêmio', 'flexao-plantar', 'flexão plantar com joelhos estendidos', 'máquina', 'panturrilha-gastrocnemio', 'isolado', 'bilateral', 'dependente-da-maquina', 'baixa', 'baixa', 'baixa', 'panturrilha-em-pe', '{}', '{}', true),
  ('seated-calf-raise', 'Panturrilha sentada', 3, 8, 12, 'panturrilhas', 'sóleo', 'flexao-plantar', 'flexão plantar com joelhos flexionados', 'máquina', 'panturrilha-soleo', 'isolado', 'bilateral', 'dependente-da-maquina', 'baixa', 'baixa', 'baixa', 'panturrilha-sentada', '{}', '{}', true),

  ('machine-crunch', 'Crunch na máquina', 3, 8, 12, 'core', 'reto abdominal', 'flexionar-tronco', 'flexão de tronco', 'máquina', 'core-flexao-tronco', 'isolado', 'bilateral', 'dependente-da-maquina', 'baixa', 'baixa', 'baixa', 'crunch', '{}', '{}', true),
  ('cable-crunch', 'Crunch na polia alta', 3, 8, 12, 'core', 'reto abdominal', 'flexionar-tronco', 'flexão de tronco', 'polia', 'core-flexao-tronco', 'isolado', 'bilateral', 'continua', 'baixa', 'moderada', 'moderada', 'crunch', '{}', '{}', true),
  ('hanging-leg-raise', 'Elevação de pernas em suspensão', 3, 8, 12, 'core', 'reto abdominal', 'flexionar-tronco', 'flexão de quadril e tronco', 'peso corporal', 'core-flexao-quadril', 'composto', 'bilateral', 'encurtada', 'moderada', 'alta', 'alta', 'elevacao-pernas', '{}', '{}', true),
  ('cable-woodchopper', 'Woodchopper na polia', 3, 8, 12, 'core', 'oblíquos e transverso', 'rotacionar-tronco', 'rotação de tronco', 'polia', 'core-rotacao', 'composto', 'unilateral', 'continua', 'moderada', 'alta', 'moderada', 'woodchopper', '{}', '{}', true),
  ('plank', 'Prancha abdominal', 3, 8, 12, 'core', 'oblíquos e transverso', 'anti-extensao-tronco', 'anti-extensão de tronco', 'peso corporal', 'core-anti-extensao', 'isometrico', 'bilateral', 'continua', 'baixa', 'moderada', 'baixa', 'prancha', '{}', '{}', true)
on conflict (key) do update set
  name = excluded.name,
  muscle = excluded.muscle,
  muscle_region = excluded.muscle_region,
  movement = excluded.movement,
  movement_vector = excluded.movement_vector,
  equipment = excluded.equipment,
  stimulus = excluded.stimulus,
  mechanics = excluded.mechanics,
  laterality = excluded.laterality,
  resistance_profile = excluded.resistance_profile,
  systemic_demand = excluded.systemic_demand,
  stability_demand = excluded.stability_demand,
  technical_complexity = excluded.technical_complexity,
  exercise_family = excluded.exercise_family,
  avoid_when = excluded.avoid_when,
  secondary_muscles = excluded.secondary_muscles,
  taxonomy_version = 2,
  active = true,
  updated_at = now();

comment on column public.exercise_catalog.default_sets is
  'Compatibilidade temporária. A prescrição efetiva deve ser gravada em set_logs.';
comment on column public.exercise_catalog.reps_min is
  'Compatibilidade temporária. A prescrição efetiva deve ser gravada em set_logs.';
comment on column public.exercise_catalog.reps_max is
  'Compatibilidade temporária. A prescrição efetiva deve ser gravada em set_logs.';

-- Mantém o mesmo modelo de acesso: leitura autenticada de ativos e escrita
-- somente pelos administradores já protegidos pelas políticas existentes.
grant select on public.exercise_catalog to authenticated;
