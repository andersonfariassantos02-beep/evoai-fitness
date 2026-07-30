export interface PreviousPerformance {
  loadKg: number;
  reps: number;
  rpe: number | null;
  failed: boolean;
}

export interface PreviousSetPerformance extends PreviousPerformance {
  setNumber: number;
  targetRepsMin: number;
  targetRepsMax: number;
}

export interface ProgressionRecommendation {
  loadKg: number;
  reason: string;
  action: "increase" | "maintain" | "reduce";
  evidence?: string[];
  sessionsAnalyzed?: number;
}

function roundedLoad(value: number) {
  return Math.max(0, Math.round(value * 2) / 2);
}

function averageReportedRpe(sets: PreviousSetPerformance[]) {
  const rpes = sets
    .map((set) => set.rpe)
    .filter((rpe): rpe is number => rpe !== null && rpe > 0);
  return rpes.length ? rpes.reduce((total, rpe) => total + rpe, 0) / rpes.length : null;
}

function evidenceFor(sets: PreviousSetPerformance[], sessionsAnalyzed: number) {
  const performed = sets.filter((set) => set.loadKg > 0 && set.reps > 0);
  const averageRpe = averageReportedRpe(performed);
  const topSets = performed.filter((set) => set.reps >= set.targetRepsMax).length;
  return [
    `${sessionsAnalyzed} ${sessionsAnalyzed === 1 ? "sessão recente analisada" : "sessões recentes analisadas"}`,
    `${topSets}/${performed.length} séries no topo da faixa na última sessão`,
    averageRpe === null ? "RPE não informado na última sessão" : `RPE médio ${averageRpe.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}`,
  ];
}

export function recommendProgressionFromSession(
  sets: PreviousSetPerformance[],
): ProgressionRecommendation {
  const performed = sets
    .filter((set) => set.loadKg > 0 && set.reps > 0)
    .sort((left, right) => left.setNumber - right.setNumber);
  if (!performed.length) {
    return {
      loadKg: 0,
      action: "maintain",
      reason: "Primeira execução: registre uma carga confortável para criar a referência.",
    };
  }

  const referenceLoad = performed[0].loadKg;
  const reportedRpes = performed
    .map((set) => set.rpe)
    .filter((rpe): rpe is number => rpe !== null && rpe > 0);
  const averageRpe = reportedRpes.length
    ? reportedRpes.reduce((total, rpe) => total + rpe, 0) / reportedRpes.length
    : null;
  const belowTarget = performed.filter((set) => set.reps < set.targetRepsMin).length;
  if (performed.some((set) => set.failed) || (averageRpe !== null && averageRpe >= 9.5) || belowTarget >= Math.ceil(performed.length / 2)) {
    return {
      loadKg: roundedLoad(referenceLoad * .95),
      action: "reduce",
      reason: "Redução de 5%: a sessão anterior teve falha, esforço muito alto ou repetições abaixo da faixa.",
    };
  }

  const everySetHasControlledEffort = performed.every((set) => set.rpe !== null && set.rpe <= 8);
  if (performed.every((set) => set.reps >= set.targetRepsMax) && everySetHasControlledEffort) {
    const increment = Math.min(5, Math.max(.5, roundedLoad(referenceLoad * .03)));
    return {
      loadKg: roundedLoad(referenceLoad + increment),
      action: "increase",
      reason: `Aumento de ${increment.toLocaleString("pt-BR")} kg: todas as séries atingiram o topo da faixa com pelo menos 2 repetições em reserva.`,
    };
  }

  return {
    loadKg: referenceLoad,
    action: "maintain",
    reason: reportedRpes.length
      ? "Carga mantida: primeiro avance as repetições até o topo da faixa em todas as séries, com esforço controlado."
      : "Carga mantida: faltou registrar o esforço anterior. Avance as repetições dentro da faixa e informe o RPE antes de aumentar o peso.",
  };
}

export function recommendProgressionFromHistory(
  sessions: PreviousSetPerformance[][],
): ProgressionRecommendation {
  const recentSessions = sessions
    .map((sets) => sets.filter((set) => set.loadKg > 0 && set.reps > 0))
    .filter((sets) => sets.length > 0)
    .slice(0, 2);
  if (!recentSessions.length) {
    return {
      ...recommendProgressionFromSession([]),
      sessionsAnalyzed: 0,
      evidence: ["Nenhuma sessão anterior válida"],
    };
  }

  const latest = recommendProgressionFromSession(recentSessions[0]);
  const evidence = evidenceFor(recentSessions[0], recentSessions.length);
  if (latest.action === "reduce") {
    return { ...latest, sessionsAnalyzed: recentSessions.length, evidence };
  }

  if (latest.action !== "increase") {
    return { ...latest, sessionsAnalyzed: recentSessions.length, evidence };
  }

  if (recentSessions.length < 2 || recommendProgressionFromSession(recentSessions[1]).action !== "increase") {
    return {
      loadKg: recentSessions[0][0].loadKg,
      action: "maintain",
      sessionsAnalyzed: recentSessions.length,
      evidence,
      reason: recentSessions.length < 2
        ? "Carga mantida: o topo da faixa foi atingido com esforço controlado. Repita o resultado em mais uma sessão antes de aumentar."
        : "Carga mantida: a última sessão foi boa, mas ainda falta consistência em duas sessões consecutivas para aumentar com segurança.",
    };
  }

  return {
    ...latest,
    sessionsAnalyzed: recentSessions.length,
    evidence,
    reason: `${latest.reason} A decisão foi confirmada por duas sessões consecutivas consistentes.`,
  };
}

export function recommendProgression(
  previous: PreviousPerformance | null,
  repsMin: number,
  repsMax: number,
): ProgressionRecommendation {
  return recommendProgressionFromSession(previous ? [{
    ...previous,
    setNumber: 1,
    targetRepsMin: repsMin,
    targetRepsMax: repsMax,
  }] : []);
}
