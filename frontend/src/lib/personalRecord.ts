import type { SetLog } from "../services/workoutSessionService";

export interface PersonalBest {
  loadKg: number;
  reps: number;
  estimated1Rm: number;
  date: string;
}

export interface PersonalRecordResult {
  achieved: boolean;
  title: string;
  message: string;
}

export function estimateOneRepMax(loadKg: number, reps: number): number {
  if (!Number.isFinite(loadKg) || !Number.isFinite(reps) || loadKg <= 0 || reps <= 0) return 0;
  const safeReps = Math.min(reps, 12);
  return Math.round(loadKg * (1 + safeReps / 30) * 10) / 10;
}

export function findPersonalBest(rows: Array<{ loadKg: number; reps: number; date: string }>): PersonalBest | null {
  const valid = rows
    .map((row) => ({ ...row, estimated1Rm: estimateOneRepMax(row.loadKg, row.reps) }))
    .filter((row) => row.estimated1Rm > 0)
    .sort((a, b) => b.estimated1Rm - a.estimated1Rm || b.loadKg - a.loadKg || b.reps - a.reps);
  return valid[0] ?? null;
}

export function evaluatePersonalRecord(previous: PersonalBest | null, sets: SetLog[]): PersonalRecordResult {
  const current = findPersonalBest(sets
    .filter((set) => set.completed && !set.skipped_at && !set.is_warmup)
    .map((set) => ({
      loadKg: Number(set.load_kg ?? 0),
      reps: Number(set.actual_reps ?? 0),
      date: "",
    })));

  if (!previous || !current) return { achieved: false, title: "", message: "" };

  const improvedEstimated1Rm = current.estimated1Rm >= previous.estimated1Rm + 0.5;
  const improvedLoadAtEquivalentPerformance =
    current.loadKg > previous.loadKg && current.estimated1Rm >= previous.estimated1Rm;
  if (!improvedEstimated1Rm && !improvedLoadAtEquivalentPerformance) {
    return { achieved: false, title: "", message: "" };
  }

  return {
    achieved: true,
    title: "Novo recorde pessoal",
    message: `${current.loadKg.toLocaleString("pt-BR")} kg × ${current.reps} repetições · 1RM estimada em ${current.estimated1Rm.toLocaleString("pt-BR")} kg`,
  };
}
