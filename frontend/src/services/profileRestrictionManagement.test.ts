import { describe, expect, it } from "vitest";
import { validateRestrictionInput, type RestrictionInput } from "./profileRestrictionService";

const valid: RestrictionInput = { category: "injury", severity: "avoid", description: "Evitar flexão profunda do joelho", starts_on: "2026-07-01", ends_on: "2026-07-31" };

describe("gestão de restrições", () => {
  it("aceita uma restrição coerente", () => expect(validateRestrictionInput(valid)).toBe(""));
  it("rejeita descrição vazia", () => expect(validateRestrictionInput({ ...valid, description: "  " })).toContain("Descreva"));
  it("rejeita período invertido", () => expect(validateRestrictionInput({ ...valid, starts_on: "2026-08-01" })).toContain("data final"));
});
