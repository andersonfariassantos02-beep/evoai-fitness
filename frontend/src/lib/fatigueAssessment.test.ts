import { describe, expect, it } from "vitest";
import type { ReportWorkout } from "../services/reportService";
import { assessTrainingFatigue } from "./fatigueAssessment";

function workout(date: string, rpe: number | null, volume = 5000, skippedSets = 0): ReportWorkout {
  return {
    id: date, date, label: "Treino", notes: "", startedAt: "", completedAt: `${date}T12:00:00Z`,
    exercises: [], completedSets: 12, skippedSets, volume, averageRpe: rpe,
  };
}

describe("avaliação de fadiga", () => {
  it("sugere deload apenas quando existem sinais combinados", () => {
    const result = assessTrainingFatigue([
      workout("2026-07-27", 9.2, 3500, 3),
      workout("2026-07-28", 9.1, 3400, 3),
      workout("2026-07-29", 9.4, 3200, 4),
    ], [
      workout("2026-07-20", 8, 6000),
      workout("2026-07-22", 8, 6200),
      workout("2026-07-24", 8, 6100),
    ]);
    expect(result.level).toBe("deload");
    expect(result.signals).toEqual(expect.arrayContaining([
      expect.stringContaining("três sessões"),
      expect.stringContaining("queda de volume"),
    ]));
  });

  it("mantém atenção quando há esforço elevado isolado", () => {
    expect(assessTrainingFatigue([
      workout("2026-07-28", 9),
      workout("2026-07-29", 9),
    ], []).level).toBe("attention");
  });

  it("não transforma pouco histórico em alerta", () => {
    const result = assessTrainingFatigue([workout("2026-07-29", 10)], []);
    expect(result.level).toBe("normal");
    expect(result.title).toBe("Monitoramento em formação");
  });

  it("mantém nível normal quando desempenho e esforço estão estáveis", () => {
    expect(assessTrainingFatigue([
      workout("2026-07-27", 7.5, 5000),
      workout("2026-07-29", 8, 5200),
    ], [
      workout("2026-07-20", 8, 4900),
      workout("2026-07-22", 8, 5000),
    ]).level).toBe("normal");
  });

  it("usa sono e fadiga percebida mesmo com pouco histórico de treinos", () => {
    const result = assessTrainingFatigue([], [], [
      { sleepHours: 5.5, fatigue: 4, soreness: 2, jointDiscomfort: false },
      { sleepHours: 5.8, fatigue: 4, soreness: 3, jointDiscomfort: false },
    ]);
    expect(result.level).toBe("deload");
    expect(result.signals).toEqual(expect.arrayContaining([
      expect.stringContaining("sono médio"),
      expect.stringContaining("fadiga percebida"),
    ]));
  });
});

describe("check-out pós-treino na avaliação de fadiga", () => {
  it("usa o RPE geral e desconfortos repetidos como sinais complementares", () => {
    const recent = [
      { ...workout("2026-07-27", 7), sessionRpe: 9, postWorkoutDiscomfort: true },
      { ...workout("2026-07-29", 7), sessionRpe: 9, postWorkoutDiscomfort: true },
    ];
    const result = assessTrainingFatigue(recent, []);
    expect(result.level).toBe("attention");
    expect(result.signals).toContain("2 sessões recentes encerradas com desconforto");
  });
});
