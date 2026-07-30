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

export interface ExercisePerformance {
  exerciseKey: string;
  exerciseName: string;
  date: string;
  loadKg: number;
  reps: number;
}

export interface RecordSet {
  loadKg: number;
  reps: number;
  estimated1Rm: number;
  date: string;
}

export interface VolumeRecord {
  volumeKg: number;
  date: string;
}

export interface ExercisePersonalRecords {
  key: string;
  name: string;
  sessions: number;
  bestLoad: RecordSet;
  bestEstimated1Rm: RecordSet;
  bestSessionVolume: VolumeRecord;
}

export interface PersonalRecordHighlight {
  exerciseKey: string;
  exerciseName: string;
  kind: "load" | "estimated1Rm" | "volume";
  label: string;
  value: string;
  date: string;
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

export function buildExercisePersonalRecords(rows: ExercisePerformance[]): ExercisePersonalRecords[] {
  const grouped = new Map<string, ExercisePerformance[]>();
  rows
    .filter((row) => row.exerciseKey && row.exerciseName && row.date && row.loadKg >= 0 && row.reps > 0)
    .forEach((row) => grouped.set(row.exerciseKey, [...(grouped.get(row.exerciseKey) ?? []), row]));

  return [...grouped.entries()].map(([key, performances]) => {
    const scored = performances.map((row) => ({ ...row, estimated1Rm: estimateOneRepMax(row.loadKg, row.reps) }));
    const bestLoad = [...scored].sort((left, right) =>
      right.loadKg - left.loadKg || right.estimated1Rm - left.estimated1Rm || right.date.localeCompare(left.date)
    )[0];
    const bestEstimated1Rm = [...scored].sort((left, right) =>
      right.estimated1Rm - left.estimated1Rm || right.loadKg - left.loadKg || right.date.localeCompare(left.date)
    )[0];
    const volumeByDate = new Map<string, number>();
    scored.forEach((row) => volumeByDate.set(row.date, (volumeByDate.get(row.date) ?? 0) + row.loadKg * row.reps));
    const bestSessionVolume = [...volumeByDate.entries()]
      .map(([date, volumeKg]) => ({ date, volumeKg: Math.round(volumeKg * 10) / 10 }))
      .sort((left, right) => right.volumeKg - left.volumeKg || right.date.localeCompare(left.date))[0];
    return {
      key,
      name: scored.at(-1)?.exerciseName ?? scored[0].exerciseName,
      sessions: volumeByDate.size,
      bestLoad: { loadKg: bestLoad.loadKg, reps: bestLoad.reps, estimated1Rm: bestLoad.estimated1Rm, date: bestLoad.date },
      bestEstimated1Rm: {
        loadKg: bestEstimated1Rm.loadKg,
        reps: bestEstimated1Rm.reps,
        estimated1Rm: bestEstimated1Rm.estimated1Rm,
        date: bestEstimated1Rm.date,
      },
      bestSessionVolume,
    };
  }).sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}

export function personalRecordHighlights(
  records: ExercisePersonalRecords[],
  startDate: string,
  endDate: string,
): PersonalRecordHighlight[] {
  const highlights: PersonalRecordHighlight[] = [];
  records.forEach((record) => {
    if (record.bestLoad.date >= startDate && record.bestLoad.date <= endDate) {
      highlights.push({
        exerciseKey: record.key,
        exerciseName: record.name,
        kind: "load",
        label: "Maior carga",
        value: `${record.bestLoad.loadKg.toLocaleString("pt-BR")} kg × ${record.bestLoad.reps}`,
        date: record.bestLoad.date,
      });
    }
    if (record.bestEstimated1Rm.date >= startDate && record.bestEstimated1Rm.date <= endDate) {
      highlights.push({
        exerciseKey: record.key,
        exerciseName: record.name,
        kind: "estimated1Rm",
        label: "Melhor 1RM estimada",
        value: `${record.bestEstimated1Rm.estimated1Rm.toLocaleString("pt-BR")} kg`,
        date: record.bestEstimated1Rm.date,
      });
    }
    if (record.bestSessionVolume.date >= startDate && record.bestSessionVolume.date <= endDate) {
      highlights.push({
        exerciseKey: record.key,
        exerciseName: record.name,
        kind: "volume",
        label: "Maior volume",
        value: `${record.bestSessionVolume.volumeKg.toLocaleString("pt-BR")} kg`,
        date: record.bestSessionVolume.date,
      });
    }
  });
  return highlights.sort((left, right) => right.date.localeCompare(left.date) || left.exerciseName.localeCompare(right.exerciseName, "pt-BR"));
}
