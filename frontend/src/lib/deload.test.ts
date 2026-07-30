import { describe, expect, it } from "vitest";
import { applyDeloadAdjustment } from "./deload";
import { getWorkoutTemplate } from "./workoutTemplates";

describe("semana de deload", () => {
  it("preserva exercícios e ordem enquanto reduz o volume", () => {
    const original = getWorkoutTemplate("PUSH");
    const adjusted = applyDeloadAdjustment(original);

    expect(adjusted.map((item) => item.key)).toEqual(original.map((item) => item.key));
    expect(adjusted.map((item) => item.sets)).toEqual(original.map((item) => Math.max(1, Math.round(item.sets * .65))));
    expect(adjusted.reduce((total, item) => total + item.sets, 0))
      .toBeLessThan(original.reduce((total, item) => total + item.sets, 0));
  });

  it("mantém apenas as faixas de repetição correspondentes às séries restantes", () => {
    const [adjusted] = applyDeloadAdjustment([{
      key: "test", name: "Teste", sets: 4, repsMin: 6, repsMax: 12, muscle: "peito",
      movement: "empurrar-horizontal", equipment: "máquina",
      setRepRanges: [{ min: 12, max: 12 }, { min: 10, max: 10 }, { min: 8, max: 8 }, { min: 6, max: 8 }],
    }]);

    expect(adjusted.sets).toBe(3);
    expect(adjusted.setRepRanges).toHaveLength(3);
  });
});
