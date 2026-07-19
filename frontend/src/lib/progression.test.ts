import { describe, expect, it } from "vitest";
import { recommendProgression } from "./progression";
import { getSubstitutionCandidates } from "./workoutTemplates";

describe("progressão determinística", () => {
  it("aumenta a carga após atingir o topo da faixa com RPE controlado", () => {
    expect(recommendProgression({ loadKg: 20, reps: 12, rpe: 8, failed: false }, 8, 12)).toMatchObject({ action: "increase", loadKg: 22.5 });
  });

  it("reduz a carga diante de falha", () => {
    expect(recommendProgression({ loadKg: 20, reps: 7, rpe: 10, failed: true }, 8, 12)).toMatchObject({ action: "reduce", loadKg: 19 });
  });
});

describe("substituições equivalentes", () => {
  it("mantém grupo muscular e padrão de movimento", () => {
    const candidates = getSubstitutionCandidates("row", "indisponibilidade");
    expect(candidates.map((item) => item.key)).toEqual(expect.arrayContaining(["cable-row", "dumbbell-row"]));
    expect(candidates.every((item) => item.muscle === "costas" && item.movement === "puxar-horizontal")).toBe(true);
  });

  it("exclui opção incompatível com a restrição", () => {
    expect(getSubstitutionCandidates("row", "desconforto lombar").map((item) => item.key)).not.toContain("dumbbell-row");
  });
});
