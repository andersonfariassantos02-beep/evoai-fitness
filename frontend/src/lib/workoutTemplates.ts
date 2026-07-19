export interface WorkoutExerciseTemplate { key: string; name: string; sets: number; repsMin: number; repsMax: number; }

const upper: WorkoutExerciseTemplate[] = [
  { key: "chest-press", name: "Press de peito", sets: 3, repsMin: 8, repsMax: 12 },
  { key: "row", name: "Remada", sets: 3, repsMin: 8, repsMax: 12 },
  { key: "shoulder-press", name: "Desenvolvimento", sets: 3, repsMin: 8, repsMax: 12 },
  { key: "pulldown", name: "Puxada", sets: 3, repsMin: 8, repsMax: 12 },
];
const lower: WorkoutExerciseTemplate[] = [
  { key: "squat-pattern", name: "Agachamento guiado", sets: 3, repsMin: 8, repsMax: 12 },
  { key: "leg-press", name: "Leg press", sets: 3, repsMin: 10, repsMax: 15 },
  { key: "leg-curl", name: "Flexão de joelhos", sets: 3, repsMin: 10, repsMax: 15 },
  { key: "calf-raise", name: "Panturrilha", sets: 3, repsMin: 12, repsMax: 20 },
];

export function getWorkoutTemplate(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("inferior") || normalized.includes("legs") || normalized.includes("lower")) return lower;
  if (normalized.includes("pull")) return [upper[1], upper[3], { key: "biceps", name: "Rosca de bíceps", sets: 3, repsMin: 10, repsMax: 15 }];
  if (normalized.includes("push")) return [upper[0], upper[2], { key: "triceps", name: "Extensão de tríceps", sets: 3, repsMin: 10, repsMax: 15 }];
  return [...upper.slice(0, 2), ...lower.slice(0, 2)];
}

