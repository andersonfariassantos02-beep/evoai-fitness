import { getSupabaseClient } from "../lib/supabase";
import { getWorkoutTemplate } from "../lib/workoutTemplates";

export interface SetLog { id: string; set_number: number; target_reps_min: number; target_reps_max: number; actual_reps: number | null; load_kg: number | null; rpe: number | null; notes: string; completed: boolean; }
export interface ExerciseLog { id: string; exercise_name: string; position: number; sets: SetLog[]; }
export interface WorkoutSession { id: string; training_date: string; workout_label: string; status: "active" | "paused" | "completed"; notes: string; exercises: ExerciseLog[]; }

async function loadDetails(session: Omit<WorkoutSession, "exercises">): Promise<WorkoutSession> {
  const supabase = getSupabaseClient();
  const { data: exercises, error } = await supabase.from("exercise_logs").select("id, exercise_name, position").eq("session_id", session.id).order("position");
  if (error) throw error;
  const result: ExerciseLog[] = [];
  for (const exercise of exercises ?? []) {
    const { data: sets, error: setsError } = await supabase.from("set_logs").select("id, set_number, target_reps_min, target_reps_max, actual_reps, load_kg, rpe, notes, completed").eq("exercise_log_id", exercise.id).order("set_number");
    if (setsError) throw setsError;
    result.push({ ...exercise, sets: (sets ?? []) as SetLog[] });
  }
  return { ...session, exercises: result };
}

const workoutLoads = new Map<string, Promise<WorkoutSession>>();

async function startOrLoadWorkoutOnce(userId: string, date: string, label: string): Promise<WorkoutSession> {
  const supabase = getSupabaseClient();
  const { data: existing, error: existingError } = await supabase.from("workout_sessions").select("id, training_date, workout_label, status, notes").eq("user_id", userId).eq("training_date", date).maybeSingle();
  if (existingError) throw existingError;
  if (existing) return loadDetails(existing as Omit<WorkoutSession, "exercises">);

  const { data: session, error } = await supabase.from("workout_sessions").insert({ user_id: userId, training_date: date, workout_label: label }).select("id, training_date, workout_label, status, notes").single();
  if (error) throw error;
  const templates = getWorkoutTemplate(label);
  const { data: exercises, error: exerciseError } = await supabase.from("exercise_logs").insert(templates.map((item, index) => ({ session_id: session.id, user_id: userId, exercise_key: item.key, exercise_name: item.name, position: index + 1 }))).select("id, position");
  if (exerciseError) throw exerciseError;
  const setRows = (exercises ?? []).flatMap((exercise) => {
    const template = templates[exercise.position - 1];
    return Array.from({ length: template.sets }, (_, index) => ({ exercise_log_id: exercise.id, user_id: userId, set_number: index + 1, target_reps_min: template.repsMin, target_reps_max: template.repsMax }));
  });
  const { error: setError } = await supabase.from("set_logs").insert(setRows);
  if (setError) throw setError;
  return loadDetails(session as Omit<WorkoutSession, "exercises">);
}

export function startOrLoadWorkout(userId: string, date: string, label: string): Promise<WorkoutSession> {
  const key = `${userId}:${date}`;
  const pending = workoutLoads.get(key);
  if (pending) return pending;

  const request = startOrLoadWorkoutOnce(userId, date, label).finally(() => workoutLoads.delete(key));
  workoutLoads.set(key, request);
  return request;
}

export async function saveSet(set: SetLog) {
  const { error } = await getSupabaseClient().from("set_logs").update({ actual_reps: set.actual_reps, load_kg: set.load_kg, rpe: set.rpe, notes: set.notes, completed: set.completed, completed_at: set.completed ? new Date().toISOString() : null }).eq("id", set.id);
  if (error) throw error;
}

export async function updateSession(id: string, status: WorkoutSession["status"], notes: string) {
  const now = new Date().toISOString();
  const { error } = await getSupabaseClient().from("workout_sessions").update({ status, notes, paused_at: status === "paused" ? now : null, completed_at: status === "completed" ? now : null }).eq("id", id);
  if (error) throw error;
}
