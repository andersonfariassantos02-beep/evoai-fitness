import { describe, expect, it } from "vitest";
import { evaluatePersonalRecord, findPersonalBest } from "./personalRecord";
import type { SetLog } from "../services/workoutSessionService";

function set(overrides: Partial<SetLog>): SetLog {
  return {
    id: "set-1", set_number: 1, target_reps_min: 8, target_reps_max: 12,
    actual_reps: 10, load_kg: 50, rpe: 8, notes: "", completed: true,
    target_rest_seconds: null, actual_rest_seconds: null, is_extra: false,
    skipped_at: null, skip_reason: null, ...overrides,
  };
}

describe("recordes pessoais", () => {
  it("encontra a melhor 1RM estimada no histórico", () => {
    expect(findPersonalBest([
      { loadKg: 50, reps: 10, date: "2026-07-01" },
      { loadKg: 55, reps: 8, date: "2026-07-08" },
    ])).toMatchObject({ loadKg: 55, reps: 8, estimated1Rm: 69.7 });
  });

  it("identifica melhora relevante durante o treino", () => {
    const result = evaluatePersonalRecord(
      { loadKg: 50, reps: 10, estimated1Rm: 66.7, date: "2026-07-01" },
      [set({ load_kg: 52.5, actual_reps: 10 })],
    );
    expect(result.achieved).toBe(true);
    expect(result.message).toContain("52,5 kg");
  });

  it("ignora séries incompletas, puladas e a primeira referência", () => {
    expect(evaluatePersonalRecord(
      { loadKg: 50, reps: 10, estimated1Rm: 66.7, date: "2026-07-01" },
      [set({ completed: false, load_kg: 100 }), set({ skipped_at: "2026-07-20", load_kg: 100 })],
    ).achieved).toBe(false);
    expect(evaluatePersonalRecord(null, [set({ load_kg: 100 })]).achieved).toBe(false);
  });
});
