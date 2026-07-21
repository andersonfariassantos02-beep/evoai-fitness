import { describe, expect, it } from "vitest";
import { buildWeeklyPlan } from "./trainingCalendar";

describe("rótulo de sessão persistida", () => {
  it("preserva o rótulo já materializado quando a meta semanal muda", () => {
    const plan = buildWeeklyPlan([
      { date: "2026-07-20", available: true, completed: false },
      { date: "2026-07-22", available: true, completed: false },
      { date: "2026-07-24", available: true, completed: false },
      { date: "2026-07-25", available: true, completed: false },
    ], new Date(2026, 6, 20), {
      goal: "hypertrophy",
      weeklyTarget: 3,
      today: new Date(2026, 6, 21),
      existingWorkouts: [{ date: "2026-07-22", label: "Full body A" }],
    });

    expect(plan.days.map((day) => [day.date, day.label])).toEqual([
      ["2026-07-22", "Full body A"],
      ["2026-07-24", "Inferiores"],
      ["2026-07-25", "Superior B"],
    ]);
  });
});
