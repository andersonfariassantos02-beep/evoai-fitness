import type { ExerciseGoal } from "../services/exerciseGoalService";
import type { ExercisePersonalRecords } from "./personalRecord";

export interface ExerciseGoalProgress {
  goal: ExerciseGoal;
  currentValue: number;
  progressPercent: number;
  reached: boolean;
}

export interface ExerciseGoalSummary {
  activeCount: number;
  reachedCount: number;
  featured: ExerciseGoalProgress | null;
}

export function buildExerciseGoalSummary(
  goals: ExerciseGoal[],
  records: ExercisePersonalRecords[],
): ExerciseGoalSummary {
  const recordByKey = new Map(records.map((record) => [record.key, record]));
  const progress = goals.map((goal) => {
    const record = recordByKey.get(goal.exerciseKey);
    const currentValue = goal.metric === "estimated_1rm"
      ? record?.bestEstimated1Rm.estimated1Rm ?? 0
      : record?.bestLoad.loadKg ?? 0;
    const progressPercent = goal.targetValue > 0
      ? Math.min(100, Math.round((currentValue / goal.targetValue) * 100))
      : 0;
    return { goal, currentValue, progressPercent, reached: progressPercent >= 100 };
  });
  const pending = progress
    .filter((item) => !item.reached)
    .sort((left, right) => right.progressPercent - left.progressPercent);
  const reached = progress
    .filter((item) => item.reached)
    .sort((left, right) => right.progressPercent - left.progressPercent);

  return {
    activeCount: goals.length,
    reachedCount: reached.length,
    featured: pending[0] ?? reached[0] ?? null,
  };
}
