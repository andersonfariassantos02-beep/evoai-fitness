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
  stimulus?: string;
  restSeconds?: number;
  transitionRestSeconds?: number;
  setRepRanges?: ReadonlyArray<{ min: number; max: number }>;
  avoidWhen?: string[];
}

export const exerciseCatalog: WorkoutExerciseTemplate[] = [
  { key: "machine-bench-press", name: "Supino articulado", sets: 3, repsMin: 10, repsMax: 12, muscle: "peito", movement: "empurrar-horizontal", equipment: "máquina articulada", stimulus: "peito-press-horizontal" },
  { key: "incline-dumbbell-bench", name: "Supino inclinado com halteres", sets: 3, repsMin: 10, repsMax: 12, muscle: "peito", movement: "empurrar-horizontal", equipment: "halteres", stimulus: "peito-press-inclinado" },
  { key: "cable-crossover", name: "Crossover", sets: 3, repsMin: 12, repsMax: 15, muscle: "peito", movement: "empurrar-horizontal", equipment: "cabos", stimulus: "peito-aducao-horizontal" },
  { key: "dumbbell-shoulder-press", name: "Desenvolvimento com halteres", sets: 3, repsMin: 10, repsMax: 12, muscle: "ombros", movement: "empurrar-vertical", equipment: "halteres", stimulus: "ombros-press-vertical" },
  { key: "lateral-raise", name: "Elevação lateral", sets: 4, repsMin: 12, repsMax: 15, muscle: "ombros", movement: "empurrar-vertical", equipment: "halteres", stimulus: "ombros-abducao-lateral" },
  { key: "rope-triceps", name: "Tríceps corda", sets: 3, repsMin: 10, repsMax: 12, muscle: "triceps", movement: "isolar-braco", equipment: "corda no cabo", stimulus: "triceps-extensao-cotovelo" },
  { key: "reverse-cable-fly", name: "Crucifixo inverso no Cross", sets: 2, repsMin: 12, repsMax: 15, muscle: "ombros", movement: "puxar-horizontal", equipment: "cabos", stimulus: "ombros-deltoide-posterior" },
  { key: "chest-press", name: "Press de peito", sets: 3, repsMin: 8, repsMax: 12, muscle: "peito", movement: "empurrar-horizontal", equipment: "máquina", stimulus: "peito-press-horizontal" },
  { key: "dumbbell-bench", name: "Supino com halteres", sets: 3, repsMin: 8, repsMax: 12, muscle: "peito", movement: "empurrar-horizontal", equipment: "halteres", stimulus: "peito-press-horizontal", avoidWhen: ["ombro"] },
  { key: "cable-chest-press", name: "Press de peito no cabo", sets: 3, repsMin: 8, repsMax: 12, muscle: "peito", movement: "empurrar-horizontal", equipment: "cabos", stimulus: "peito-press-horizontal" },
  { key: "dumbbell-fly", name: "Crucifixo com halteres", sets: 3, repsMin: 12, repsMax: 15, muscle: "peito", movement: "empurrar-horizontal", equipment: "halteres", stimulus: "peito-aducao-horizontal" },
  { key: "pec-deck", name: "Fly / Peck Deck", sets: 3, repsMin: 12, repsMax: 15, muscle: "peito", movement: "empurrar-horizontal", equipment: "máquina", stimulus: "peito-aducao-horizontal" },
  { key: "row", name: "Remada", sets: 3, repsMin: 8, repsMax: 12, muscle: "costas", movement: "puxar-horizontal", equipment: "máquina" },
  { key: "cable-row", name: "Remada baixa no cabo", sets: 3, repsMin: 8, repsMax: 12, muscle: "costas", movement: "puxar-horizontal", equipment: "cabos" },
  { key: "dumbbell-row", name: "Remada unilateral", sets: 3, repsMin: 8, repsMax: 12, muscle: "costas", movement: "puxar-horizontal", equipment: "halteres", avoidWhen: ["lombar"] },
  { key: "shoulder-press", name: "Desenvolvimento", sets: 3, repsMin: 8, repsMax: 12, muscle: "ombros", movement: "empurrar-vertical", equipment: "máquina", stimulus: "ombros-press-vertical", avoidWhen: ["ombro"] },
  { key: "cable-lateral-raise", name: "Elevação lateral no cabo", sets: 4, repsMin: 12, repsMax: 15, muscle: "ombros", movement: "empurrar-vertical", equipment: "cabos", stimulus: "ombros-abducao-lateral" },
  { key: "machine-lateral-raise", name: "Elevação lateral na máquina", sets: 4, repsMin: 12, repsMax: 15, muscle: "ombros", movement: "empurrar-vertical", equipment: "máquina", stimulus: "ombros-abducao-lateral" },
  { key: "reverse-pec-deck", name: "Crucifixo inverso na máquina", sets: 2, repsMin: 12, repsMax: 15, muscle: "ombros", movement: "puxar-horizontal", equipment: "máquina", stimulus: "ombros-deltoide-posterior" },
  { key: "pulldown", name: "Puxada", sets: 3, repsMin: 8, repsMax: 12, muscle: "costas", movement: "puxar-vertical", equipment: "máquina" },
  { key: "assisted-pullup", name: "Barra fixa assistida", sets: 3, repsMin: 8, repsMax: 12, muscle: "costas", movement: "puxar-vertical", equipment: "máquina" },
  { key: "squat-pattern", name: "Agachamento guiado", sets: 3, repsMin: 8, repsMax: 12, muscle: "quadriceps", movement: "agachar", equipment: "máquina", avoidWhen: ["joelho"] },
  { key: "leg-press", name: "Leg press", sets: 3, repsMin: 10, repsMax: 15, muscle: "quadriceps", movement: "agachar", equipment: "máquina", avoidWhen: ["joelho"] },
  { key: "goblet-squat", name: "Agachamento goblet", sets: 3, repsMin: 10, repsMax: 15, muscle: "quadriceps", movement: "agachar", equipment: "halteres" },
  { key: "leg-curl", name: "Flexão de joelhos", sets: 3, repsMin: 10, repsMax: 15, muscle: "posteriores", movement: "flexionar-joelho", equipment: "máquina" },
  { key: "calf-raise", name: "Panturrilha", sets: 3, repsMin: 12, repsMax: 20, muscle: "panturrilhas", movement: "panturrilha", equipment: "máquina" },
  { key: "biceps", name: "Rosca de bíceps", sets: 3, repsMin: 10, repsMax: 15, muscle: "biceps", movement: "isolar-braco", equipment: "halteres" },
  { key: "triceps", name: "Extensão de tríceps", sets: 3, repsMin: 10, repsMax: 15, muscle: "triceps", movement: "isolar-braco", equipment: "cabos", stimulus: "triceps-extensao-cotovelo" },
];

