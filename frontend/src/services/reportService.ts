import { getSupabaseClient } from "../lib/supabase";

export interface ReportSet {
  setNumber: number;
  reps: number;
  loadKg: number;
  rpe: number | null;
  isExtra: boolean;
  isWarmup?: boolean;
  skipped: boolean;
  skipReason: string | null;
}

export interface ReportExercise {
  key: string;
  name: string;
  originalKey: string | null;
  substitutionReason: string | null;
  sets: ReportSet[];
  volume: number;
  estimated1Rm: number | null;
  bestSet: { loadKg: number; reps: number } | null;
}

export interface ReportWorkout {
  id: string;
  date: string;
  label: string;
  notes: string;
  startedAt: string;
  completedAt: string | null;
  exercises: ReportExercise[];
  completedSets: number;
  skippedSets: number;
  volume: number;
  averageRpe: number | null;
  sessionRpe?: number | null;
  sessionQuality?: number | null;
  postWorkoutDiscomfort?: boolean;
}

export interface WorkoutReport {
  startDate: string;
  endDate: string;
  plannedSessions: number;
  workouts: ReportWorkout[];
  completedSessions: number;
  adherence: number;
  completedSets: number;
  skippedSets: number;
  totalReps: number;
  totalVolume: number;
  averageRpe: number | null;
}

export interface UnfinishedWorkout {
  id: string;
  date: string;
  label: string;
  status: "active" | "paused";
  completedSets: number;
  totalSets: number;
}

interface SetRow {
  set_number: number;
  actual_reps: number | null;
  load_kg: number | null;
  rpe: number | null;
  completed: boolean;
  is_extra: boolean;
  is_warmup?: boolean;
  skipped_at: string | null;
  skip_reason: string | null;
}

interface ExerciseRow {
  exercise_key: string;
  exercise_name: string;
  original_exercise_key: string | null;
  substitution_reason: string | null;
  position: number;
  set_logs: SetRow[] | null;
}

interface SessionRow {
  id: string;
  training_date: string;
  workout_label: string;
  notes: string;
  started_at: string;
  completed_at: string | null;
  session_rpe?: number | null;
  session_quality?: number | null;
  post_workout_discomfort?: boolean;
  exercise_logs: ExerciseRow[] | null;
}

interface UnfinishedSessionRow {
  id: string;
  training_date: string;
  workout_label: string;
  status: "active" | "paused";
  exercise_logs: Array<{
    set_logs: Array<{
      completed: boolean;
      skipped_at: string | null;
      is_warmup?: boolean;
    }> | null;
  }> | null;
}

function round(value: number, precision = 1) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function aggregateWorkoutReport(
  startDate: string,
  endDate: string,
  plannedSessions: number,
  rows: SessionRow[],
): WorkoutReport {
  const workouts = rows.map((session): ReportWorkout => {
    const exercises = [...(session.exercise_logs ?? [])]
      .sort((left, right) => left.position - right.position)
      .map((exercise): ReportExercise => {
        const sets = [...(exercise.set_logs ?? [])]
          .filter((set) => !set.is_warmup)
          .sort((left, right) => left.set_number - right.set_number)
          .map((set): ReportSet => ({
            setNumber: set.set_number,
            reps: Number(set.actual_reps ?? 0),
            loadKg: Number(set.load_kg ?? 0),
            rpe: set.rpe === null ? null : Number(set.rpe),
            isExtra: Boolean(set.is_extra),
            isWarmup: false,
            skipped: Boolean(set.skipped_at),
            skipReason: set.skip_reason,
          }));
        const volume = sets
          .filter((set) => !set.skipped)
          .reduce((total, set) => total + set.reps * set.loadKg, 0);
        const performedSets = sets.filter((set) => !set.skipped && set.reps > 0 && set.loadKg > 0);
        const bestSet = performedSets.reduce<ReportSet | null>((best, set) => {
          const estimate = set.loadKg * (1 + Math.min(set.reps, 12) / 30);
          const bestEstimate = best ? best.loadKg * (1 + Math.min(best.reps, 12) / 30) : -1;
          return estimate > bestEstimate ? set : best;
        }, null);
        return {
          key: exercise.exercise_key,
          name: exercise.exercise_name,
          originalKey: exercise.original_exercise_key,
          substitutionReason: exercise.substitution_reason,
          sets,
          volume: round(volume),
          estimated1Rm: bestSet ? round(bestSet.loadKg * (1 + Math.min(bestSet.reps, 12) / 30)) : null,
          bestSet: bestSet ? { loadKg: bestSet.loadKg, reps: bestSet.reps } : null,
        };
      });
    const completedSets = exercises.flatMap((exercise) => exercise.sets).filter((set) => !set.skipped && set.reps > 0).length;
    const skippedSets = exercises.flatMap((exercise) => exercise.sets).filter((set) => set.skipped).length;
    const rpes = exercises.flatMap((exercise) => exercise.sets).flatMap((set) => set.rpe === null || set.skipped ? [] : [set.rpe]);
    return {
      id: session.id,
      date: session.training_date,
      label: session.workout_label,
      notes: session.notes,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      exercises,
      completedSets,
      skippedSets,
      volume: round(exercises.reduce((total, exercise) => total + exercise.volume, 0)),
      averageRpe: rpes.length ? round(rpes.reduce((total, value) => total + value, 0) / rpes.length) : null,
      sessionRpe: session.session_rpe === null || session.session_rpe === undefined ? null : Number(session.session_rpe),
      sessionQuality: session.session_quality === null || session.session_quality === undefined ? null : Number(session.session_quality),
      postWorkoutDiscomfort: Boolean(session.post_workout_discomfort),
    };
  });

  const allSets = workouts.flatMap((workout) => workout.exercises).flatMap((exercise) => exercise.sets);
  const validRpes = allSets.flatMap((set) => set.rpe === null || set.skipped ? [] : [set.rpe]);
  const completedSessions = workouts.length;
  return {
    startDate,
    endDate,
    plannedSessions,
    workouts,
    completedSessions,
    adherence: plannedSessions ? Math.min(100, round((completedSessions / plannedSessions) * 100)) : completedSessions ? 100 : 0,
    completedSets: allSets.filter((set) => !set.skipped && set.reps > 0).length,
    skippedSets: allSets.filter((set) => set.skipped).length,
    totalReps: allSets.filter((set) => !set.skipped).reduce((total, set) => total + set.reps, 0),
    totalVolume: round(workouts.reduce((total, workout) => total + workout.volume, 0)),
    averageRpe: validRpes.length ? round(validRpes.reduce((total, value) => total + value, 0) / validRpes.length) : null,
  };
}

