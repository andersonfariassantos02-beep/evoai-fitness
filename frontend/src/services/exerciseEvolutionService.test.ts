import { beforeEach, describe, expect, it, vi } from "vitest";

const loadWorkoutReport = vi.fn();
vi.mock("./reportService", () => ({ loadWorkoutReport: (...args: unknown[]) => loadWorkoutReport(...args) }));

import { loadExerciseEvolution } from "./exerciseEvolutionService";

describe("serviço de evolução", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadWorkoutReport.mockResolvedValue({ workouts: [] });
  });

  it("limita o histórico aos 90 dias anteriores ao período selecionado", async () => {
    await loadExerciseEvolution("user-1", "2026-07-29");
    expect(loadWorkoutReport).toHaveBeenCalledWith("user-1", "2026-05-01", "2026-07-29");
  });
});