export function findExercise(key: string) { return exerciseCatalog.find((item) => item.key === key); }

export function getSubstitutionCandidates(
  key: string,
  restriction = "",
  existingExerciseKeys: string[] = [],
): WorkoutExerciseTemplate[] {
  const source = findExercise(key);
  if (!source) return [];

  const normalized = restriction.toLowerCase();
  const excludedKeys = new Set(existingExerciseKeys);
  excludedKeys.add(key);
  const prioritizeSameEquipment = (option: WorkoutExerciseTemplate) => option.equipment === source.equipment;
  const isLombarRestricted = normalized.includes("lombar");

  return exerciseCatalog
    .filter((option) => {
      if (excludedKeys.has(option.key)) return false;
      if (option.muscle !== source.muscle) return false;
      if (source.stimulus ? option.stimulus !== source.stimulus : option.movement !== source.movement) return false;
      if (isLombarRestricted && option.key === "dumbbell-row") return false;
      return !normalized.includes(option.name.toLowerCase());
    })
    .sort((a, b) => Number(prioritizeSameEquipment(b)) - Number(prioritizeSameEquipment(a)));
}
function byKey(key: string) { const item = findExercise(key); if (!item) throw new Error(`Exercício ausente: ${key}`); return item; }

export function getWorkoutTemplate(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("push pesado")) return [byKey("machine-bench-press"), byKey("incline-dumbbell-bench"), byKey("cable-crossover"), byKey("dumbbell-shoulder-press"), byKey("lateral-raise"), byKey("rope-triceps"), byKey("reverse-cable-fly")];
  if (normalized.includes("quadr")) return [byKey("squat-pattern"), byKey("leg-press"), byKey("goblet-squat"), byKey("calf-raise")];
  if (normalized.includes("posterior")) return [byKey("leg-curl"), byKey("calf-raise")];
  if (normalized.includes("inferior") || normalized.includes("legs") || normalized.includes("lower")) return [byKey("squat-pattern"), byKey("leg-press"), byKey("leg-curl"), byKey("calf-raise")];
  if (normalized.includes("superior") || normalized.includes("upper")) return [byKey("chest-press"), byKey("row"), byKey("shoulder-press"), byKey("pulldown"), byKey("biceps"), byKey("triceps")];
  if (normalized.includes("pull")) return [byKey("row"), byKey("pulldown"), byKey("biceps")];
  if (normalized.includes("push")) return [byKey("chest-press"), byKey("shoulder-press"), byKey("triceps")];
  return [byKey("chest-press"), byKey("row"), byKey("squat-pattern"), byKey("leg-press")];
}

function formatRange(range: { min: number; max: number }) {
  return range.min === range.max ? String(range.min) : `${range.min}–${range.max}`;
}

export function formatWorkoutPrescription(item: WorkoutExerciseTemplate) {
  if (item.setRepRanges?.length) {
    return `${item.sets} séries: ${item.setRepRanges.map(formatRange).join(" / ")}`;
  }
  return `${item.sets}×${formatRange({ min: item.repsMin, max: item.repsMax })}`;
}
