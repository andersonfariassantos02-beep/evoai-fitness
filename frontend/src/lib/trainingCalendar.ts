export interface TrainingCalendarEntry {
  date: string;
  available: boolean;
  completed: boolean;
  completedWasPlanned?: boolean;
  /** Divisão confirmada pelo atleta para esta data. */
  plannedLabel?: string;
  /** Rótulo imutável vindo da sessão concluída, quando existir. */
  completedLabel?: string;
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
  recoveryCompromised: boolean;
}

export type TrainingGoal = "general_fitness" | "weight_loss" | "hypertrophy" | "strength" | "conditioning";
export type TrainingFocus = "full_body" | "glutes" | "legs" | "chest" | "back" | "shoulders" | "arms" | "core";

export interface WeeklyPlanOptions {
  goal?: TrainingGoal;
  trainingFocus?: TrainingFocus[];
  lastCompletedLabel?: string | null;
  existingWorkouts?: Array<{ date: string; label: string }>;
  today?: Date;
  minimumRecoveryDays?: number;
}

export interface WeeklyPlanPreviewDay {
  date: string;
  label: string;
  reason: string;
}

export interface WeeklyPlanPreview {
  weekStart: string;
  days: WeeklyPlanPreviewDay[];
  summary: string;
  recoveryAdjustment: "normal" | "attention" | "deload";
}

const DAY_IN_MS = 86_400_000;

export const PERIODIZED_WEEK_LABELS = [
  "PUSH pesado",
  "QUADRÍCEPS",
  "PULL",
  "POSTERIOR",
  "PUSH leve/moderado",
] as const;

export function getAdaptiveWeekLabels(total: number, focus: TrainingFocus[] = []): string[] {
  const divisions: Record<number, string[]> = {
    1: ["Full body essencial"],
    2: ["SUPERIOR", "INFERIORES"],
    3: ["PUSH", "PULL", "LEGS"],
    4: ["SUPERIOR A", "INFERIORES A", "SUPERIOR B", "INFERIORES B"],
    5: [...PERIODIZED_WEEK_LABELS],
    6: ["PUSH A", "PULL A", "LEGS A", "PUSH B", "PULL B", "LEGS B"],
    7: ["PUSH A", "PULL A", "LEGS A", "PUSH B", "PULL B", "LEGS B", "Recuperação ativa"],
  };
  const labels = divisions[Math.min(Math.max(total, 1), 7)];
  if (total !== 3) return labels;
  if (focus.some((item) => item === "glutes" || item === "legs")) return ["LEGS", "PUSH", "PULL"];
  if (focus.includes("back")) return ["PULL", "LEGS", "PUSH"];
  if (focus.some((item) => item === "chest" || item === "shoulders" || item === "arms")) return ["PUSH", "LEGS", "PULL"];
  return labels;
}

function dateDistance(left: string, right: string): number {
  return Math.abs(fromDateKey(left).getTime() - fromDateKey(right).getTime()) / DAY_IN_MS;
}

function defaultRecoveryDays(goal: TrainingGoal): number {
  return goal === "conditioning" ? 0 : 1;
}

function selectRecoveryAwareDates(
  candidates: TrainingCalendarEntry[],
  slots: number,
  occupiedDates: string[],
  minimumRecoveryDays: number,
): { selected: TrainingCalendarEntry[]; compromised: boolean } {
  if (slots <= 0) {
    return { selected: [], compromised: false };
  }

  const selected: TrainingCalendarEntry[] = [];

  for (const candidate of candidates) {
    const references = [...occupiedDates, ...selected.map((entry) => entry.date)];
    const hasRecovery = references.every(
      (date) => dateDistance(candidate.date, date) > minimumRecoveryDays,
    );

    if (hasRecovery) {
      selected.push(candidate);
    }

    if (selected.length === slots) {
      return { selected, compromised: false };
    }
  }

  const preferredCount = selected.length;

  for (const candidate of candidates) {
    if (!selected.some((entry) => entry.date === candidate.date)) {
      selected.push(candidate);
    }

    if (selected.length === slots) {
      break;
    }
  }

  return { selected, compromised: selected.length > preferredCount };
}

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

