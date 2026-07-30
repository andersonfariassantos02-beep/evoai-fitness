import type { ExerciseGoal } from "../services/exerciseGoalService";
import type { ExerciseLog } from "../services/workoutSessionService";
import { estimateOneRepMax, evaluatePersonalRecord } from "./personalRecord";

export interface WorkoutAchievement {
  exerciseKey: string;
  exerciseName: string;
  kind: "personal_record" | "goal_reached";
  detail: string;
}

export interface WorkoutAchievementSummary {
  achievements: WorkoutAchievement[];
  completedExercises: number;
  completedSets: number;
}

export function buildWorkoutAchievementSummary(
  exercises: ExerciseLog[],
  goals: ExerciseGoal[],
): WorkoutAchievementSummary {
  const goalByExercise = new Map(goals.map((goal) => [goal.exerciseKey, goal]));
  const achievements: WorkoutAchievement[] = [];
  let completedSets = 0;
  let completedExercises = 0;

  exercises.forEach((exercise) => {
    const validSets = exercise.sets.filter((set) =>
      set.completed && !set.is_warmup && !set.skipped_at
      && Number(set.actual_reps ?? 0) > 0 && Number(set.load_kg ?? -1) >= 0);
    if (!validSets.length) return;
    completedExercises += 1;
    completedSets += validSets.length;

    const personalRecord = evaluatePersonalRecord(exercise.personalBest ?? null, validSets);
    if (personalRecord.achieved) {
      achievements.push({
        exerciseKey: exercise.exercise_key,
        exerciseName: exercise.exercise_name,
        kind: "personal_record",
        detail: personalRecord.message,
      });
    }

    const goal = goalByExercise.get(exercise.exercise_key);
    if (!goal) return;
    const previousValue = goal.metric === "estimated_1rm"
      ? exercise.personalBest?.estimated1Rm ?? 0
      : exercise.personalBest?.loadKg ?? 0;
    const currentValue = goal.metric === "estimated_1rm"
      ? Math.max(...validSets.map((set) => estimateOneRepMax(Number(set.load_kg), Number(set.actual_reps))))
      : Math.max(...validSets.map((set) => Number(set.load_kg)));
    if (previousValue < goal.targetValue && currentValue >= goal.targetValue) {
      achievements.push({
        exerciseKey: exercise.exercise_key,
        exerciseName: exercise.exercise_name,
        kind: "goal_reached",
        detail: `${currentValue.toLocaleString("pt-BR")} kg · alvo de ${goal.targetValue.toLocaleString("pt-BR")} kg`,
      });
    }
  });

  return { achievements, completedExercises, completedSets };
}
