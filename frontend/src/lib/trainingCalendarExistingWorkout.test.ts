import { describe, expect, it } from "vitest";
import { buildWeeklyPlan } from "./trainingCalendar";

describe("sessão persistida e divisão periodizada", () => {
  it("não deixa um rótulo antigo Full body sobrescrever a divisão futura", () => {
    const plan = buildWeeklyPlan([
      { date: "2026-07-20", available: true, completed: false },
      { date: "2026-07-22", available: true, completed: false },
      { date: "2026-07-24", available: true, completed: false },
    ], new Date(2026, 6, 20), {
      today: new Date(2026, 6, 19),
      existingWorkouts: [{ date: "2026-07-22", label: "Full body A" }],
    });
    expect(plan.days.find((day) => day.date === "2026-07-22")?.label).toBe("PULL");
  });
});