function getGeneralLabels(total: number) {
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

function getGoalLabels(total: number, goal: TrainingGoal, focus: TrainingFocus[] = ["full_body"]) {
  if (focus.some((item) => item === "glutes" || item === "legs") && total >= 3) {
    return ["Inferiores A", "Superior A", "Inferiores B", "Superior B", "Inferiores C", "Superior C", "Full body C"].slice(0, total);
  }
  if (focus.includes("back") && total >= 3) {
    return ["Pull A", "Inferiores A", "Push A", "Pull B", "Inferiores B", "Push B", "Full body C"].slice(0, total);
  }
  if (focus.some((item) => item === "chest" || item === "shoulders" || item === "arms") && total >= 3) {
    return ["Push A", "Inferiores A", "Pull A", "Push B", "Inferiores B", "Pull B", "Full body C"].slice(0, total);
  }
  if (goal === "hypertrophy" && total >= 4) {
    return ["Superior A", "Inferiores A", "Superior B", "Inferiores B", "Full body C", "Superior C", "Inferiores C"].slice(0, total);
  }
  if (goal === "strength") {
    return ["Full body A", "Full body B", "Inferiores A", "Superior A", "Full body C", "Inferiores B", "Superior B"].slice(0, total);
  }
  if (goal === "conditioning" || goal === "weight_loss") {
    return ["Full body A", "Recuperação ativa", "Full body B", "Recuperação ativa", "Full body C", "Superior A", "Inferiores A"].slice(0, total);
  }
  return getGeneralLabels(total);
}

function rotateAfterLastCompleted(labels: string[], lastCompletedLabel?: string | null) {
  if (!lastCompletedLabel || labels.length < 2) return labels;
  const lastIndex = labels.findIndex((label) => label === lastCompletedLabel);
  if (lastIndex < 0) return labels;
  const next = (lastIndex + 1) % labels.length;
  return [...labels.slice(next), ...labels.slice(0, next)];
}

export function buildWeeklyPlan(
  entries: TrainingCalendarEntry[],
  referenceDate = new Date(),
  options: WeeklyPlanOptions = {},
): WeeklyTrainingPlan {
  const weekDates = getWeekDates(referenceDate);
  const weekEntries = entries
    .filter((entry) => weekDates.includes(entry.date))
    .sort((left, right) => left.date.localeCompare(right.date));
  const completed = weekEntries.filter((entry) => entry.completed);
  const completedCount = completed.length;
  const availableDates = weekEntries.filter((entry) => entry.available);
  const completedDates = new Set(completed.map((entry) => entry.date));
  const pendingAvailableDates = availableDates.filter((entry) => !completedDates.has(entry.date));
  const targetSessions = completedCount + pendingAvailableDates.length;
  const labels = targetSessions > 0
    ? getAdaptiveWeekLabels(targetSessions, options.trainingFocus)
    : [];
  const pendingSequence = options.lastCompletedLabel
    ? rotateAfterLastCompleted(labels, options.lastCompletedLabel)
    : labels.slice(completedCount);
  const todayKey = toDateKey(options.today ?? new Date());
  const unplannedCompleted = completed.filter((entry) => entry.completedWasPlanned === false).length;

  const completedDays: PlannedWorkoutDay[] = completed.map((entry, index) => ({
    date: entry.date,
    label: entry.completedLabel
      ?? labels[index]
      ?? `Treino ${index + 1}`,
    status: "completed",
    adjusted: entry.completedWasPlanned === false,
  }));

  const pendingSlots = Math.max(0, targetSessions - completedCount);
  const plannedDays: PlannedWorkoutDay[] = pendingAvailableDates
    .filter((entry) => entry.date >= todayKey)
    .slice(0, pendingSlots)
    .map((entry, index) => ({
      date: entry.date,
      label: entry.plannedLabel
        ?? pendingSequence[index]
        ?? `Treino ${completedCount + index + 1}`,
      status: "planned",
      adjusted: unplannedCompleted > 0,
    }));

  let message = targetSessions > 0
    ? `${targetSessions} treino${targetSessions === 1 ? "" : "s"} programado${targetSessions === 1 ? "" : "s"} nos dias disponíveis, seguindo a divisão periodizada.`
    : "Marque no calendário os dias em que poderá treinar.";

  if (unplannedCompleted > 0) {
    message += " O treino realizado fora do plano foi preservado no histórico.";
  }

  return {
    weekStart: weekDates[0],
    targetSessions,
    completedSessions: completedCount,
    days: [...completedDays, ...plannedDays].sort((left, right) => left.date.localeCompare(right.date)),
    message,
    recoveryCompromised: false,
  };
}

const FOCUS_LABELS: Record<TrainingFocus, string> = {
  full_body: "corpo inteiro",
  glutes: "glúteos",
  legs: "pernas",
  chest: "peito",
  back: "costas",
  shoulders: "ombros",
  arms: "braços",
  core: "core",
};

export function buildWeeklyPlanPreview(
  entries: TrainingCalendarEntry[],
  referenceDate: Date,
  options: WeeklyPlanOptions & {
    fatigueLevel?: "normal" | "attention" | "deload";
    lowCoverageMuscles?: string[];
  } = {},
): WeeklyPlanPreview {
  const plan = buildWeeklyPlan(entries, referenceDate, options);
  const focus = options.trainingFocus?.filter((item) => item !== "full_body") ?? [];
  const focusReason = focus.length
    ? `prioriza ${focus.map((item) => FOCUS_LABELS[item]).join(" e ")} conforme seu perfil`
    : "mantém cobertura equilibrada do corpo inteiro";
  const deficitReason = options.lowCoverageMuscles?.length
    ? ` e considera menor cobertura recente de ${options.lowCoverageMuscles.join(" e ")}`
    : "";
  const recoveryAdjustment = options.fatigueLevel ?? "normal";
  const recoveryReason = recoveryAdjustment === "deload"
    ? " Volume e esforço serão reduzidos pela semana de deload."
    : recoveryAdjustment === "attention"
      ? " A intensidade será conservadora por sinais recentes de fadiga."
      : "";

  return {
    weekStart: plan.weekStart,
    days: plan.days
      .filter((day) => day.status === "planned")
      .map((day, index) => ({
        date: day.date,
        label: day.label,
        reason: `${index + 1}ª sessão da divisão para ${plan.targetSessions} dia(s): ${focusReason}${deficitReason}.${recoveryReason}`,
      })),
    summary: plan.targetSessions
      ? `Prévia com ${plan.targetSessions} treino${plan.targetSessions === 1 ? "" : "s"}, limitada aos dias que você marcou como disponíveis.`
      : "Marque os dias disponíveis da próxima semana para gerar a prévia.",
    recoveryAdjustment,
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
