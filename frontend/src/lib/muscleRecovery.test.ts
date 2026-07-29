import { describe, expect, it } from "vitest";
import { calculateMuscleRecovery } from "./muscleRecovery";

describe("recuperação muscular estimada", () => {
  const now = new Date("2026-07-29T12:00:00Z");

  it("mantém disponível um músculo sem estímulo recente", () => {
    expect(calculateMuscleRecovery(["peito"], [], now)[0]).toMatchObject({ status: "ready", lastStimulusAt: null });
  });

  it("amplia a recuperação após sessão volumosa ou esforço alto", () => {
    const result = calculateMuscleRecovery(["peito"], [{
      muscle: "peito", completedAt: "2026-07-28T12:00:00Z", completedSets: 10, averageRpe: 9,
    }], now)[0];
    expect(result).toMatchObject({ status: "recovering", recoveryHours: 72, remainingHours: 48 });
  });

  it("sinaliza atenção quando a janela está perto do fim", () => {
    const result = calculateMuscleRecovery(["costas"], [{
      muscle: "costas", completedAt: "2026-07-27T08:00:00Z", completedSets: 6, averageRpe: 8,
    }], now)[0];
    expect(result).toMatchObject({ status: "attention", recoveryHours: 60, remainingHours: 8 });
  });
});
