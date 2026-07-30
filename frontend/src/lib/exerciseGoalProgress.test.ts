import { describe, expect, it } from "vitest";
import type { ExerciseGoal } from "../services/exerciseGoalService";
import type { ExercisePersonalRecords } from "./personalRecord";
import { buildExerciseGoalSummary } from "./exerciseGoalProgress";

const records = [{
  key: "bench",
  name: "Supino",
  sessions: 2,
  bestLoad: { loadKg: 80, reps: 8, estimated1Rm: 101, date: "2026-07-29" },
  bestEstimated1Rm: { estimated1Rm: 101, loadKg: 80, reps: 8, date: "2026-07-29" },
  bestSessionVolume: { volumeKg: 2400, date: "2026-07-29" },
}] satisfies ExercisePersonalRecords[];

function goal(overrides: Partial<ExerciseGoal>): ExerciseGoal {
  return {
    id: "goal-1",
    exerciseKey: "bench",
    exerciseName: "Supino",
    metric: "load",
    targetValue: 100,
    targetDate: null,
    ...overrides,
  };
}

describe("resumo de metas por exercício", () => {
  it("destaca a meta pendente mais próxima", () => {
    const result = buildExerciseGoalSummary([
      goal({ id: "far", exerciseKey: "row", exerciseName: "Remada", targetValue: 100 }),
      goal({ id: "near" }),
    ], records);

    expect(result.featured).toMatchObject({ progressPercent: 80, currentValue: 80 });
    expect(result.featured?.goal.id).toBe("near");
    expect(result.reachedCount).toBe(0);
  });

  it("contabiliza metas alcançadas e limita o progresso a 100%", () => {
    const result = buildExerciseGoalSummary([goal({ targetValue: 75 })], records);

    expect(result.reachedCount).toBe(1);
    expect(result.featured).toMatchObject({ progressPercent: 100, reached: true });
  });
});
