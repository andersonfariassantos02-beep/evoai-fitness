export interface PreviousPerformance { loadKg: number; reps: number; rpe: number; failed: boolean; }
export interface ProgressionRecommendation { loadKg: number; reason: string; action: "increase" | "maintain" | "reduce"; }

export function recommendProgression(previous: PreviousPerformance | null, repsMin: number, repsMax: number): ProgressionRecommendation {
  if (!previous || previous.loadKg <= 0) return { loadKg: 0, action: "maintain", reason: "Primeira execução: registre uma carga confortável para criar a referência." };
  if (previous.failed || previous.reps < repsMin || previous.rpe >= 9.5) {
    return { loadKg: Math.max(0, Math.round(previous.loadKg * .95 * 2) / 2), action: "reduce", reason: "Redução de 5%: houve falha, repetições abaixo da faixa ou RPE muito alto." };
  }
  if (previous.reps >= repsMax && previous.rpe <= 8) {
    return { loadKg: Math.round((previous.loadKg + 2.5) * 2) / 2, action: "increase", reason: "Aumento de 2,5 kg: faixa superior concluída com RPE até 8." };
  }
  return { loadKg: previous.loadKg, action: "maintain", reason: "Carga mantida: consolide a faixa de repetições antes de progredir." };
}
