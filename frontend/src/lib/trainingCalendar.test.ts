import { describe, expect, it } from "vitest";
import { buildWeeklyPlan, PERIODIZED_WEEK_LABELS, type TrainingCalendarEntry } from "./trainingCalendar";

describe("buildWeeklyPlan periodizado", () => {
  const week = new Date(2026, 6, 20);
  const beforeWeek = new Date(2026, 6, 19);

  it("programa somente os dias marcados, usando a divisão correspondente ao dia da semana", () => {
    const entries: TrainingCalendarEntry[] = [
      { date: "2026-07-20", available: true, completed: false },
      { date: "2026-07-22", available: true, completed: false },
      { date: "2026-07-24", available: true, completed: false },
    ];
    const plan = buildWeeklyPlan(entries, week, { today: beforeWeek });

    expect(plan.targetSessions).toBe(3);
    expect(plan.days.map((day) => [day.date, day.label])).toEqual([
      ["2026-07-20", "PUSH"],
      ["2026-07-22", "PULL"],
      ["2026-07-24", "LEGS"],
    ]);
  });

  it("mantém exatamente PUSH pesado na segunda e QUADRÍCEPS na terça quando há cinco dias", () => {
    const plan = buildWeeklyPlan([
      { date: "2026-07-20", available: true, completed: false },
      { date: "2026-07-21", available: true, completed: false },
      { date: "2026-07-22", available: true, completed: false },
      { date: "2026-07-23", available: true, completed: false },
      { date: "2026-07-24", available: true, completed: false },
    ], week, { today: beforeWeek });
    expect(plan.days.slice(0, 2).map(({ date, label }) => [date, label])).toEqual([
      ["2026-07-20", "PUSH pesado"],
      ["2026-07-21", "QUADRÍCEPS"],
    ]);
  });

  it("preserva os rótulos reais de sessões concluídas", () => {
    const plan = buildWeeklyPlan([
      { date: "2026-07-20", available: true, completed: true, completedLabel: "Sessão histórica" },
    ], week, { today: beforeWeek });
    expect(plan.days[0]).toMatchObject({
      date: "2026-07-20", label: "Sessão histórica", status: "completed",
    });
  });

  it("não recria dias passados que não foram realizados", () => {
    const plan = buildWeeklyPlan([
      { date: "2026-07-20", available: true, completed: false },
      { date: "2026-07-22", available: true, completed: false },
      { date: "2026-07-24", available: true, completed: false },
    ], week, { today: new Date(2026, 6, 22) });
    expect(plan.days.map((day) => day.date)).toEqual(["2026-07-22", "2026-07-24"]);
  });

  it("um treino extra consome a próxima sessão e reorganiza somente o restante", () => {
    const plan = buildWeeklyPlan([
      { date: "2026-07-20", available: false, completed: true, completedWasPlanned: false, completedLabel: "PUSH" },
      { date: "2026-07-21", available: true, completed: false },
      { date: "2026-07-23", available: true, completed: false },
      { date: "2026-07-25", available: true, completed: false },
    ], week, { today: beforeWeek });

    expect(plan.targetSessions).toBe(3);
    expect(plan.days.map((day) => [day.date, day.label, day.status])).toEqual([
      ["2026-07-20", "PUSH", "completed"],
      ["2026-07-21", "PULL", "planned"],
      ["2026-07-23", "LEGS", "planned"],
    ]);
  });
});
