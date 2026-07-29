import { describe, expect, it } from "vitest";
import { buildMuscleVolumeBalance, summarizePerformedMuscleVolume, summarizePlannedMuscleVolume } from "./trainingVolume";
import { exerciseCatalog } from "./workoutTemplates";

describe("volume muscular planejado", () => {
  it("contabiliza séries diretas e contribuição dos exercícios compostos", () => {
    const summary = summarizePlannedMuscleVolume(["PUSH"]);
    expect(summary.find((item) => item.muscle === "peito")?.directSets).toBe(9);
    expect(summary.find((item) => item.muscle === "triceps")).toMatchObject({
      directSets: 3,
      indirectSets: 4.5,
      totalSets: 7.5,
    });
  });

  it("uma divisão de três dias cobre empurrar, puxar e pernas", () => {
    const muscles = summarizePlannedMuscleVolume(["PUSH", "PULL", "LEGS"])
      .map((item) => item.muscle);
    expect(muscles).toEqual(expect.arrayContaining([
      "peito", "costas", "ombros", "quadriceps", "posteriores",
      "panturrilhas", "biceps", "triceps",
    ]));
  });

  it("contabiliza apenas séries realmente executadas", () => {
    const summary = summarizePerformedMuscleVolume([
      { key: "machine-bench-press", completedSets: 3 },
      { key: "rope-triceps", completedSets: 2 },
      { key: "leg-press", completedSets: 0 },
    ], exerciseCatalog);
    expect(summary.find((item) => item.muscle === "peito")?.totalSets).toBe(3);
    expect(summary.find((item) => item.muscle === "triceps")?.totalSets).toBe(3.5);
    expect(summary.some((item) => item.muscle === "quadriceps")).toBe(false);
  });

  it("compara realizado e planejado sem ocultar volume feito fora do plano", () => {
    const balance = buildMuscleVolumeBalance(
      [{ muscle: "peito", directSets: 9, indirectSets: 0, totalSets: 9 }],
      [
        { muscle: "peito", directSets: 8, indirectSets: 0, totalSets: 8 },
        { muscle: "costas", directSets: 3, indirectSets: 0, totalSets: 3 },
      ],
    );
    expect(balance.find((item) => item.muscle === "peito")).toMatchObject({ completedSets: 8, progress: 89, status: "complete" });
    expect(balance.find((item) => item.muscle === "costas")).toMatchObject({ totalSets: 0, completedSets: 3, progress: 100 });
  });
});
