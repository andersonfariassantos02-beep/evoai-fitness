import { describe, expect, it } from "vitest";
import { analyzeWeeklyPlan } from "./weeklyPlanAnalysis";

describe("análise da prévia semanal", () => {
  it("consolida duração, séries e cobertura de PUSH, PULL e LEGS", () => {
    const result = analyzeWeeklyPlan([
      { date: "2026-08-03", label: "PUSH" },
      { date: "2026-08-05", label: "PULL" },
      { date: "2026-08-07", label: "LEGS" },
    ], "hypertrophy");

    expect(result.sessions).toHaveLength(3);
    expect(result.estimatedMinutes).toBeGreaterThan(0);
    expect(result.validSets).toBeGreaterThan(40);
    expect(result.muscles.find((item) => item.muscle === "peito")?.status).toBe("balanced");
    expect(result.canConfirm).toBe(true);
  });

  it("recalcula e alerta volume excessivo quando a divisão é repetida", () => {
    const result = analyzeWeeklyPlan([
      { date: "2026-08-03", label: "PUSH" },
      { date: "2026-08-04", label: "PUSH" },
      { date: "2026-08-05", label: "PUSH" },
    ], "general_fitness");

    expect(result.muscles.find((item) => item.muscle === "peito")?.status).toBe("high");
    expect(result.alerts.some((item) => item.id === "high-volume")).toBe(true);
    expect(result.alerts.some((item) => item.id.startsWith("recovery-"))).toBe(true);
  });

  it("bloqueia confirmação sem dias e soma volume já realizado", () => {
    expect(analyzeWeeklyPlan([], "general_fitness").canConfirm).toBe(false);

    const result = analyzeWeeklyPlan(
      [{ date: "2026-08-03", label: "PUSH" }],
      "general_fitness",
      [{ muscle: "peito", directSets: 4, indirectSets: 0, totalSets: 4 }],
    );
    expect(result.muscles.find((item) => item.muscle === "peito")).toMatchObject({
      plannedSets: 9,
      completedSets: 4,
      totalSets: 13,
    });
  });
});
