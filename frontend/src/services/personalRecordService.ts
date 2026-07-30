import {
  buildExercisePersonalRecords,
  type ExercisePerformance,
  type ExercisePersonalRecords,
} from "../lib/personalRecord";
import { getSupabaseClient } from "../lib/supabase";

interface PersonalRecordRow {
  actual_reps: number | null;
  load_kg: number | null;
  exercise_logs:
    | {
      exercise_key: string;
      exercise_name: string;
      workout_sessions: { training_date: string } | Array<{ training_date: string }>;
    }
    | Array<{
      exercise_key: string;
      exercise_name: string;
      workout_sessions: { training_date: string } | Array<{ training_date: string }>;
    }>;
}

export function mapPersonalRecordRows(rows: PersonalRecordRow[]): ExercisePerformance[] {
  return rows.flatMap((row) => {
    const exercise = Array.isArray(row.exercise_logs) ? row.exercise_logs[0] : row.exercise_logs;
    const session = exercise && (Array.isArray(exercise.workout_sessions)
      ? exercise.workout_sessions[0]
      : exercise.workout_sessions);
    if (!exercise || !session) return [];
    return [{
      exerciseKey: exercise.exercise_key,
      exerciseName: exercise.exercise_name,
      date: session.training_date,
      loadKg: Number(row.load_kg ?? 0),
      reps: Number(row.actual_reps ?? 0),
    }];
  });
}

export async function loadPersonalRecords(userId: string): Promise<ExercisePersonalRecords[]> {
  const { data, error } = await getSupabaseClient().from("set_logs")
    .select("actual_reps,load_kg,exercise_logs!inner(exercise_key,exercise_name,workout_sessions!inner(training_date,status,session_kind))")
    .eq("user_id", userId)
    .eq("completed", true)
    .eq("is_warmup", false)
    .is("skipped_at", null)
    .eq("exercise_logs.workout_sessions.status", "completed")
    .eq("exercise_logs.workout_sessions.session_kind", "real")
    .order("completed_at", { ascending: true })
    .limit(5_000);
  if (error) throw error;
  return buildExercisePersonalRecords(mapPersonalRecordRows((data ?? []) as unknown as PersonalRecordRow[]));
}
