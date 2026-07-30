import type { ReportWorkout } from "../services/reportService";

export type FatigueLevel = "normal" | "attention" | "deload";

export interface FatigueAssessment {
  level: FatigueLevel;
  title: string;
  summary: string;
  recommendation: string;
  signals: string[];
  recentSessions: number;
}

export interface SubjectiveRecoveryEntry {
  sleepHours: number;
  soreness: number;
  fatigue: number;
  jointDiscomfort: boolean;
}

function average(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
}

function completedVolume(workouts: ReportWorkout[]) {
  return workouts.reduce((total, workout) => total + workout.volume, 0);
}

export function assessTrainingFatigue(
  recentWorkouts: ReportWorkout[],
  previousWorkouts: ReportWorkout[],
  readinessEntries: SubjectiveRecoveryEntry[] = [],
): FatigueAssessment {
  const recent = [...recentWorkouts].sort((left, right) => left.date.localeCompare(right.date));
  const recentRpes = recent.flatMap((workout) => {
    const rpe = workout.sessionRpe ?? workout.averageRpe;
    return rpe === null || rpe === undefined ? [] : [rpe];
  });
  const averageRpe = average(recentRpes);
  const totalSets = recent.reduce((total, workout) => total + workout.completedSets + workout.skippedSets, 0);
  const skippedSets = recent.reduce((total, workout) => total + workout.skippedSets, 0);
  const skipRate = totalSets ? skippedSets / totalSets : 0;
  const recentVolume = completedVolume(recent);
  const previousVolume = completedVolume(previousWorkouts);
  const comparableVolumeDrop = previousWorkouts.length > 0 && recent.length > 0
    ? (recentVolume / recent.length) < (previousVolume / previousWorkouts.length) * .85
    : false;
  const lastThreeWithRpe = recent.filter((workout) => workout.averageRpe !== null).slice(-3);
  const consecutiveHighRpe = lastThreeWithRpe.length === 3
    && lastThreeWithRpe.every((workout) => (workout.averageRpe ?? 0) >= 9);

  const signals: string[] = [];
  let score = 0;
  if (averageRpe !== null && averageRpe >= 9) {
    score += 2;
    signals.push(`RPE médio recente em ${averageRpe.toLocaleString("pt-BR")}`);
  } else if (averageRpe !== null && averageRpe >= 8.5) {
    score += 1;
    signals.push(`RPE médio recente elevado (${averageRpe.toLocaleString("pt-BR")})`);
  }
  if (consecutiveHighRpe) {
    score += 2;
    signals.push("três sessões consecutivas com RPE 9 ou mais");
  }
  if (skipRate >= .2 && skippedSets >= 2) {
    score += 1;
    signals.push(`${Math.round(skipRate * 100)}% das séries recentes não foram realizadas`);
  }
  if (comparableVolumeDrop && averageRpe !== null && averageRpe >= 8.5) {
    score += 2;
    signals.push("queda de volume acompanhada de esforço elevado");
  }
  if (recent.length >= 6) {
    score += 1;
    signals.push(`${recent.length} sessões concluídas nos últimos 7 dias`);
  }
  const recentReadiness = readinessEntries.slice(-7);
  const averageSleep = average(recentReadiness.map((entry) => entry.sleepHours));
  const averageFatigue = average(recentReadiness.map((entry) => entry.fatigue));
  const highDiscomfortDays = recentReadiness.filter((entry) => entry.soreness >= 4 || entry.jointDiscomfort).length;
  if (averageSleep !== null && averageSleep < 6) {
    score += 2;
    signals.push(`sono médio recente de ${averageSleep.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h`);
  } else if (averageSleep !== null && averageSleep < 7) {
    score += 1;
    signals.push(`sono médio abaixo de 7h (${averageSleep.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h)`);
  }
  if (averageFatigue !== null && averageFatigue >= 4) {
    score += 2;
    signals.push(`fadiga percebida média em ${averageFatigue.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}/5`);
  } else if (averageFatigue !== null && averageFatigue >= 3.5) {
    score += 1;
    signals.push(`fadiga percebida elevada (${averageFatigue.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}/5)`);
  }
  if (highDiscomfortDays >= 2) {
    score += 1;
    signals.push(`${highDiscomfortDays} registros recentes com dor alta ou desconforto articular`);
  }
  const postWorkoutDiscomforts = recent.filter((workout) => workout.postWorkoutDiscomfort).length;
  if (postWorkoutDiscomforts >= 2) {
    score += 1;
    signals.push(`${postWorkoutDiscomforts} sessões recentes encerradas com desconforto`);
  }

  if (recent.length < 2 && recentReadiness.length < 2) {
    return {
      level: "normal",
      title: "Monitoramento em formação",
      summary: "Ainda faltam treinos ou check-ins recentes para avaliar tendência de fadiga com segurança.",
      recommendation: "Continue registrando carga, repetições, RPE e recuperação. Nenhum ajuste automático será feito.",
      signals: [],
      recentSessions: recent.length,
    };
  }
  if (score >= 4 && signals.length >= 2) {
    return {
      level: "deload",
      title: "Deload sugerido",
      summary: "O histórico e os check-ins apresentam sinais combinados de fadiga acumulada. Isso é uma orientação preventiva, não um diagnóstico.",
      recommendation: "Por 5–7 dias, reduza cerca de 30–40% das séries, mantenha cargas confortáveis e trabalhe em RPE 6–7. Interrompa e procure avaliação profissional se houver dor persistente.",
      signals,
      recentSessions: recent.length,
    };
  }
  if (score >= 2) {
    return {
      level: "attention",
      title: "Recuperação merece atenção",
      summary: "Há sinais objetivos ou percebidos de recuperação reduzida, mas a decisão deve considerar como você se sente hoje.",
      recommendation: "Evite buscar recordes na próxima sessão. Priorize sono, técnica e RPE até 8; reduza uma série por exercício se a prontidão estiver baixa.",
      signals,
      recentSessions: recent.length,
    };
  }
  if (recent.length < 2) {
    return {
      level: "normal",
      title: "Monitoramento em formação",
      summary: "Ainda faltam treinos recentes para avaliar tendência de fadiga com segurança.",
      recommendation: "Continue registrando carga, repetições e RPE. Nenhum ajuste automático será feito.",
      signals: [],
      recentSessions: recent.length,
    };
  }
  return {
    level: "normal",
    title: "Carga de treino sob controle",
    summary: "O histórico recente não mostra uma combinação consistente de sinais de fadiga acumulada.",
    recommendation: "Mantenha a progressão planejada e continue registrando o RPE para melhorar a precisão.",
    signals,
    recentSessions: recent.length,
  };
}
