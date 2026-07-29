import { describe, expect, it } from "vitest";
import { applyReadinessAdjustment, assessReadiness } from "./readiness";
import { getWorkoutTemplate } from "./workoutTemplates";

describe("check-in de prontidão", () => {
  it("reduz o volume sem trocar exercícios ou ordem", () => {
    const original = getWorkoutTemplate("PUSH");
    const assessment = assessReadiness({ sleepHours: 7, energy: 2, soreness: 3, fatigue: 3, jointDiscomfort: false, availableMinutes: 60 });
    const adjusted = applyReadinessAdjustment(original, assessment);
    expect(adjusted.map((item) => item.key)).toEqual(original.map((item) => item.key));
    expect(adjusted.every((item, index) => item.sets === Math.max(2, original[index].sets - 1))).toBe(true);
  });

  it("não prescreve redução automática diante de desconforto articular", () => {
    const assessment = assessReadiness({ sleepHours: 8, energy: 5, soreness: 1, fatigue: 1, jointDiscomfort: true, availableMinutes: 60 });
    expect(assessment).toMatchObject({ level: "limited", reduceVolume: false });
  });

  it("considera sono curto e fadiga percebida na redução preventiva", () => {
    expect(assessReadiness({
      sleepHours: 5.5, energy: 3, soreness: 2, fatigue: 4, jointDiscomfort: false, availableMinutes: 60,
    })).toMatchObject({ level: "caution", reduceVolume: true });
  });
});
