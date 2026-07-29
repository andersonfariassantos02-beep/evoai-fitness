import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  ["select", "eq", "gte", "lte"].forEach((method) => { chain[method] = vi.fn(() => chain); });
  chain.order = vi.fn().mockResolvedValue({ data: [
    { training_date: "2026-07-02" }, { training_date: "2026-07-02" }, { training_date: "2026-07-04" },
  ], error: null });
  return chain;
});

vi.mock("../lib/supabase", () => ({ getSupabaseClient: () => ({ from: vi.fn(() => query) }) }));
import { loadMonthlyCompletedWorkoutDates } from "./monthlyTrainingGoalService";

describe("histórico da meta mensal", () => {
  beforeEach(() => vi.clearAllMocks());
  it("consulta somente treinos reais concluídos do usuário e remove datas duplicadas", async () => {
    await expect(loadMonthlyCompletedWorkoutDates("user-1", "2026-07-01", "2026-07-31"))
      .resolves.toEqual(["2026-07-02", "2026-07-04"]);
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.eq).toHaveBeenCalledWith("session_kind", "real");
    expect(query.eq).toHaveBeenCalledWith("status", "completed");
  });
});
