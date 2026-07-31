import type { TrainingGoal } from "../services/profileRestrictionService";
import type { MuscleRecovery } from "./muscleRecovery";
import type { MuscleVolumeSummary } from "./trainingVolume";
import { summarizePlannedMuscleVolume } from "./trainingVolume";
import { getWorkoutTemplate, type MuscleGroup } from "./workoutTemplates";

export interface WeeklyPlanAnalysisDay {
  date: string;
  label: string;
}

export interface WeeklySessionMetric extends WeeklyPlanAnalysisDay {
  estimatedMinutes: number;
  validSets: number;
}

export interface WeeklyMuscleMetric {
  muscle: MuscleGroup;
  plannedSets: number;
  completedSets: number;
  totalSets: number;
  targetSets: number;
  percentage: number;
  status: "missing" | "low" | "balanced" | "high";
}

export interface WeeklyPlanAlert {
  id: string;
  level: "info" | "warning" | "blocking";
  message: string;
}

export interface WeeklyPlanAnalysis {
  sessions: WeeklySessionMetric[];
  estimatedMinutes: number;
  validSets: number;
  muscles: WeeklyMuscleMetric[];
  alerts: WeeklyPlanAlert[];
  canConfirm: boolean;
}

const IMPORTANT_MUSCLES: MuscleGroup[] = [
  "peito", "costas", "ombros", "quadriceps", "posteriores",
  "gluteos", "panturrilhas", "biceps", "triceps",
];

const WEEKLY_TARGETS: Record<TrainingGoal, Partial<Record<MuscleGroup, number>>> = {
  general_fitness: { peito: 8, costas: 8, ombros: 6, quadriceps: 8, posteriores: 6, gluteos: 6, panturrilhas: 4, biceps: 4, triceps: 4 },
  weight_loss: { peito: 8, costas: 8, ombros: 6, quadriceps: 8, posteriores: 6, gluteos: 6, panturrilhas: 4, biceps: 4, triceps: 4 },
  hypertrophy: { peito: 10, costas: 10, ombros: 8, quadriceps: 10, posteriores: 8, gluteos: 8, panturrilhas: 6, biceps: 6, triceps: 6 },
  strength: { peito: 8, costas: 8, ombros: 6, quadriceps: 8, posteriores: 6, gluteos: 6, panturrilhas: 4, biceps: 4, triceps: 4 },
  conditioning: { peito: 6, costas: 6, ombros: 4, quadriceps: 6, posteriores: 5, gluteos: 5, panturrilhas: 4, biceps: 4, triceps: 4 },
};

function estimateSession(label: string): WeeklySessionMetric {
  const exercises = getWorkoutTemplate(label);
  const validSets = exercises.reduce((total, exercise) => total + exercise.sets, 0);
  const seconds = exercises.reduce((total, exercise) => (
    total
    + exercise.sets * 45
    + Math.max(0, exercise.sets - 1) * (exercise.restSeconds ?? 90)
    + (exercise.transitionRestSeconds ?? 120)
  ), 0);
  return {
    date: "",
    label,
    validSets,
    estimatedMinutes: Math.max(1, Math.round(seconds / 60)),
  };
}

function directSets(summary: MuscleVolumeSummary[], muscle: MuscleGroup) {
  return summary.find((item) => item.muscle === muscle)?.directSets ?? 0;
}

function dayDistance(left: string, right: string) {
  return Math.round(Math.abs(new Date(`${left}T12:00:00`).getTime() - new Date(`${right}T12:00:00`).getTime()) / 86_400_000);
}

export function analyzeWeeklyPlan(
  days: WeeklyPlanAnalysisDay[],
  goal: TrainingGoal,
  completedVolume: MuscleVolumeSummary[] = [],
  recovery: MuscleRecovery[] = [],
): WeeklyPlanAnalysis {
  const sessions = days.map((day) => ({ ...estimateSession(day.label), ...day }));
  const plannedVolume = summarizePlannedMuscleVolume(days.map((day) => day.label));
  const muscles = IMPORTANT_MUSCLES.map((muscle) => {
    const plannedSets = directSets(plannedVolume, muscle);
    const completedSets = directSets(completedVolume, muscle);
    const totalSets = plannedSets + completedSets;
    const targetSets = WEEKLY_TARGETS[goal][muscle] ?? 6;
    const percentage = Math.round((totalSets / targetSets) * 100);
    const status: WeeklyMuscleMetric["status"] = totalSets === 0
      ? "missing"
      : percentage < 70
        ? "low"
        : percentage > 150
          ? "high"
          : "balanced";
    return { muscle, plannedSets, completedSets, totalSets, targetSets, percentage, status };
  });

  const alerts: WeeklyPlanAlert[] = [];
  if (!days.length) {
    alerts.push({ id: "no-days", level: "blocking", message: "Nenhum dia disponível foi selecionado para esta semana." });
  }
  const missing = muscles.filter((item) => item.status === "missing").map((item) => item.muscle);
  if (missing.length) {
    alerts.push({ id: "missing-muscles", level: "warning", message: `${missing.length} grupo(s) muscular(es) ainda estão sem estímulo direto.` });
  }
  const high = muscles.filter((item) => item.status === "high").map((item) => item.muscle);
  if (high.length) {
    alerts.push({ id: "high-volume", level: "warning", message: `${high.length} grupo(s) ultrapassam 150% da referência semanal. Revise antes de confirmar.` });
  }

  for (let index = 1; index < sessions.length; index += 1) {
    const previous = sessions[index - 1];
    const current = sessions[index];
    if (dayDistance(previous.date, current.date) >= 2) continue;
    const previousMuscles = new Set(getWorkoutTemplate(previous.label).map((exercise) => exercise.muscle));
    const overlap = getWorkoutTemplate(current.label).some((exercise) => previousMuscles.has(exercise.muscle));
    if (overlap) {
      alerts.push({
        id: `recovery-${previous.date}-${current.date}`,
        level: "warning",
        message: `${previous.label} e ${current.label} estão em dias consecutivos e compartilham musculatura.`,
      });
    }
  }

  const recoveringPlanned = recovery.filter((item) => (
    item.status === "recovering"
    && plannedVolume.some((volume) => volume.muscle === item.muscle && volume.directSets > 0)
  ));
  if (recoveringPlanned.length) {
    alerts.push({
      id: "current-recovery",
      level: "info",
      message: `${recoveringPlanned.length} grupo(s) ainda aparecem em recuperação hoje; a situação será reavaliada no check-in do treino.`,
    });
  }
  if (!alerts.some((alert) => alert.level !== "info")) {
    alerts.push({ id: "balanced", level: "info", message: "A distribuição semanal está equilibrada para os dias selecionados." });
  }

  return {
    sessions,
    estimatedMinutes: sessions.reduce((total, session) => total + session.estimatedMinutes, 0),
    validSets: sessions.reduce((total, session) => total + session.validSets, 0),
    muscles,
    alerts,
    canConfirm: days.length > 0 && !alerts.some((alert) => alert.level === "blocking"),
  };
}
