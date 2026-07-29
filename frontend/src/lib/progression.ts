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
}

function roundedLoad(value: number) {
  return Math.max(0, Math.round(value * 2) / 2);
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
