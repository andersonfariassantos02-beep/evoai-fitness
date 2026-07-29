import { describe, expect, it } from "vitest";
import { createReportPdf } from "./reportPdf";

describe("PDF do relatório", () => {
  it("gera um documento PDF nomeado pelo período", async () => {
    const result = await createReportPdf({
      startDate: "2026-07-27", endDate: "2026-08-02", plannedSessions: 1,
      workouts: [{ id: "w1", date: "2026-07-27", label: "Push", notes: "Treino concluído", startedAt: "", completedAt: "", completedSets: 1, skippedSets: 0, volume: 500, averageRpe: 8, exercises: [{ key: "bench", name: "Supino articulado", originalKey: null, substitutionReason: null, volume: 500, estimated1Rm: 66.7, bestSet: { loadKg: 50, reps: 10 }, sets: [{ setNumber: 1, reps: 10, loadKg: 50, rpe: 8, isExtra: false, skipped: false, skipReason: null }] }] }],
      completedSessions: 1, adherence: 100, completedSets: 1, skippedSets: 0, totalReps: 10, totalVolume: 500, averageRpe: 8,
    }, null, "Atleta de teste");

    expect(result.name).toBe("evoai-relatorio-2026-07-27-a-2026-08-02.pdf");
    expect(result.blob.type).toBe("application/pdf");
    expect(result.blob.size).toBeGreaterThan(1_000);
  });
});
