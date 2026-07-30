import type { WorkoutExerciseTemplate } from "./workoutTemplates";

export const DEFAULT_DELOAD_REDUCTION_PERCENT = 35;
export const DELOAD_TARGET_RPE = "6–7";

export function applyDeloadAdjustment(
  templates: WorkoutExerciseTemplate[],
  reductionPercent = DEFAULT_DELOAD_REDUCTION_PERCENT,
): WorkoutExerciseTemplate[] {
  const multiplier = 1 - reductionPercent / 100;
  return templates.map((exercise) => {
    const sets = Math.max(1, Math.round(exercise.sets * multiplier));
    return {
      ...exercise,
      sets,
      setRepRanges: exercise.setRepRanges?.slice(0, sets),
    };
  });
}
