import { describe, expect, it } from "vitest";
import type { ExerciseGoal } from "../services/exerciseGoalService";
import type { ExerciseLog } from "../services/workoutSessionService";
import { buildWorkoutAchievementSummary } from "./workoutAchievements";

function exercise(loadKg: number, previousLoad = 80): ExerciseLog {
  return {
    id: "exercise-1", exercise_key: "bench", exercise_name: "Supino",
    original_exercise_key: null, substitution_reason: null, position: 1,
    rest_seconds: 120, transition_rest_seconds: 180,
    recommendation: { action: "maintain", loadKg, reason: "teste" },
    personalBest: { loadKg: previousLoad, reps: 8, estimated1Rm: 101, date: "2026-07-01" },
    sets: [{
      id: "set-1", set_number: 1, target_reps_min: 6, target_reps_max: 10,
      actual_reps: 8, load_kg: loadKg, rpe: 8, notes: "", completed: true,
      completed_at: "2026-07-30T10:00:00Z", target_rest_seconds: 120,
      actual_rest_seconds: 90, is_extra: false, is_warmup: false,
      skipped_at: null, skip_reason: null,
    }],
  };
}

const goal: ExerciseGoal = {
  id: "goal-1", exerciseKey: "bench", exerciseName: "Supino",
  metric: "load", targetValue: 100, targetDate: null,
};

describe("conquistas ao finalizar o treino", () => {
  it("informa recorde e meta alcançada quando o alvo foi cruzado agora", () => {
    const summary = buildWorkoutAchievementSummary([exercise(100)], [goal]);
    expect(summary.completedSets).toBe(1);
    expect(summary.achievements.map((item) => item.kind)).toEqual(["personal_record", "goal_reached"]);
  });

  it("não repete uma meta que já havia sido alcançada", () => {
    const summary = buildWorkoutAchievementSummary([exercise(105, 100)], [goal]);
    expect(summary.achievements.filter((item) => item.kind === "goal_reached")).toHaveLength(0);
  });
});
