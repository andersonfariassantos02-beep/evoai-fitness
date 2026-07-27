import { describe, expect, it } from "vitest";
import { formatWorkoutPrescription, getWorkoutTemplate } from "./workoutTemplates";

describe("PUSH pesado", () => {
  it("mantém exercícios, ordem e repetições por série exatos", () => {
    const workout = getWorkoutTemplate("PUSH pesado");
    expect(workout.map((item) => item.name)).toEqual([
      "Supino articulado",
      "Supino inclinado com halteres",
      "Crossover",
      "Desenvolvimento com halteres",
      "Elevação lateral",
      "Tríceps corda",
      "Crucifixo inverso no Cross",
    ]);
    expect(workout.map(formatWorkoutPrescription)).toEqual([
      "3×10–12",
      "3×10–12",
      "3×12–15",
      "3×10–12",
      "4×12–15",
      "3×10–12",
      "2×12–15",
    ]);
  });

  it("QUADRÍCEPS não cai no template Full body", () => {
    expect(getWorkoutTemplate("QUADRÍCEPS").map((item) => item.muscle))
      .toEqual(["quadriceps", "quadriceps", "quadriceps", "panturrilhas"]);
  });
});
