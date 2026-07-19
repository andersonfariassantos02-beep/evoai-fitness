import { describe, expect, it } from "vitest";
import { buildWeeklyPlan, type TrainingCalendarEntry } from "./trainingCalendar";

const entries: TrainingCalendarEntry[] = [
  { date: "2026-07-20", available: true, completed: false },
  { date: "2026-07-22", available: true, completed: false },
  { date: "2026-07-24", available: true, completed: false },
  { date: "2026-07-26", available: true, completed: false },
];

describe("buildWeeklyPlan", () => {
  it("respeita a meta sem inventar disponibilidade", () => {
    const plan = buildWeeklyPlan(entries, new Date(2026, 6, 20), { weeklyTarget: 3, today: new Date(2026, 6, 19) });
    expect(plan.targetSessions).toBe(3);
    expect(plan.days.map((day) => day.date)).toEqual(["2026-07-20", "2026-07-22", "2026-07-24"]);
  });

  it("usa o objetivo e continua a rotação após o último treino", () => {
    const plan = buildWeeklyPlan(entries, new Date(2026, 6, 20), { goal: "hypertrophy", weeklyTarget: 4, lastCompletedLabel: "Superior A", today: new Date(2026, 6, 19) });
    expect(plan.days.map((day) => day.label)).toEqual(["Inferiores A", "Superior B", "Inferiores B", "Superior A"]);
  });

  it("não trata o dia selecionado no calendário como a data atual", () => {
    const entries = ["2026-07-20", "2026-07-22", "2026-07-24", "2026-07-25"]
      .map((date) => ({ date, available: true, completed: false }));
    const plan = buildWeeklyPlan(entries, new Date(2026, 6, 25), { weeklyTarget: 3, today: new Date(2026, 6, 19) });

    expect(plan.days.map((day) => day.date)).toEqual(["2026-07-20", "2026-07-22", "2026-07-24"]);
  });
});