export async function loadWorkoutReport(userId: string, startDate: string, endDate: string): Promise<WorkoutReport> {
  const supabase = getSupabaseClient();
  const [sessionsResult, calendarResult] = await Promise.all([
    supabase.from("workout_sessions")
      .select("id, training_date, workout_label, notes, started_at, completed_at, session_rpe, session_quality, post_workout_discomfort, exercise_logs(exercise_key, exercise_name, original_exercise_key, substitution_reason, position, set_logs(set_number, actual_reps, load_kg, rpe, completed, is_extra, is_warmup, skipped_at, skip_reason))")
      .eq("user_id", userId)
      .eq("session_kind", "real")
      .eq("status", "completed")
      .gte("training_date", startDate)
      .lte("training_date", endDate)
      .order("training_date"),
    supabase.from("training_calendar_entries")
      .select("training_date")
      .eq("user_id", userId)
      .eq("available", true)
      .gte("training_date", startDate)
      .lte("training_date", endDate),
  ]);
  if (sessionsResult.error) throw sessionsResult.error;
  if (calendarResult.error) throw calendarResult.error;
  return aggregateWorkoutReport(
    startDate,
    endDate,
    calendarResult.data?.length ?? 0,
    (sessionsResult.data ?? []) as unknown as SessionRow[],
  );
}

export function mapUnfinishedWorkouts(rows: UnfinishedSessionRow[]): UnfinishedWorkout[] {
  return rows.map((session) => {
    const sets = (session.exercise_logs ?? []).flatMap((exercise) => exercise.set_logs ?? []).filter((set) => !set.is_warmup);
    return {
      id: session.id,
      date: session.training_date,
      label: session.workout_label,
      status: session.status,
      completedSets: sets.filter((set) => set.completed || Boolean(set.skipped_at)).length,
      totalSets: sets.length,
    };
  });
}

export async function loadUnfinishedWorkouts(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<UnfinishedWorkout[]> {
  const { data, error } = await getSupabaseClient()
    .from("workout_sessions")
    .select("id, training_date, workout_label, status, exercise_logs(set_logs(completed, skipped_at, is_warmup))")
    .eq("user_id", userId)
    .eq("session_kind", "real")
    .in("status", ["active", "paused"])
    .gte("training_date", startDate)
    .lte("training_date", endDate)
    .order("training_date");
  if (error) throw error;
  return mapUnfinishedWorkouts((data ?? []) as unknown as UnfinishedSessionRow[]);
}

export async function confirmPasswordAndDeleteUnfinishedWorkout(
  userId: string,
  sessionId: string,
  password: string,
): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  const email = userResult.user?.email;
  if (userError || !email || userResult.user?.id !== userId) throw new Error("AUTH_REQUIRED");

  const { error: passwordError } = await supabase.auth.signInWithPassword({ email, password });
  if (passwordError) throw new Error("INVALID_PASSWORD");

  const { data, error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("session_kind", "real")
    .in("status", ["active", "paused"])
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("WORKOUT_NOT_FOUND");
}
