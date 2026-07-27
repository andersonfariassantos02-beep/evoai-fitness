import { describe, expect, it } from "vitest";
import { formatRestTime, getRemainingSeconds, getRestPrescription } from "./restTimer";

describe("temporizador de descanso", () => {
  it("prescreve tempos distintos entre séries e exercícios", () => {
    expect(getRestPrescription(90, 180, false)).toEqual({
      kind: "between_sets", seconds: 90, label: "Descanso entre séries",
    });
    expect(getRestPrescription(90, 180, true)).toEqual({
      kind: "between_exercises", seconds: 180, label: "Descanso entre exercícios",
    });
  });

  it("mantém limites seguros para valores inválidos", () => {
    expect(getRestPrescription(0, 0, false).seconds).toBe(120);
    expect(getRestPrescription(15, 900, false).seconds).toBe(30);
    expect(getRestPrescription(15, 900, true).seconds).toBe(600);
  });

  it("calcula pelo horário final e formata o relógio", () => {
    expect(getRemainingSeconds(12_000, 1_500)).toBe(11);
    expect(getRemainingSeconds(1_000, 2_000)).toBe(0);
    expect(formatRestTime(125)).toBe("2:05");
  });
});
