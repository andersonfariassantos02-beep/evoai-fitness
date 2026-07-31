import { describe, expect, it } from "vitest";
import type { WorkoutReport } from "../services/reportService";
import { buildReportCoachingSummary } from "./reportCoachingSummary";

function report(overrides: Partial<WorkoutReport> = {}): WorkoutReport {
  return {
    startDate: "2026-07-27",
    endDate: "2026-08-02",
    plannedSessions: 3,
    workouts: [{
      id: "workout-1", date: "2026-07-27", label: "PUSH", notes: "", startedAt: "", completedAt: "",
      exercises: [], completedSets: 12, skippedSets: 0, volume: 5_000, averageRpe: 8,
      sessionRpe: 8, sessionQuality: 4, postWorkoutDiscomfort: false,
    }],
    completedSessions: 3,
    adherence: 100,
    completedSets: 36,
    skippedSets: 0,
    totalReps: 360,
    totalVolume: 15_000,
    averageRpe: 8,
    bodyProgress: null,
    ...overrides,
  };
}

describe("resumo inteligente do relatório", () => {
  it("destaca consistência e progressão sustentável", () => {
    const summary = buildReportCoachingSummary(
      report(),
      report({ totalVolume: 14_000 }),
    );

    expect(summary.title).toBe("Período consistente");
    expect(summary.insights.some((item) => item.id === "adherence-good")).toBe(true);
    expect(summary.insights.some((item) => item.id === "volume-progress")).toBe(true);
  });

  it("prioriza excesso, séries pendentes e desconforto", () => {
    const current = report({
      completedSets: 20,
      skippedSets: 10,
      totalVolume: 20_000,
      averageRpe: 9,
      workouts: [{
        id: "workout-1", date: "2026-07-27", label: "PUSH", notes: "", startedAt: "", completedAt: "",
        exercises: [], completedSets: 20, skippedSets: 10, volume: 20_000, averageRpe: 9,
        sessionRpe: 9, sessionQuality: 2, postWorkoutDiscomfort: true,
      }],
    });
    const summary = buildReportCoachingSummary(current, report({ totalVolume: 10_000 }));

    expect(summary.title).toBe("Ajustes recomendados");
    expect(summary.insights.map((item) => item.id)).toEqual(expect.arrayContaining([
      "load-spike", "skipped-sets", "discomfort",
    ]));
    expect(summary.insights[0].level).toBe("action");
  });

  it("não cria recomendações sem base real", () => {
    const summary = buildReportCoachingSummary(report({
      completedSessions: 0,
      workouts: [],
      completedSets: 0,
      totalReps: 0,
      totalVolume: 0,
      adherence: 0,
    }), null);

    expect(summary.title).toBe("Ainda não há base para analisar");
    expect(summary.insights).toHaveLength(1);
  });
});
