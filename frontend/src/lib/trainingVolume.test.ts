import { describe, expect, it } from "vitest";
import { summarizePlannedMuscleVolume } from "./trainingVolume";

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
});
