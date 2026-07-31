import { describe, expect, it } from "vitest";
import { buildIntelligentPrescription } from "./intelligentPrescription";
import { assessReadiness, type ReadinessCheckIn } from "./readiness";
import { getWorkoutTemplate } from "./workoutTemplates";

const ready: ReadinessCheckIn = {
  sleepHours: 8, energy: 4, soreness: 2, fatigue: 2, jointDiscomfort: false, availableMinutes: 75,
};

describe("motor inteligente de prescrição", () => {
  it("prescreve força com RPE e descanso coerentes sem trocar exercícios", () => {
    const original = getWorkoutTemplate("PULL");
    const result = buildIntelligentPrescription(original, {
      goal: "strength", readiness: ready, readinessAssessment: assessReadiness(ready),
    });
    expect(result.exercises.map((item) => item.key)).toEqual(original.map((item) => item.key));
    expect(result.exercises.find((item) => item.mechanics !== "isolado")).toMatchObject({
      repsMin: 4, repsMax: 6, targetRpe: 8,
    });
    expect(result.exercises.every((item) => (item.restSeconds ?? 0) >= 60)).toBe(true);
  });

  it("reduz volume com baixa prontidão e explica a decisão", () => {
    const caution: ReadinessCheckIn = {
      sleepHours: 5, energy: 2, soreness: 4, fatigue: 4, jointDiscomfort: false, availableMinutes: 60,
    };
    const original = getWorkoutTemplate("PUSH");
    const result = buildIntelligentPrescription(original, {
      goal: "hypertrophy", readiness: caution, readinessAssessment: assessReadiness(caution),
    });
    expect(result.exercises.every((item, index) => item.sets <= original[index].sets)).toBe(true);
    expect(result.reasons.join(" ")).toContain("check-in");
  });

  it("considera volume semanal já realizado sem remover o estímulo", () => {
    const result = buildIntelligentPrescription(getWorkoutTemplate("PUSH"), {
      goal: "hypertrophy", readiness: ready, readinessAssessment: assessReadiness(ready),
      completedWeeklyVolume: [{ muscle: "peito", directSets: 12, indirectSets: 0, totalSets: 12 }],
    });
    expect(result.exercises.filter((item) => item.muscle === "peito").every((item) => item.sets >= 2)).toBe(true);
    expect(result.reasons.join(" ")).toContain("meta semanal");
  });

  it("aplica deload sobre qualquer objetivo", () => {
    const result = buildIntelligentPrescription(getWorkoutTemplate("LEGS"), {
      goal: "strength", readiness: ready, readinessAssessment: assessReadiness(ready),
      deload: { volumeReductionPercent: 40, targetRpeMin: 6, targetRpeMax: 7 },
    });
    expect(result.exercises.every((item) => item.targetRpe === 7)).toBe(true);
    expect(result.reasons[0]).toContain("Deload ativo");
  });
});

