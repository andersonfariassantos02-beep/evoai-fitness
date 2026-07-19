import { describe, expect, it } from "vitest";
import { exerciseConflictsWithRestrictions, restrictionText, type ProfileRestriction } from "./profileRestrictionService";
import { exerciseCatalog } from "../lib/workoutTemplates";

const restrictions: ProfileRestriction[] = [
  { id: "1", category: "injury", severity: "avoid", description: "Desconforto no joelho" },
  { id: "2", category: "medical", severity: "info", description: "Acompanhamento anual" },
];

describe("restrições automáticas do perfil", () => {
  it("bloqueia exercícios incompatíveis e ignora observações informativas", () => {
    expect(exerciseConflictsWithRestrictions(exerciseCatalog.find((item) => item.key === "leg-press")!, restrictions)).toBe(true);
    expect(exerciseConflictsWithRestrictions(exerciseCatalog.find((item) => item.key === "row")!, restrictions)).toBe(false);
    expect(restrictionText(restrictions)).toBe("Desconforto no joelho");
  });
});
