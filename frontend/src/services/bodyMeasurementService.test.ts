import { describe, expect, it } from "vitest";
import { validateBodyMeasurement, type BodyMeasurementInput } from "./bodyMeasurementService";

const valid: BodyMeasurementInput = {
  measuredOn: "2026-07-30",
  weightKg: "82,5",
  bodyFatPercentage: "",
  waistCm: "90",
  chestCm: "",
  hipsCm: "",
  armCm: "",
  thighCm: "",
  notes: "",
};

describe("medidas corporais", () => {
  it("aceita vírgula decimal e medidas parciais", () => {
    expect(validateBodyMeasurement(valid)).toBe("");
  });

  it("exige pelo menos uma medida", () => {
    expect(validateBodyMeasurement({ ...valid, weightKg: "", waistCm: "" })).toMatch(/pelo menos uma medida/i);
  });

  it("rejeita valores incompatíveis com as faixas seguras", () => {
    expect(validateBodyMeasurement({ ...valid, weightKg: "900" })).toMatch(/fora da faixa/i);
    expect(validateBodyMeasurement({ ...valid, armCm: "texto" })).toMatch(/fora da faixa/i);
  });

  it("valida a data e o limite das observações", () => {
    expect(validateBodyMeasurement({ ...valid, measuredOn: "" })).toMatch(/data/i);
    expect(validateBodyMeasurement({ ...valid, notes: "x".repeat(501) })).toMatch(/500/);
  });
});
