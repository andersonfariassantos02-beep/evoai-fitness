import type { ReadinessAssessment, ReadinessCheckIn } from "./readiness";
import { calculateDynamicRest, calculateTransitionRest, type MuscleGroup } from "./exerciseTaxonomy";
import type { TrainingGoal } from "../services/profileRestrictionService";
import type { MuscleVolumeSummary } from "./trainingVolume";
import type { WorkoutExerciseTemplate } from "./workoutTemplates";

export interface PrescriptionDeload {
  volumeReductionPercent: number;
  targetRpeMin: number;
  targetRpeMax: number;
}

export interface IntelligentPrescriptionContext {
  goal: TrainingGoal;
  readiness: ReadinessCheckIn;
  readinessAssessment: ReadinessAssessment;
  completedWeeklyVolume?: MuscleVolumeSummary[];
  deload?: PrescriptionDeload | null;
}

export interface IntelligentPrescriptionResult {
  exercises: WorkoutExerciseTemplate[];
  summary: string;
  reasons: string[];
  estimatedMinutes: number;
  originalSets: number;
  plannedSets: number;
  targetRpe: number;
  restRange: { min: number; max: number };
  adjustment: "normal" | "expanded" | "reduced" | "deload";
}

const WEEKLY_DIRECT_SET_TARGET: Record<TrainingGoal, Partial<Record<MuscleGroup, number>>> = {
  general_fitness: { peito: 8, costas: 8, ombros: 6, quadriceps: 8, posteriores: 6, gluteos: 6, panturrilhas: 4, biceps: 4, triceps: 4, core: 4 },
  weight_loss: { peito: 8, costas: 8, ombros: 6, quadriceps: 8, posteriores: 6, gluteos: 6, panturrilhas: 4, biceps: 4, triceps: 4, core: 4 },
  hypertrophy: { peito: 10, costas: 10, ombros: 8, quadriceps: 10, posteriores: 8, gluteos: 8, panturrilhas: 6, biceps: 6, triceps: 6, core: 4 },
  strength: { peito: 8, costas: 8, ombros: 6, quadriceps: 8, posteriores: 6, gluteos: 6, panturrilhas: 4, biceps: 4, triceps: 4, core: 4 },
  conditioning: { peito: 6, costas: 6, ombros: 4, quadriceps: 6, posteriores: 5, gluteos: 5, panturrilhas: 4, biceps: 4, triceps: 4, core: 4 },
};

function targetRpe(goal: TrainingGoal, context: IntelligentPrescriptionContext) {
  if (context.deload) return Math.round((context.deload.targetRpeMin + context.deload.targetRpeMax) / 2);
  if (context.readinessAssessment.level === "caution") return 7;
  if (goal === "strength") return 8;
  if (goal === "conditioning" || goal === "weight_loss") return 7;
  return 8;
}

function goalRepRange(exercise: WorkoutExerciseTemplate, goal: TrainingGoal) {
  const isolatedMovements = new Set([
    "aducao-horizontal", "abducao-horizontal", "abducao-ombro", "flexionar-joelho",
    "estender-joelho", "abduzir-quadril", "flexao-plantar", "flexionar-cotovelo",
    "estender-cotovelo", "panturrilha", "isolar-braco",
  ]);
  const compound = exercise.mechanics === "composto"
    || (!exercise.mechanics && !isolatedMovements.has(exercise.movement));
  if (goal === "strength") return compound ? { min: 4, max: 6 } : { min: 8, max: 12 };
  if (goal === "hypertrophy") return compound ? { min: 6, max: 10 } : { min: 10, max: 15 };
  if (goal === "conditioning" || goal === "weight_loss") return { min: 12, max: compound ? 15 : 20 };
  return compound ? { min: 8, max: 12 } : { min: 10, max: 15 };
}

function completedDirectSets(muscle: MuscleGroup, completed: MuscleVolumeSummary[]) {
  return completed.find((item) => item.muscle === muscle)?.directSets ?? 0;
}

function weeklySetTarget(goal: TrainingGoal, muscle: MuscleGroup, availableMinutes: number) {
  const baseTarget = WEEKLY_DIRECT_SET_TARGET[goal][muscle] ?? 6;
  return availableMinutes >= 75 ? Math.ceil(baseTarget * 1.25) : baseTarget;
}

