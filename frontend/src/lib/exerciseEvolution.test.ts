import { describe, expect, it } from "vitest";
import type { ReportWorkout } from "../services/reportService";
import { analyzeExerciseTrend, buildExerciseEvolution, chartCoordinates, evolutionChange, latestEvolutionChange } from "./exerciseEvolution";

function workout(date: string, loadKg: number, reps: number, volume: number): ReportWorkout {
  return {
    id: date, date, label: "PUSH", notes: "", startedAt: "", completedAt: "",
    completedSets: 3, skippedSets: 0, volume, averageRpe: 8,
    exercises: [{
      key: "bench", name: "Supino", originalKey: null, substitutionReason: null, sets: [],
      volume, bestSet: { loadKg, reps }, estimated1Rm: loadKg * (1 + reps / 30),
    }],
  };
}

describe("evolução por exercício", () => {
  it("ordena os pontos por data e calcula as métricas", () => {
    const result = buildExerciseEvolution([
      workout("2026-07-20", 55, 10, 1500),
      workout("2026-07-06", 50, 10, 1400),
    ]);
    expect(result[0].points.map((point) => point.date)).toEqual(["2026-07-06", "2026-07-20"]);
    expect(evolutionChange(result[0].points, "loadKg")).toBe(10);
  });

  it("compara a execução mais recente somente com a sessão anterior", () => {
    const points = buildExerciseEvolution([
      workout("2026-07-01", 40, 10, 1200),
      workout("2026-07-15", 50, 10, 1500),
      workout("2026-07-29", 55, 10, 1650),
    ])[0].points;

    expect(latestEvolutionChange(points, "loadKg")).toBe(10);
  });

  it("ignora exercícios sem série válida", () => {
    const row = workout("2026-07-20", 50, 10, 1400);
    row.exercises[0].bestSet = null;
    row.exercises[0].estimated1Rm = null;
    expect(buildExerciseEvolution([row])).toEqual([]);
  });

  it("gera coordenadas estáveis inclusive quando os valores são iguais", () => {
    const points = chartCoordinates([50, 50, 50]);
    expect(points).toHaveLength(3);
    expect(points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
  });

  it("identifica progressão e informa quantas sessões decorreram desde a melhor marca", () => {
    const points = buildExerciseEvolution([
      workout("2026-07-01", 40, 10, 1200),
      workout("2026-07-15", 45, 10, 1350),
    ])[0].points;

    expect(analyzeExerciseTrend(points)).toMatchObject({
      status: "progressing",
      sessionsSinceBest: 0,
    });
  });

  it("detecta estagnação após três sessões sem mudança relevante", () => {
    const points = buildExerciseEvolution([
      workout("2026-07-01", 50, 10, 1500),
      workout("2026-07-15", 50, 10, 1500),
      workout("2026-07-29", 50, 10, 1500),
    ])[0].points;

    expect(analyzeExerciseTrend(points)).toMatchObject({
      status: "stable",
      title: "Estagnação detectada",
    });
  });
});
