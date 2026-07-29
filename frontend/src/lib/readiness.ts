import type { WorkoutExerciseTemplate } from "./workoutTemplates";

export interface ReadinessCheckIn {
  sleepHours: number;
  energy: number;
  soreness: number;
  fatigue: number;
  jointDiscomfort: boolean;
  availableMinutes: number;
}

export interface ReadinessAssessment {
  level: "ready" | "caution" | "limited";
  message: string;
  reduceVolume: boolean;
}

export function assessReadiness(checkIn: ReadinessCheckIn): ReadinessAssessment {
  if (checkIn.jointDiscomfort) {
    return {
      level: "limited",
      reduceVolume: false,
      message: "Há desconforto articular. A ficha não foi alterada automaticamente: revise os exercícios e use uma substituição compatível antes de começar.",
    };
  }
  if (checkIn.sleepHours < 6 || checkIn.energy <= 2 || checkIn.soreness >= 4 || checkIn.fatigue >= 4) {
    return {
      level: "caution",
      reduceVolume: true,
      message: "Prontidão reduzida: a sugestão terá uma série a menos por exercício, preservando exercícios, ordem e carga de referência.",
    };
  }
  if (checkIn.availableMinutes > 0 && checkIn.availableMinutes < 45) {
    return {
      level: "caution",
      reduceVolume: true,
      message: "Tempo curto: a sugestão terá volume reduzido para manter a sessão objetiva sem trocar sua estrutura.",
    };
  }
  return { level: "ready", reduceVolume: false, message: "Boa prontidão para executar a sessão planejada." };
}

export function applyReadinessAdjustment(
  templates: WorkoutExerciseTemplate[],
  assessment: ReadinessAssessment,
): WorkoutExerciseTemplate[] {
  if (!assessment.reduceVolume) return templates;
  return templates.map((exercise) => {
    const sets = Math.max(2, exercise.sets - 1);
    return { ...exercise, sets, setRepRanges: exercise.setRepRanges?.slice(0, sets) };
  });
}
