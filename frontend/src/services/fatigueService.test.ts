import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkoutReport } from "./reportService";

const loadWorkoutReport = vi.fn();
const loadReadinessRange = vi.fn();

vi.mock("./reportService", () => ({
  loadWorkoutReport: (...args: unknown[]) => loadWorkoutReport(...args),
}));
vi.mock("./readinessService", () => ({
  loadReadinessRange: (...args: unknown[]) => loadReadinessRange(...args),
}));

import { loadFatigueAssessment } from "./fatigueService";

const emptyReport: WorkoutReport = {
  startDate: "", endDate: "", plannedSessions: 0, workouts: [], completedSessions: 0,
  adherence: 0, completedSets: 0, skippedSets: 0, totalReps: 0, totalVolume: 0, averageRpe: null,
};

describe("serviço de fadiga", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadWorkoutReport.mockResolvedValue(emptyReport);
    loadReadinessRange.mockResolvedValue([]);
  });

  it("consulta somente duas janelas semanais de treinos reais agregados", async () => {
    await loadFatigueAssessment("user-1", new Date(2026, 6, 29, 12));

    expect(loadWorkoutReport).toHaveBeenNthCalledWith(1, "user-1", "2026-07-23", "2026-07-29");
    expect(loadWorkoutReport).toHaveBeenNthCalledWith(2, "user-1", "2026-07-16", "2026-07-22");
    expect(loadReadinessRange).toHaveBeenCalledWith("user-1", "2026-07-23", "2026-07-29");
  });
});
