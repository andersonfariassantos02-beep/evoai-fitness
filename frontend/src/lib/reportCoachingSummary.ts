import type { WorkoutReport } from "../services/reportService";
import { analyzeExerciseTrend, type ExerciseEvolution } from "./exerciseEvolution";

export interface ReportCoachingInsight {
  id: string;
  level: "positive" | "attention" | "action";
  title: string;
  message: string;
}

export interface ReportCoachingSummary {
  title: string;
  description: string;
  insights: ReportCoachingInsight[];
}

function percentageChange(current: number, previous: number) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function buildReportCoachingSummary(
  report: WorkoutReport,
  previous: WorkoutReport | null,
  evolution: ExerciseEvolution[] = [],
): ReportCoachingSummary {
  if (!report.completedSessions) {
    return {
      title: "Ainda não há base para analisar",
      description: "Conclua ao menos um treino real no período para receber uma leitura confiável.",
      insights: [{
        id: "no-workouts",
        level: "action",
        title: "Primeiro passo",
        message: "Conclua uma sessão com carga, repetições e percepção de esforço registradas.",
      }],
    };
  }

  const insights: ReportCoachingInsight[] = [];
  if (report.adherence >= 80) {
    insights.push({
      id: "adherence-good",
      level: "positive",
      title: "Boa consistência",
      message: `${report.adherence}% dos treinos previstos foram concluídos. Manter essa regularidade é mais importante do que compensar faltas com volume extra.`,
    });
  } else if (report.adherence < 60) {
    insights.push({
      id: "adherence-low",
      level: "action",
      title: "Consistência abaixo do planejado",
      message: `A adesão ficou em ${report.adherence}%. Revise os próximos dias disponíveis em vez de concentrar sessões para compensar.`,
    });
  } else {
    insights.push({
      id: "adherence-attention",
      level: "attention",
      title: "Regularidade pode melhorar",
      message: `A adesão ficou em ${report.adherence}%. Um calendário mais realista pode tornar a próxima semana mais sustentável.`,
    });
  }

  const volumeChange = percentageChange(report.totalVolume, previous?.totalVolume ?? 0);
  if (volumeChange !== null && volumeChange >= 25 && (report.averageRpe ?? 0) >= 8.5) {
    insights.push({
      id: "load-spike",
      level: "attention",
      title: "Aumento rápido de carga de treino",
      message: `O volume subiu ${volumeChange}% com RPE médio ${report.averageRpe}. Evite novo aumento agressivo antes de confirmar boa recuperação.`,
    });
  } else if (volumeChange !== null && volumeChange >= 5) {
    insights.push({
      id: "volume-progress",
      level: "positive",
      title: "Volume em progressão",
      message: `O volume total avançou ${volumeChange}% em relação ao período anterior, sem indicar por si só necessidade de acelerar novamente.`,
    });
  } else if (volumeChange !== null && volumeChange <= -25 && report.adherence >= 80) {
    insights.push({
      id: "volume-drop",
      level: "attention",
      title: "Queda relevante de volume",
      message: `O volume caiu ${Math.abs(volumeChange)}% apesar da boa adesão. Observe recuperação, exercícios substituídos e séries não realizadas.`,
    });
  }

  const totalPlannedSets = report.completedSets + report.skippedSets;
  const skippedPercentage = totalPlannedSets
    ? Math.round((report.skippedSets / totalPlannedSets) * 100)
    : 0;
  if (skippedPercentage >= 15) {
    insights.push({
      id: "skipped-sets",
      level: "action",
      title: "Muitas séries ficaram pendentes",
      message: `${skippedPercentage}% das séries planejadas não foram realizadas. Considere reduzir a sessão ou revisar o tempo disponível.`,
    });
  }

  const discomfortSessions = report.workouts.filter((workout) => workout.postWorkoutDiscomfort).length;
  if (discomfortSessions) {
    insights.push({
      id: "discomfort",
      level: "action",
      title: "Desconforto registrado",
      message: `${discomfortSessions} sessão(ões) terminaram com desconforto. Priorize técnica, substituições toleráveis e avaliação profissional se isso persistir.`,
    });
  }

  const qualities = report.workouts.flatMap((workout) => (
    workout.sessionQuality === null || workout.sessionQuality === undefined ? [] : [workout.sessionQuality]
  ));
  const averageQuality = qualities.length
    ? qualities.reduce((total, value) => total + value, 0) / qualities.length
    : null;
  if (averageQuality !== null && averageQuality < 3) {
    insights.push({
      id: "session-quality",
      level: "attention",
      title: "Qualidade percebida baixa",
      message: `A qualidade média das sessões ficou em ${averageQuality.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}/5. Sono, fadiga e duração do treino merecem revisão.`,
    });
  }

  const trends = evolution.map((exercise) => analyzeExerciseTrend(exercise.points));
  const progressing = trends.filter((trend) => trend.status === "progressing").length;
  const declining = trends.filter((trend) => trend.status === "declining").length;
  if (progressing) {
    insights.push({
      id: "exercise-progress",
      level: "positive",
      title: "Progressão confirmada",
      message: `${progressing} exercício(s) apresentam melhora recente. Consolide a faixa de repetições antes de aumentar novamente a carga.`,
    });
  }
  if (declining >= 2) {
    insights.push({
      id: "exercise-decline",
      level: "attention",
      title: "Queda em exercícios acompanhados",
      message: `${declining} exercícios apresentam queda recente. Revise recuperação e execução antes de buscar novos recordes.`,
    });
  }

  const ordered = [...insights].sort((left, right) => {
    const priority = { action: 0, attention: 1, positive: 2 };
    return priority[left.level] - priority[right.level];
  }).slice(0, 5);
  const needsAction = ordered.some((item) => item.level === "action");
  const needsAttention = ordered.some((item) => item.level === "attention");
  return {
    title: needsAction ? "Ajustes recomendados" : needsAttention ? "Evolução com pontos de atenção" : "Período consistente",
    description: needsAction
      ? "Existem pontos objetivos que merecem ajuste antes de aumentar a exigência."
      : needsAttention
        ? "A evolução continua, mas alguns sinais pedem uma progressão mais conservadora."
        : "Os registros indicam uma rotina sustentável. Preserve consistência e técnica.",
    insights: ordered,
  };
}
