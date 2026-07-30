import { describe, expect, it } from "vitest";
import { validateExerciseGoal, type ExerciseGoalInput } from "./exerciseGoalService";

const valid: ExerciseGoalInput = {
  exerciseKey: "bench",
  exerciseName: "Supino articulado",
  metric: "load",
  targetValue: "100",
  targetDate: "2026-12-31",
};

describe("metas por exercício", () => {
  it("aceita carga decimal e data opcional", () => {
    expect(validateExerciseGoal({ ...valid, targetValue: "102,5" })).toBe("");
    expect(validateExerciseGoal({ ...valid, targetDate: "" })).toBe("");
  });

  it("rejeita meta, exercício ou data inválidos", () => {
    expect(validateExerciseGoal({ ...valid, targetValue: "0" })).toMatch(/meta/i);
    expect(validateExerciseGoal({ ...valid, exerciseKey: "" })).toMatch(/exercício/i);
    expect(validateExerciseGoal({ ...valid, targetDate: "31/12/2026" })).toMatch(/data/i);
  });
});
