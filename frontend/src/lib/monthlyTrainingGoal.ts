export type MonthlyGoalStatus = "unset" | "on_track" | "attention" | "completed";

export interface MonthlyTrainingGoal {
  targetSessions: number;
  completedSessions: number;
  remainingSessions: number;
  progressPercent: number;
  status: MonthlyGoalStatus;
  title: string;
  message: string;
}

export function monthDateRange(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const key = (day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { startDate: key(1), endDate: key(lastDay), daysInMonth: lastDay };
}

export function buildMonthlyTrainingGoal(availableDates: string[], completedDates: string[], month: Date, today: Date): MonthlyTrainingGoal {
  const { startDate, endDate, daysInMonth } = monthDateRange(month);
  const inMonth = (date: string) => date >= startDate && date <= endDate;
  const targetSessions = new Set(availableDates.filter(inMonth)).size;
  const completedSessions = new Set(completedDates.filter(inMonth)).size;
  const remainingSessions = Math.max(0, targetSessions - completedSessions);
  const progressPercent = targetSessions > 0 ? Math.min(100, Math.round(completedSessions / targetSessions * 100)) : 0;

  if (!targetSessions) return {
    targetSessions, completedSessions, remainingSessions, progressPercent, status: "unset",
    title: "Defina sua meta no calendário",
    message: "Marque os dias disponíveis deste mês para criar uma meta realista.",
  };
  if (completedSessions >= targetSessions) return {
    targetSessions, completedSessions, remainingSessions, progressPercent, status: "completed",
    title: "Meta mensal concluída",
    message: completedSessions > targetSessions
      ? `Você superou a meta em ${completedSessions - targetSessions} treino(s).`
      : "Todos os treinos planejados para o mês foram realizados.",
  };

  const sameMonth = today.getFullYear() === month.getFullYear() && today.getMonth() === month.getMonth();
  const elapsedRatio = sameMonth ? Math.min(1, today.getDate() / daysInMonth) : today > month ? 1 : 0;
  const status: MonthlyGoalStatus = completedSessions + 0.75 < targetSessions * elapsedRatio ? "attention" : "on_track";
  return {
    targetSessions, completedSessions, remainingSessions, progressPercent, status,
    title: status === "attention" ? "Consistência abaixo do planejado" : "Ritmo mensal adequado",
    message: status === "attention"
      ? `Faltam ${remainingSessions} treino(s). Ajuste os próximos dias disponíveis sem compensar com excesso.`
      : `Faltam ${remainingSessions} treino(s) para cumprir o que você marcou no calendário.`,
  };
}
