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
    ]);
    expect(workout.map(formatWorkoutPrescription)).toEqual([
      "4 séries: 12 / 10 / 8 / 6–8",
      "3 séries: 12 / 10 / 8–10",
      "3 séries: 12 / 12 / 10–12",
      "3 séries: 12 / 10 / 8",
      "3 séries: 12 / 12 / 10",
      "3 séries: 12 / 10–12 / 8–10",
    ]);
  });

  it("QUADRÍCEPS não cai no template Full body", () => {
    expect(getWorkoutTemplate("QUADRÍCEPS").map((item) => item.muscle))
      .toEqual(["quadriceps", "quadriceps", "quadriceps", "panturrilhas"]);
  });
});
