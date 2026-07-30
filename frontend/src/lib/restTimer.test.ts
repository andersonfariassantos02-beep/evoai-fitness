import { describe, expect, it } from "vitest";
import { findNextPendingIndex, formatRestTime, getRemainingSeconds, getRestPrescription, restoreRestTimer } from "./restTimer";

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

  it("volta ao início para localizar uma série pendente fora da ordem planejada", () => {
    expect(findNextPendingIndex([true, false, true, true], 3)).toBe(1);
    expect(findNextPendingIndex([true, true], 1)).toBe(-1);
  });
});

describe("persistência do descanso", () => {
  const stored = {
    sourceExerciseId: "exercise-1", sourceSetId: "set-1", nextSetId: "set-2",
    kind: "between_sets" as const, label: "Descanso entre séries", nextLabel: "Remada · série 2",
    targetSeconds: 120, startedAtMs: 1_000, endsAtMs: 121_000,
    remainingSeconds: 120, paused: false, ready: false,
  };

  it("recalcula pelo horário absoluto ao voltar para a página", () => {
    expect(restoreRestTimer(stored, new Set(["set-1", "set-2"]), new Set(["exercise-1"]), 61_000))
      .toMatchObject({ remainingSeconds: 60, ready: false });
  });

  it("marca como concluído se o tempo venceu fora da página", () => {
    expect(restoreRestTimer(stored, new Set(["set-1", "set-2"]), new Set(["exercise-1"]), 130_000))
      .toMatchObject({ remainingSeconds: 0, ready: true });
  });

  it("descarta um descanso que não pertence mais à sessão", () => {
    expect(restoreRestTimer(stored, new Set(["set-1"]), new Set(["exercise-1"]), 61_000)).toBeNull();
  });
});
