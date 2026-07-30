export const MUSCLE_GROUPS = [
  "peito", "costas", "ombros", "quadriceps", "posteriores",
  "gluteos", "panturrilhas", "biceps", "triceps", "core",
] as const;

export type MuscleGroup = typeof MUSCLE_GROUPS[number];
export type ExerciseMechanics = "composto" | "isolado" | "isometrico";
export type ExerciseLaterality = "bilateral" | "unilateral" | "alternado";
export type DemandLevel = "baixa" | "moderada" | "alta";
export type ResistanceProfile =
  | "alongada"
  | "intermediaria"
  | "encurtada"
  | "continua"
  | "variavel"
  | "dependente-da-maquina";

export const MOVEMENT_PATTERNS = [
  "empurrar-horizontal", "empurrar-diagonal", "empurrar-vertical",
  "puxar-horizontal", "puxar-vertical", "aducao-horizontal",
  "abducao-horizontal", "flexao-ombro", "abducao-ombro",
  "elevacao-escapular", "extensao-ombro", "rotacao-externa",
  "agachar", "flexionar-joelho", "estender-joelho", "estender-quadril",
  "abduzir-quadril", "flexao-plantar", "flexionar-cotovelo",
  "estender-cotovelo", "flexionar-tronco", "estender-tronco",
  "rotacionar-tronco", "anti-extensao-tronco",
  // Compatibilidade durante a migração dos registros existentes.
  "panturrilha", "isolar-braco",
] as const;

export type MovementPattern = typeof MOVEMENT_PATTERNS[number];

export interface ExerciseBiomechanics {
  muscleRegion?: string;
  secondaryMuscles?: MuscleGroup[];
  mechanics?: ExerciseMechanics;
  laterality?: ExerciseLaterality;
  resistanceProfile?: ResistanceProfile;
  movementVector?: string;
  systemicDemand?: DemandLevel;
  stabilityDemand?: DemandLevel;
  technicalComplexity?: DemandLevel;
  exerciseFamily?: string;
}

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  peito: "Peito",
  costas: "Costas",
  ombros: "Ombros",
  quadriceps: "Quadríceps",
  posteriores: "Posteriores de coxa",
  gluteos: "Glúteos",
  panturrilhas: "Panturrilhas",
  biceps: "Bíceps",
  triceps: "Tríceps",
  core: "Core",
};

export const MECHANICS_LABELS: Record<ExerciseMechanics, string> = {
  composto: "Composto",
  isolado: "Isolado",
  isometrico: "Isométrico",
};

export const DEMAND_LABELS: Record<DemandLevel, string> = {
  baixa: "Baixa",
  moderada: "Moderada",
  alta: "Alta",
};

export const RESISTANCE_PROFILE_LABELS: Record<ResistanceProfile, string> = {
  alongada: "Maior na posição alongada",
  intermediaria: "Maior na posição intermediária",
  encurtada: "Maior na posição encurtada",
  continua: "Tensão contínua",
  variavel: "Variável",
  "dependente-da-maquina": "Dependente da máquina",
};

export interface RestPrescriptionContext {
  mechanics?: ExerciseMechanics;
  systemicDemand?: DemandLevel;
  stabilityDemand?: DemandLevel;
  repsMax: number;
  targetRpe?: number;
}

export function calculateDynamicRest(context: RestPrescriptionContext) {
  let seconds = context.mechanics === "composto" ? 120 : context.mechanics === "isometrico" ? 75 : 75;
  if (context.systemicDemand === "alta") seconds += 45;
  else if (context.systemicDemand === "moderada") seconds += 15;
  if (context.stabilityDemand === "alta") seconds += 30;
  else if (context.stabilityDemand === "moderada") seconds += 15;
  if (context.repsMax <= 8) seconds += 30;
  if ((context.targetRpe ?? 0) >= 9) seconds += 15;
  return Math.min(240, Math.max(60, Math.round(seconds / 15) * 15));
}

export function calculateTransitionRest(restSeconds: number) {
  return Math.min(300, Math.max(120, restSeconds + 45));
}
