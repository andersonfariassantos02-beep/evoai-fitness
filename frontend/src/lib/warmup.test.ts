import { describe, expect, it } from "vitest";
import { buildWarmupPrescription } from "./warmup";

describe("prescrição de aquecimento", () => {
  it("gera duas séries progressivas arredondadas para meio quilo", () => {
    expect(buildWarmupPrescription(73)).toEqual([
      { setNumber: 1, reps: 10, loadKg: 36.5 },
      { setNumber: 2, reps: 5, loadKg: 51 },
    ]);
  });

  it("não gera aquecimento sem carga de trabalho válida", () => {
    expect(buildWarmupPrescription(0)).toEqual([]);
    expect(buildWarmupPrescription(Number.NaN)).toEqual([]);
  });
});
