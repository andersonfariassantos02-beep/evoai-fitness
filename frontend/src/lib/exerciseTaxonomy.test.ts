import { describe, expect, it } from "vitest";
import { calculateDynamicRest, calculateTransitionRest } from "./exerciseTaxonomy";

describe("prescrição dinâmica de descanso", () => {
  it("prescreve descanso maior para composto pesado e instável", () => {
    expect(calculateDynamicRest({
      mechanics: "composto",
      systemicDemand: "alta",
      stabilityDemand: "alta",
      repsMax: 6,
      targetRpe: 9,
    })).toBe(240);
  });

  it("mantém isoladores de baixa demanda em uma faixa curta e segura", () => {
    expect(calculateDynamicRest({
      mechanics: "isolado",
      systemicDemand: "baixa",
      stabilityDemand: "baixa",
      repsMax: 15,
    })).toBe(75);
  });

  it("separa o descanso de transição do descanso entre séries", () => {
    expect(calculateTransitionRest(75)).toBe(120);
    expect(calculateTransitionRest(180)).toBe(225);
  });
});
