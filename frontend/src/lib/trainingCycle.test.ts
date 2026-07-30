import { describe, expect, it } from "vitest";
import { calculateTrainingCycleProgress } from "./trainingCycle";

describe("ciclo de treino", () => {
  it("calcula semana, meta total e progresso sem ultrapassar os limites", () => {
    expect(calculateTrainingCycleProgress(
      { startsOn: "2026-07-27", durationWeeks: 6, targetSessionsPerWeek: 3 },
      5,
      new Date(2026, 7, 10),
    )).toMatchObject({
      currentWeek: 3,
      totalTargetSessions: 18,
      completedSessions: 5,
      progressPercent: 28,
      endsOn: "2026-09-06",
      completed: false,
    });
  });

  it("mantém a primeira semana antes do início e limita o progresso a 100%", () => {
    const progress = calculateTrainingCycleProgress(
      { startsOn: "2026-08-03", durationWeeks: 4, targetSessionsPerWeek: 2 },
      10,
      new Date(2026, 7, 1),
    );
    expect(progress.currentWeek).toBe(1);
    expect(progress.progressPercent).toBe(100);
  });
});