function volumeMultiplier(context: IntelligentPrescriptionContext) {
  if (context.deload) return Math.max(.4, 1 - context.deload.volumeReductionPercent / 100);
  if (context.readinessAssessment.reduceVolume) return .7;
  return 1;
}

function estimateMinutes(exercises: WorkoutExerciseTemplate[]) {
  const seconds = exercises.reduce((total, exercise) => {
    const activeWork = exercise.sets * 45;
    const rests = Math.max(0, exercise.sets - 1) * (exercise.restSeconds ?? 90);
    return total + activeWork + rests + (exercise.transitionRestSeconds ?? 120);
  }, 0);
  return Math.max(1, Math.round(seconds / 60));
}

export function buildIntelligentPrescription(
  templates: WorkoutExerciseTemplate[],
  context: IntelligentPrescriptionContext,
): IntelligentPrescriptionResult {
  const originalSets = templates.reduce((total, exercise) => total + exercise.sets, 0);
  const completed = context.completedWeeklyVolume ?? [];
  const multiplier = volumeMultiplier(context);
  const rpe = targetRpe(context.goal, context);
  const reasons: string[] = [];

  if (context.deload) reasons.push(`Deload ativo: volume reduzido em ${context.deload.volumeReductionPercent}% e RPE alvo ${context.deload.targetRpeMin}–${context.deload.targetRpeMax}.`);
  else if (context.readinessAssessment.reduceVolume) reasons.push("Volume reduzido pelo check-in de recuperação, preservando exercícios e ordem.");
  if (context.goal === "strength") reasons.push("Faixas de repetição priorizam força nos exercícios compostos.");
  else if (context.goal === "hypertrophy") reasons.push("Faixas de repetição priorizam hipertrofia com volume moderado.");
  else if (context.goal === "conditioning" || context.goal === "weight_loss") reasons.push("Faixas de repetição priorizam densidade de treino e condicionamento.");

  const exercises = templates.map((exercise) => {
    const target = WEEKLY_DIRECT_SET_TARGET[context.goal][exercise.muscle] ?? 6;
    const alreadyCompleted = completedDirectSets(exercise.muscle, completed);
    const weeklyTargetReached = alreadyCompleted >= target;
    const setRepRanges = exercise.setRepRanges?.length ? exercise.setRepRanges : undefined;
    const range = setRepRanges ? { min: exercise.repsMin, max: exercise.repsMax } : goalRepRange(exercise, context.goal);
    let sets = exercise.prescriptionLocked ? exercise.sets : Math.max(2, Math.round(exercise.sets * multiplier));

    if (!exercise.prescriptionLocked && !context.deload && weeklyTargetReached && sets > 2) {
      sets -= 1;
      const reason = `${exercise.muscle}: meta semanal já atingida; uma série foi retirada para controlar fadiga.`;
      if (!reasons.includes(reason)) reasons.push(reason);
    }

    const slicedRanges = setRepRanges?.slice(0, sets);
    const effectiveMax = slicedRanges?.reduce((maximum, item) => Math.max(maximum, item.max), 0) || range.max;
    const restSeconds = calculateDynamicRest({
      mechanics: exercise.mechanics,
      systemicDemand: exercise.systemicDemand,
      stabilityDemand: exercise.stabilityDemand,
      repsMax: effectiveMax,
      targetRpe: rpe,
    }) + (context.readinessAssessment.level === "caution" ? 15 : 0);

    return {
      ...exercise,
      sets,
      repsMin: exercise.prescriptionLocked ? exercise.repsMin : range.min,
      repsMax: exercise.prescriptionLocked ? exercise.repsMax : range.max,
      setRepRanges: slicedRanges,
      targetRpe: rpe,
      restSeconds: Math.min(240, restSeconds),
      transitionRestSeconds: calculateTransitionRest(Math.min(240, restSeconds)),
    };
  });

  let estimatedMinutes = estimateMinutes(exercises);
  if (!context.deload && context.readinessAssessment.level === "ready" && context.readiness.availableMinutes >= 60) {
    const maximumSessionMinutes = Math.max(1, context.readiness.availableMinutes - 10);
    const initialSetsByKey = new Map(exercises.map((exercise) => [exercise.key, exercise.sets]));
    const plannedByMuscle = new Map<MuscleGroup, number>();
    exercises.forEach((exercise) => {
      plannedByMuscle.set(
        exercise.muscle,
        (plannedByMuscle.get(exercise.muscle) ?? completedDirectSets(exercise.muscle, completed)) + exercise.sets,
      );
    });

    let addedSets = 0;
    let changed = true;
    while (changed && estimatedMinutes < maximumSessionMinutes) {
      changed = false;
      const candidates = exercises
        .filter((exercise) => {
          const target = weeklySetTarget(context.goal, exercise.muscle, context.readiness.availableMinutes);
          const current = plannedByMuscle.get(exercise.muscle) ?? 0;
          const initialSets = initialSetsByKey.get(exercise.key) ?? exercise.sets;
          return !exercise.prescriptionLocked && current < target && exercise.sets < initialSets + 2;
        })
        .sort((left, right) => {
          const leftTarget = weeklySetTarget(context.goal, left.muscle, context.readiness.availableMinutes);
          const rightTarget = weeklySetTarget(context.goal, right.muscle, context.readiness.availableMinutes);
          const leftDeficit = leftTarget - (plannedByMuscle.get(left.muscle) ?? 0);
          const rightDeficit = rightTarget - (plannedByMuscle.get(right.muscle) ?? 0);
          return rightDeficit / rightTarget - leftDeficit / leftTarget
            || Number(left.mechanics !== "isolado") - Number(right.mechanics !== "isolado");
        });

      for (const candidate of candidates) {
        const target = weeklySetTarget(context.goal, candidate.muscle, context.readiness.availableMinutes);
        if ((plannedByMuscle.get(candidate.muscle) ?? 0) >= target) continue;
        candidate.sets += 1;
        const nextEstimate = estimateMinutes(exercises);
        if (nextEstimate > maximumSessionMinutes) {
          candidate.sets -= 1;
          continue;
        }
        plannedByMuscle.set(candidate.muscle, (plannedByMuscle.get(candidate.muscle) ?? 0) + 1);
        estimatedMinutes = nextEstimate;
        addedSets += 1;
        changed = true;
      }
    }

    if (addedSets > 0) {
      reasons.push(`Boa recuperação, tempo disponível e déficit semanal permitiram acrescentar ${addedSets} série${addedSets === 1 ? "" : "s"} com segurança.`);
    } else {
      reasons.push("O tempo extra foi preservado como margem porque o volume semanal planejado já está adequado.");
    }
  }

  if (context.readiness.availableMinutes > 0 && estimatedMinutes > context.readiness.availableMinutes) {
    const candidates = [...exercises].sort((left, right) =>
      Number(left.mechanics === "isolado") - Number(right.mechanics === "isolado")
      || right.sets - left.sets);
    for (const candidate of candidates) {
      if (estimatedMinutes <= context.readiness.availableMinutes || candidate.sets <= 2 || candidate.prescriptionLocked) continue;
      candidate.sets -= 1;
      candidate.setRepRanges = candidate.setRepRanges?.slice(0, candidate.sets);
      estimatedMinutes = estimateMinutes(exercises);
    }
    reasons.push(`Sessão ajustada para aproximadamente ${estimatedMinutes} minutos, respeitando o tempo informado.`);
  }

  const summary = context.readinessAssessment.level === "limited"
    ? "A estrutura foi preservada, mas o desconforto articular exige revisão manual antes de iniciar."
    : `Prescrição ajustada para ${estimatedMinutes} minutos, RPE ${rpe} e objetivo selecionado no perfil.`;

  const plannedSets = exercises.reduce((total, exercise) => total + exercise.sets, 0);
  const rests = exercises.map((exercise) => exercise.restSeconds ?? 90);
  const restRange = {
    min: rests.length ? Math.min(...rests) : 0,
    max: rests.length ? Math.max(...rests) : 0,
  };
  const adjustment = context.deload
    ? "deload"
    : plannedSets > originalSets
      ? "expanded"
    : plannedSets < originalSets || context.readinessAssessment.reduceVolume
      ? "reduced"
      : "normal";

  return {
    exercises,
    summary,
    reasons: [...new Set(reasons)],
    estimatedMinutes,
    originalSets,
    plannedSets,
    targetRpe: rpe,
    restRange,
    adjustment,
  };
}
