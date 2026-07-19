import { describe, expect, it } from "vitest";
import { mapExerciseCatalogRow } from "./exerciseCatalogService";

describe("Banco Mestre de Exercícios", () => {
  it("converte a prescrição persistida para o formato do treino", () => {
    expect(mapExerciseCatalogRow({
      key: "leg-press", name: "Leg press", default_sets: 4, reps_min: 10, reps_max: 15,
      muscle: "quadriceps", movement: "agachar", equipment: "máquina", avoid_when: ["joelho"],
    })).toMatchObject({ key: "leg-press", sets: 4, repsMin: 10, repsMax: 15, avoidWhen: ["joelho"] });
  });
});

