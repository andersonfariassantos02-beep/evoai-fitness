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
      "4 séries: 12 / 10 / 8 / 6–8",
      "3 séries: 12 / 10 / 8–10",
      "3 séries: 12 / 12 / 10–12",
      "3 séries: 12 / 10 / 8",
      "3 séries: 12 / 12 / 10",
      "3 séries: 12 / 10–12 / 8–10",
      "2×12–15",
    ]);
  });

  it("QUADRÍCEPS não cai no template Full body", () => {
    expect(getWorkoutTemplate("QUADRÍCEPS").map((item) => item.muscle))
      .toEqual(["quadriceps", "quadriceps", "quadriceps", "panturrilhas"]);
  });
});

describe("divisão completa de três dias", () => {
  it("PULL cobre puxadas horizontal e vertical, deltoide posterior e bíceps", () => {
    expect(getWorkoutTemplate("PULL").map((item) => item.name)).toEqual([
      "Puxada",
      "Remada baixa no cabo",
      "Remada unilateral",
      "Crucifixo inverso na máquina",
      "Rosca de bíceps",
      "Rosca martelo",
    ]);
  });

  it("LEGS distribui quadríceps, posteriores, glúteos e panturrilhas", () => {
    expect(getWorkoutTemplate("LEGS").map((item) => item.name)).toEqual([
      "Agachamento guiado",
      "Leg press",
      "Levantamento terra romeno",
      "Flexão de joelhos",
      "Elevação pélvica",
      "Panturrilha",
    ]);
  });

  it("PUSH usa a ficha completa, não o modelo reduzido antigo", () => {
    expect(getWorkoutTemplate("PUSH").map((item) => item.name)).toEqual([
      "Supino articulado",
      "Supino inclinado com halteres",
      "Crossover",
      "Desenvolvimento com halteres",
      "Elevação lateral",
      "Tríceps corda",
      "Crucifixo inverso no Cross",
    ]);
  });
});
