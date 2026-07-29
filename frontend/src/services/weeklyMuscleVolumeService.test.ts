import { beforeEach, describe, expect, it, vi } from "vitest";

const loadWorkoutReport = vi.fn();
const loadExerciseCatalog = vi.fn();
vi.mock("./reportService", () => ({ loadWorkoutReport: (...args: unknown[]) => loadWorkoutReport(...args) }));
vi.mock("./exerciseCatalogService", () => ({ loadExerciseCatalog: (...args: unknown[]) => loadExerciseCatalog(...args) }));

import { loadWeeklyMuscleVolume } from "./weeklyMuscleVolumeService";

describe("serviço de volume muscular semanal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadExerciseCatalog.mockResolvedValue([
      { key: "bench", name: "Supino", sets: 3, repsMin: 8, repsMax: 12, muscle: "peito", movement: "empurrar-horizontal", equipment: "máquina", stimulus: "press" },
    ]);
    loadWorkoutReport.mockResolvedValue({
      workouts: [{ exercises: [{ key: "bench", sets: [
        { reps: 10, skipped: false }, { reps: 0, skipped: false }, { reps: 8, skipped: true },
      ] }] }],
    });
  });

  it("consulta a semana e ignora séries puladas ou sem repetições", async () => {
    const result = await loadWeeklyMuscleVolume("user-1", "2026-07-27", "2026-08-02");
    expect(loadWorkoutReport).toHaveBeenCalledWith("user-1", "2026-07-27", "2026-08-02");
    expect(result.find((item) => item.muscle === "peito")?.directSets).toBe(1);
  });
});
