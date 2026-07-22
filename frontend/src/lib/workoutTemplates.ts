export type MuscleGroup = "peito" | "costas" | "ombros" | "quadriceps" | "posteriores" | "panturrilhas" | "biceps" | "triceps";
export type MovementPattern = "empurrar-horizontal" | "puxar-horizontal" | "empurrar-vertical" | "puxar-vertical" | "agachar" | "flexionar-joelho" | "panturrilha" | "isolar-braco";

export interface WorkoutExerciseTemplate {
  key: string;
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  muscle: MuscleGroup;
  movement: MovementPattern;
  equipment: string;
  avoidWhen?: string[];
}

export const exerciseCatalog: WorkoutExerciseTemplate[] = [
  { key: "chest-press", name: "Press de peito", sets: 3, repsMin: 8, repsMax: 12, muscle: "peito", movement: "empurrar-horizontal", equipment: "máquina" },
  { key: "dumbbell-bench", name: "Supino com halteres", sets: 3, repsMin: 8, repsMax: 12, muscle: "peito", movement: "empurrar-horizontal", equipment: "halteres", avoidWhen: ["ombro"] },
  { key: "cable-chest-press", name: "Press de peito no cabo", sets: 3, repsMin: 8, repsMax: 12, muscle: "peito", movement: "empurrar-horizontal", equipment: "cabos" },
  { key: "row", name: "Remada", sets: 3, repsMin: 8, repsMax: 12, muscle: "costas", movement: "puxar-horizontal", equipment: "máquina" },
  { key: "cable-row", name: "Remada baixa no cabo", sets: 3, repsMin: 8, repsMax: 12, muscle: "costas", movement: "puxar-horizontal", equipment: "cabos" },
  { key: "dumbbell-row", name: "Remada unilateral", sets: 3, repsMin: 8, repsMax: 12, muscle: "costas", movement: "puxar-horizontal", equipment: "halteres", avoidWhen: ["lombar"] },
  { key: "shoulder-press", name: "Desenvolvimento", sets: 3, repsMin: 8, repsMax: 12, muscle: "ombros", movement: "empurrar-vertical", equipment: "máquina", avoidWhen: ["ombro"] },
  { key: "pulldown", name: "Puxada", sets: 3, repsMin: 8, repsMax: 12, muscle: "costas", movement: "puxar-vertical", equipment: "máquina" },
  { key: "assisted-pullup", name: "Barra fixa assistida", sets: 3, repsMin: 8, repsMax: 12, muscle: "costas", movement: "puxar-vertical", equipment: "máquina" },
  { key: "squat-pattern", name: "Agachamento guiado", sets: 3, repsMin: 8, repsMax: 12, muscle: "quadriceps", movement: "agachar", equipment: "máquina", avoidWhen: ["joelho"] },
  { key: "leg-press", name: "Leg press", sets: 3, repsMin: 10, repsMax: 15, muscle: "quadriceps", movement: "agachar", equipment: "máquina", avoidWhen: ["joelho"] },
  { key: "goblet-squat", name: "Agachamento goblet", sets: 3, repsMin: 10, repsMax: 15, muscle: "quadriceps", movement: "agachar", equipment: "halteres" },
  { key: "leg-curl", name: "Flexão de joelhos", sets: 3, repsMin: 10, repsMax: 15, muscle: "posteriores", movement: "flexionar-joelho", equipment: "máquina" },
  { key: "calf-raise", name: "Panturrilha", sets: 3, repsMin: 12, repsMax: 20, muscle: "panturrilhas", movement: "panturrilha", equipment: "máquina" },
  { key: "biceps", name: "Rosca de bíceps", sets: 3, repsMin: 10, repsMax: 15, muscle: "biceps", movement: "isolar-braco", equipment: "halteres" },
  { key: "triceps", name: "Extensão de tríceps", sets: 3, repsMin: 10, repsMax: 15, muscle: "triceps", movement: "isolar-braco", equipment: "cabos" },
];

export function findExercise(key: string) { return exerciseCatalog.find((item) => item.key === key); }

export function getSubstitutionCandidates(key: string, restriction = "", excludedKeys: string[] = []) {
  const source = findExercise(key);
  if (!source) return [];
  const normalized = restriction.toLowerCase();
  const excluded = new Set([key, ...excludedKeys]);
  return exerciseCatalog
    .filter((item) => !excluded.has(item.key) && item.muscle === source.muscle && item.movement === source.movement)
    .filter((item) => !(item.avoidWhen ?? []).some((term) => normalized.includes(term)))
    .sort((a, b) => Number(b.equipment === source.equipment) - Number(a.equipment === source.equipment));
}

function byKey(key: string) { const item = findExercise(key); if (!item) throw new Error(`Exercício ausente: ${key}`); return item; }

export function getWorkoutTemplate(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("inferior") || normalized.includes("legs") || normalized.includes("lower")) return [byKey("squat-pattern"), byKey("leg-press"), byKey("leg-curl"), byKey("calf-raise")];
  if (normalized.includes("pull")) return [byKey("row"), byKey("pulldown"), byKey("biceps")];
  if (normalized.includes("push")) return [byKey("chest-press"), byKey("shoulder-press"), byKey("triceps")];
  return [byKey("chest-press"), byKey("row"), byKey("squat-pattern"), byKey("leg-press")];
}
