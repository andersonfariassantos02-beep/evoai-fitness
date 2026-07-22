import { describe, expect, it } from "vitest";
import { groupExerciseCatalogByMuscle, mapExerciseCatalogRow, mapExerciseGuidanceRow, type ExerciseCatalogAdminItem } from "./exerciseCatalogService";

describe("Banco Mestre de Exercícios", () => {
  it("converte a prescrição persistida para o formato do treino", () => {
    expect(mapExerciseCatalogRow({
      key: "leg-press", name: "Leg press", default_sets: 4, reps_min: 10, reps_max: 15,
      muscle: "quadriceps", movement: "agachar", equipment: "máquina", avoid_when: ["joelho"],
    })).toMatchObject({ key: "leg-press", sets: 4, repsMin: 10, repsMax: 15, avoidWhen: ["joelho"] });
  });

  it("normaliza instruções, cuidados, mídia e variações", () => {
    expect(mapExerciseGuidanceRow({
      key: "row", name: "Remada", default_sets: 3, reps_min: 8, reps_max: 12,
      muscle: "costas", movement: "puxar", equipment: "cabo", avoid_when: [],
      instructions: "  Mantenha a coluna neutra. ", cautions: ["Evite impulso"],
      media_url: "https://example.com/remada", equipment_variants: ["halteres", "máquina"],
    })).toEqual({ key: "row", instructions: "Mantenha a coluna neutra.", cautions: ["Evite impulso"], mediaUrl: "https://example.com/remada", equipmentVariants: ["halteres", "máquina"] });
  });

  it("agrupa o catálogo por músculo em ordem anatômica", () => {
    const base: ExerciseCatalogAdminItem = {
      key: "base", name: "Base", default_sets: 3, reps_min: 8, reps_max: 12,
      muscle: "", movement: "", equipment: "", avoid_when: [], instructions: "",
      cautions: [], media_url: null, equipment_variants: [], active: true,
    };
    const groups = groupExerciseCatalogByMuscle([
      { ...base, key: "row", name: "Remada", muscle: "costas" },
      { ...base, key: "press", name: "Press", muscle: "peito" },
      { ...base, key: "curl", name: "Rosca", muscle: "biceps" },
      { ...base, key: "pulldown", name: "Puxada", muscle: "costas" },
    ]);

    expect(groups.map((group) => [group.label, group.items.map((item) => item.key)])).toEqual([
      ["Peito", ["press"]],
      ["Costas", ["row", "pulldown"]],
      ["Bíceps", ["curl"]],
    ]);
  });
});
