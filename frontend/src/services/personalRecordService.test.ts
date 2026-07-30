import { describe, expect, it } from "vitest";
import { mapPersonalRecordRows } from "./personalRecordService";

describe("serviço de recordes pessoais", () => {
  it("mapeia relações do Supabase para desempenhos do exercício", () => {
    expect(mapPersonalRecordRows([{
      actual_reps: 10,
      load_kg: 50,
      exercise_logs: {
        exercise_key: "bench",
        exercise_name: "Supino",
        workout_sessions: { training_date: "2026-07-30" },
      },
    }])).toEqual([{
      exerciseKey: "bench",
      exerciseName: "Supino",
      date: "2026-07-30",
      loadKg: 50,
      reps: 10,
    }]);
  });
});
