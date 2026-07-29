import { calculateMuscleRecovery, type MuscleRecovery, type MuscleStimulus } from "../lib/muscleRecovery";
import { getSupabaseClient } from "../lib/supabase";
import type { MuscleGroup } from "../lib/workoutTemplates";

const TRACKED_MUSCLES: MuscleGroup[] = ["peito", "costas", "ombros", "quadriceps", "posteriores", "gluteos", "panturrilhas", "biceps", "triceps"];

interface RecoverySessionRow {
  completed_at: string | null;
  exercise_logs: Array<{
    exercise_key: string;
    set_logs: Array<{ completed: boolean; skipped_at: string | null; rpe: number | null }> | null;
  }> | null;
}

export async function loadMuscleRecovery(userId: string, now = new Date()): Promise<MuscleRecovery[]> {
  const start = new Date(now);
  start.setDate(start.getDate() - 7);
  const supabase = getSupabaseClient();
  const { data: sessions, error } = await supabase.from("workout_sessions")
    .select("completed_at, exercise_logs(exercise_key, set_logs(completed, skipped_at, rpe))")
    .eq("user_id", userId)
    .eq("session_kind", "real")
    .eq("status", "completed")
    .gte("completed_at", start.toISOString())
    .order("completed_at", { ascending: false });
  if (error) throw error;

  const rows = (sessions ?? []) as unknown as RecoverySessionRow[];
  const keys = [...new Set(rows.flatMap((session) => session.exercise_logs ?? []).map((exercise) => exercise.exercise_key))];
  const { data: catalog, error: catalogError } = keys.length
    ? await supabase.from("exercise_catalog").select("key, muscle").in("key", keys)
    : { data: [], error: null };
  if (catalogError) throw catalogError;
  const muscleByKey = new Map((catalog ?? []).map((item) => [item.key, item.muscle as MuscleGroup]));
  const stimuli: MuscleStimulus[] = [];

  rows.forEach((session) => {
    if (!session.completed_at) return;
    const byMuscle = new Map<MuscleGroup, { sets: number; rpes: number[] }>();
    (session.exercise_logs ?? []).forEach((exercise) => {
      const muscle = muscleByKey.get(exercise.exercise_key);
      if (!muscle) return;
      const performed = (exercise.set_logs ?? []).filter((set) => set.completed && !set.skipped_at);
      if (!performed.length) return;
      const current = byMuscle.get(muscle) ?? { sets: 0, rpes: [] };
      current.sets += performed.length;
      current.rpes.push(...performed.flatMap((set) => set.rpe === null ? [] : [Number(set.rpe)]));
      byMuscle.set(muscle, current);
    });
    byMuscle.forEach((value, muscle) => stimuli.push({
      muscle,
      completedAt: session.completed_at!,
      completedSets: value.sets,
      averageRpe: value.rpes.length ? value.rpes.reduce((total, item) => total + item, 0) / value.rpes.length : null,
    }));
  });

  return calculateMuscleRecovery(TRACKED_MUSCLES, stimuli, now);
}
