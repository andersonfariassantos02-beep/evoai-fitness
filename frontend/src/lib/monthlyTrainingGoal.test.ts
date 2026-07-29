import { describe, expect, it } from "vitest";
import { buildMonthlyTrainingGoal, monthDateRange } from "./monthlyTrainingGoal";

describe("meta mensal de treinos", () => {
  it("usa exclusivamente os dias disponíveis do mês como meta", () => {
    const result = buildMonthlyTrainingGoal(
      ["2026-07-02", "2026-07-04", "2026-08-01"], ["2026-07-02"],
      new Date(2026, 6, 1), new Date(2026, 6, 5),
    );
    expect(result).toMatchObject({ targetSessions: 2, completedSessions: 1, remainingSessions: 1 });
  });

  it("sinaliza atraso sem recomendar compensação excessiva", () => {
    const result = buildMonthlyTrainingGoal(
      ["2026-07-01", "2026-07-03", "2026-07-08", "2026-07-10"], [],
      new Date(2026, 6, 1), new Date(2026, 6, 20),
    );
    expect(result.status).toBe("attention");
    expect(result.message).toContain("sem compensar com excesso");
  });

  it("reconhece a conclusão e respeita meses com 28 dias", () => {
    expect(monthDateRange(new Date(2026, 1, 1)).endDate).toBe("2026-02-28");
    expect(buildMonthlyTrainingGoal(
      ["2026-02-02"], ["2026-02-02"], new Date(2026, 1, 1), new Date(2026, 1, 2),
    ).status).toBe("completed");
  });
});
