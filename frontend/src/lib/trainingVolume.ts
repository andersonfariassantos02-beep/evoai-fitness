import { getWorkoutTemplate, type MuscleGroup, type WorkoutExerciseTemplate } from "./workoutTemplates";

export interface MuscleVolumeSummary {
  muscle: MuscleGroup;
  directSets: number;
  indirectSets: number;
  totalSets: number;
}

const MUSCLE_ORDER: MuscleGroup[] = [
  "peito", "costas", "ombros", "quadriceps", "posteriores", "gluteos",
  "panturrilhas", "biceps", "triceps",
];

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  peito: "Peito",
  costas: "Costas",
  ombros: "Ombros",
  quadriceps: "Quadríceps",
  posteriores: "Posteriores",
  gluteos: "Glúteos",
  panturrilhas: "Panturrilhas",
  biceps: "Bíceps",
  triceps: "Tríceps",
};

function secondaryContributions(exercise: WorkoutExerciseTemplate): Partial<Record<MuscleGroup, number>> {
  if (exercise.movement === "empurrar-horizontal" && exercise.stimulus?.includes("press")) return { triceps: .5, ombros: .5 };
  if (exercise.movement === "empurrar-vertical" && exercise.stimulus?.includes("press")) return { triceps: .5 };
  if (
    (exercise.movement === "puxar-horizontal" || exercise.movement === "puxar-vertical")
    && !exercise.stimulus?.includes("deltoide-posterior")
  ) return { biceps: .5 };
  if (exercise.movement === "agachar") return { posteriores: .5, gluteos: .5 };
  if (exercise.movement === "estender-quadril" && exercise.muscle === "posteriores") return { gluteos: .5 };
  if (exercise.movement === "estender-quadril" && exercise.muscle === "gluteos") return { posteriores: .5 };
  return {};
}

export function summarizeMuscleVolume(exercises: WorkoutExerciseTemplate[]): MuscleVolumeSummary[] {
  const direct = new Map<MuscleGroup, number>();
  const indirect = new Map<MuscleGroup, number>();

  for (const exercise of exercises) {
    direct.set(exercise.muscle, (direct.get(exercise.muscle) ?? 0) + exercise.sets);
    for (const [muscle, factor] of Object.entries(secondaryContributions(exercise))) {
      const group = muscle as MuscleGroup;
      indirect.set(group, (indirect.get(group) ?? 0) + exercise.sets * Number(factor));
    }
  }

  return MUSCLE_ORDER
    .map((muscle) => {
      const directSets = direct.get(muscle) ?? 0;
      const indirectSets = indirect.get(muscle) ?? 0;
      return { muscle, directSets, indirectSets, totalSets: directSets + indirectSets };
    })
    .filter((item) => item.totalSets > 0);
}

export function summarizePlannedMuscleVolume(labels: string[]): MuscleVolumeSummary[] {
  return summarizeMuscleVolume(labels.flatMap((label) => getWorkoutTemplate(label)));
}
