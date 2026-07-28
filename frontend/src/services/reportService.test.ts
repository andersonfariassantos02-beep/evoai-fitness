import { describe, expect, it } from "vitest";
import { aggregateWorkoutReport, mapUnfinishedWorkouts } from "./reportService";

describe("agregação do relatório", () => {
  it("calcula volume, RPE e séries ignoradas apenas com registros reais recebidos", () => {
    const report = aggregateWorkoutReport("2026-07-27", "2026-08-02", 3, [{
      id: "workout-1",
      training_date: "2026-07-27",
      workout_label: "Push",
      notes: "",
      started_at: "2026-07-27T10:00:00Z",
      completed_at: "2026-07-27T11:00:00Z",
      exercise_logs: [{
        exercise_key: "bench",
        exercise_name: "Supino",
        original_exercise_key: null,
        substitution_reason: null,
        position: 1,
        set_logs: [
          { set_number: 1, actual_reps: 10, load_kg: 50, rpe: 8, completed: true, is_extra: false, skipped_at: null, skip_reason: null },
          { set_number: 2, actual_reps: null, load_kg: null, rpe: null, completed: false, is_extra: false, skipped_at: "2026-07-27T11:00:00Z", skip_reason: "Falta de tempo" },
          { set_number: 3, actual_reps: 8, load_kg: 55, rpe: 9, completed: true, is_extra: true, skipped_at: null, skip_reason: null },
        ],
      }],
    }]);

    expect(report.completedSessions).toBe(1);
    expect(report.adherence).toBe(33.3);
    expect(report.completedSets).toBe(2);
    expect(report.skippedSets).toBe(1);
    expect(report.totalReps).toBe(18);
    expect(report.totalVolume).toBe(940);
    expect(report.averageRpe).toBe(8.5);
  });
});

describe("treinos aguardando finalização", () => {
  it("resume o progresso de sessões ativas e pausadas", () => {
    const workouts = mapUnfinishedWorkouts([{
      id: "pending-1",
      training_date: "2026-07-27",
      workout_label: "PUSH",
      status: "active",
      exercise_logs: [{
        set_logs: [
          { completed: true, skipped_at: null },
          { completed: false, skipped_at: "2026-07-27T12:00:00Z" },
          { completed: false, skipped_at: null },
        ],
      }],
    }]);

    expect(workouts).toEqual([{
      id: "pending-1",
      date: "2026-07-27",
      label: "PUSH",
      status: "active",
      completedSets: 2,
      totalSets: 3,
    }]);
  });
});
