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

  it("distribui os treinos preservando recuperação quando há disponibilidade", () => {
    const available = ["2026-07-20", "2026-07-21", "2026-07-22", "2026-07-23", "2026-07-24"]
      .map((date) => ({ date, available: true, completed: false }));
    const plan = buildWeeklyPlan(available, new Date(2026, 6, 20), {
      weeklyTarget: 3,
      minimumRecoveryDays: 1,
      today: new Date(2026, 6, 19),
    });

    expect(plan.days.map((day) => day.date)).toEqual(["2026-07-20", "2026-07-22", "2026-07-24"]);
    expect(plan.recoveryCompromised).toBe(false);
  });

  it("prioriza a disponibilidade e sinaliza quando a recuperação ideal não cabe", () => {
    const available = ["2026-07-20", "2026-07-21"]
      .map((date) => ({ date, available: true, completed: false }));
    const plan = buildWeeklyPlan(available, new Date(2026, 6, 20), {
      weeklyTarget: 2,
      minimumRecoveryDays: 1,
      today: new Date(2026, 6, 19),
    });

    expect(plan.days.map((day) => day.date)).toEqual(["2026-07-20", "2026-07-21"]);
    expect(plan.recoveryCompromised).toBe(true);
    expect(plan.message).toContain("disponibilidade foi priorizada");
  });

  it("preserva treinos concluídos ao distribuir as sessões restantes", () => {
    const available: TrainingCalendarEntry[] = [
      { date: "2026-07-20", available: true, completed: true },
      ...["2026-07-21", "2026-07-22", "2026-07-23", "2026-07-24"]
        .map((date) => ({ date, available: true, completed: false })),
    ];
    const plan = buildWeeklyPlan(available, new Date(2026, 6, 20), {
      weeklyTarget: 3,
      minimumRecoveryDays: 1,
      today: new Date(2026, 6, 19),
    });

    expect(plan.days.map((day) => [day.date, day.status])).toEqual([
      ["2026-07-20", "completed"],
      ["2026-07-22", "planned"],
      ["2026-07-24", "planned"],
    ]);
  });

  it("consome a próxima sessão fora do plano e redistribui apenas o restante", () => {
    const adaptive: TrainingCalendarEntry[] = [
      { date: "2026-07-20", available: true, completed: false },
      { date: "2026-07-21", available: false, completed: true, completedWasPlanned: false, completedLabel: "Superior A" },
      { date: "2026-07-22", available: true, completed: false },
      { date: "2026-07-24", available: true, completed: false },
    ];
    const plan = buildWeeklyPlan(adaptive, new Date(2026, 6, 20), {
      weeklyTarget: 3, today: new Date(2026, 6, 21), minimumRecoveryDays: 0,
    });

    expect(plan.days.map((day) => [day.date, day.label, day.status])).toEqual([
      ["2026-07-21", "Superior A", "completed"],
      ["2026-07-22", "Inferiores", "planned"],
      ["2026-07-24", "Superior B", "planned"],
    ]);
    expect(plan.days.find((day) => day.date === "2026-07-20")).toBeUndefined();
    expect(plan.message).toContain("fora do plano");
  });

  it("mantém os rótulos reais de todo o histórico concluído", () => {
    const plan = buildWeeklyPlan([
      { date: "2026-07-20", available: true, completed: true, completedLabel: "Sessão original A" },
      { date: "2026-07-21", available: false, completed: true, completedWasPlanned: false, completedLabel: "Sessão original B" },
      { date: "2026-07-23", available: true, completed: false },
    ], new Date(2026, 6, 20), { weeklyTarget: 3, today: new Date(2026, 6, 21), minimumRecoveryDays: 0 });

    expect(plan.days.filter((day) => day.status === "completed").map((day) => day.label))
      .toEqual(["Sessão original A", "Sessão original B"]);
  });
});
