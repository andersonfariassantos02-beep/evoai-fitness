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

  it("um treino fora do plano consome a próxima sessão sem aumentar a meta semanal", () => {
    const plan = buildWeeklyPlan([
      { date: "2026-07-20", available: false, completed: true, completedWasPlanned: false, completedLabel: "PUSH" },
      { date: "2026-07-21", available: true, completed: false },
      { date: "2026-07-23", available: true, completed: false },
      { date: "2026-07-25", available: true, completed: false },
    ], week, { today: beforeWeek, lastCompletedLabel: "PUSH" });

    expect(plan.targetSessions).toBe(3);
    expect(plan.days.map((day) => [day.date, day.status])).toEqual([
      ["2026-07-20", "completed"],
      ["2026-07-21", "planned"],
      ["2026-07-23", "planned"],
    ]);
    expect(plan.days.map((day) => day.label)).toEqual(["PUSH", "PULL", "LEGS"]);
  });

  it("conta treino legado concluído junto com os dias futuros disponíveis", () => {
    const plan = buildWeeklyPlan([
      { date: "2026-07-27", available: false, completed: true, completedLabel: "PUSH" },
      { date: "2026-07-29", available: true, completed: false },
      { date: "2026-07-31", available: true, completed: false },
    ], new Date(2026, 6, 27), { today: new Date(2026, 6, 28) });

    expect(plan.targetSessions).toBe(3);
    expect(plan.days.map((day) => [day.date, day.status])).toEqual([
      ["2026-07-27", "completed"],
      ["2026-07-29", "planned"],
      ["2026-07-31", "planned"],
    ]);
  });

  it("não pula duas posições ao continuar a sequência da última sessão", () => {
    const plan = buildWeeklyPlan([
      { date: "2026-07-27", available: true, completed: true, completedLabel: "PUSH" },
      { date: "2026-07-29", available: true, completed: false },
      { date: "2026-07-31", available: true, completed: false },
    ], new Date(2026, 6, 27), {
      today: new Date(2026, 6, 27),
      lastCompletedLabel: "PUSH",
    });

    expect(plan.days.map((day) => day.label)).toEqual(["PUSH", "PULL", "LEGS"]);
  });

  it("prioriza o foco sem retirar nenhum bloco muscular da semana", () => {
    const entries: TrainingCalendarEntry[] = [
      { date: "2026-07-20", available: true, completed: false },
      { date: "2026-07-22", available: true, completed: false },
      { date: "2026-07-24", available: true, completed: false },
    ];
    const plan = buildWeeklyPlan(entries, week, { today: beforeWeek, trainingFocus: ["legs"] });
    expect(plan.days.map((day) => day.label)).toEqual(["LEGS", "PUSH", "PULL"]);
  });
});
