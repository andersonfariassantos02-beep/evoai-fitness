export interface TrainingCalendarEntry {
  date: string;
  available: boolean;
  completed: boolean;
  completedWasPlanned?: boolean;
}

export interface PlannedWorkoutDay {
  date: string;
  label: string;
  status: "completed" | "planned";
  adjusted: boolean;
}

export interface WeeklyTrainingPlan {
  weekStart: string;
  targetSessions: number;
  completedSessions: number;
  days: PlannedWorkoutDay[];
  message: string;
}

const DAY_IN_MS = 86_400_000;

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

export function getWeekStart(date: Date) {
  const day = date.getDay();
  return addDays(date, day === 0 ? -6 : 1 - day);
}

export function getWeekDates(date: Date) {
  const start = getWeekStart(date);
  return Array.from({ length: 7 }, (_, index) => toDateKey(addDays(start, index)));
}

export function getMonthGrid(cursor: Date) {
  const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const gridStart = getWeekStart(firstDay);
  const days = Math.ceil((lastDay.getTime() - gridStart.getTime() + DAY_IN_MS) / DAY_IN_MS / 7) * 7;

  return Array.from({ length: days }, (_, index) => addDays(gridStart, index));
}

function getSessionLabels(total: number) {
  const templates: Record<number, string[]> = {
    1: ["Full body essencial"],
    2: ["Full body A", "Full body B"],
    3: ["Superior A", "Inferiores", "Superior B"],
    4: ["Superior A", "Inferiores A", "Superior B", "Inferiores B"],
    5: ["Push", "Pull", "Legs", "Upper", "Lower"],
    6: ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"],
    7: ["Upper A", "Lower A", "Push", "Pull", "Legs", "Upper B", "Recuperação ativa"],
  };

  return templates[Math.min(Math.max(total, 1), 7)];
}

export function buildWeeklyPlan(
  entries: TrainingCalendarEntry[],
  referenceDate = new Date(),
): WeeklyTrainingPlan {
  const weekDates = getWeekDates(referenceDate);
  const weekEntries = entries
    .filter((entry) => weekDates.includes(entry.date))
    .sort((left, right) => left.date.localeCompare(right.date));
  const availableCount = weekEntries.filter((entry) => entry.available).length;
  const completed = weekEntries.filter((entry) => entry.completed);
  const completedCount = completed.length;
  const targetSessions = Math.max(availableCount, completedCount);
  const labels = targetSessions > 0 ? getSessionLabels(targetSessions) : [];
  const todayKey = toDateKey(referenceDate);
  const pendingSlots = Math.max(0, targetSessions - completedCount);
  const futureAvailable = weekEntries.filter(
    (entry) => entry.available && !entry.completed && entry.date >= todayKey,
  );
  const unplannedCompleted = completed.filter((entry) => entry.completedWasPlanned === false).length;

  const completedDays: PlannedWorkoutDay[] = completed.map((entry, index) => ({
    date: entry.date,
    label: labels[index] ?? `Treino ${index + 1}`,
    status: "completed",
    adjusted: entry.completedWasPlanned === false,
  }));

  const plannedDays: PlannedWorkoutDay[] = futureAvailable
    .slice(0, pendingSlots)
    .map((entry, index) => ({
      date: entry.date,
      label: labels[completedCount + index] ?? `Treino ${completedCount + index + 1}`,
      status: "planned",
      adjusted: unplannedCompleted > 0,
    }));

  const unscheduled = pendingSlots - plannedDays.length;
  let message = "Marque os dias em que poderá treinar para gerar a semana.";

  if (targetSessions > 0) {
    message = unscheduled > 0
      ? `${unscheduled} treino${unscheduled > 1 ? "s" : ""} ainda sem data futura. Marque outra disponibilidade.`
      : `${targetSessions} treino${targetSessions > 1 ? "s" : ""} distribuído${targetSessions > 1 ? "s" : ""} conforme sua disponibilidade.`;
  }

  if (unplannedCompleted > 0) {
    message = `Treino fora do plano registrado. Os ${pendingSlots} treino${pendingSlots !== 1 ? "s" : ""} restante${pendingSlots !== 1 ? "s" : ""} foram reorganizados.`;
  }

  return {
    weekStart: weekDates[0],
    targetSessions,
    completedSessions: completedCount,
    days: [...completedDays, ...plannedDays].sort((left, right) => left.date.localeCompare(right.date)),
    message,
  };
}

export function loadCalendarEntries(storageKey: string): TrainingCalendarEntry[] {
  try {
    const value = localStorage.getItem(storageKey);
    if (!value) return [];
    const parsed = JSON.parse(value) as TrainingCalendarEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCalendarEntries(storageKey: string, entries: TrainingCalendarEntry[]) {
  localStorage.setItem(storageKey, JSON.stringify(entries));
}
