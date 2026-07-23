import { getSupabaseClient } from "../lib/supabase";
import { getWorkoutTemplate, type WorkoutExerciseTemplate } from "../lib/workoutTemplates";
import { loadExerciseCatalog, loadWorkoutTemplate } from "./exerciseCatalogService";
import { recommendProgression, type ProgressionRecommendation } from "../lib/progression";
import { exerciseConflictsWithRestrictions, loadActiveProfileContext, restrictionSnapshot, type ActiveProfileContext, type ProfileRestriction } from "./profileRestrictionService";

export interface SetLog { id: string; set_number: number; target_reps_min: number; target_reps_max: number; actual_reps: number | null; load_kg: number | null; rpe: number | null; notes: string; completed: boolean; }
export interface ExerciseLog { id: string; exercise_key: string; exercise_name: string; original_exercise_key: string | null; substitution_reason: string | null; position: number; recommendation: ProgressionRecommendation; sets: SetLog[]; }
export interface WorkoutSession { id: string; training_date: string; workout_label: string; status: "active" | "paused" | "completed"; notes: string; profile_id: string | null; profile_name: string | null; applied_restrictions: ProfileRestriction[]; exercises: ExerciseLog[]; }

async function getRecommendation(userId: string, exerciseKey: string, repsMin: number, repsMax: number) {
  const { data: history } = await getSupabaseClient().from("set_logs").select("actual_reps, load_kg, rpe, notes, exercise_logs!inner(exercise_key, workout_sessions!inner(status, training_date))").eq("user_id", userId).eq("exercise_logs.exercise_key", exerciseKey).in("exercise_logs.workout_sessions.status", ["completed", "cancelled"]).not("completed_at", "is", null).order("completed_at", { ascending: false }).limit(1).maybeSingle();
  return recommendProgression(history ? { loadKg: Number(history.load_kg ?? 0), reps: Number(history.actual_reps ?? 0), rpe: Number(history.rpe ?? 0), failed: String(history.notes ?? "").toLowerCase().includes("falha") } : null, repsMin, repsMax);
}

async function loadDetails(session: Omit<WorkoutSession, "exercises">): Promise<WorkoutSession> {
  const supabase = getSupabaseClient();
  const catalog = await loadExerciseCatalog();
  const { data: exercises, error } = await supabase.from("exercise_logs").select("id, exercise_key, exercise_name, original_exercise_key, substitution_reason, position").eq("session_id", session.id).order("position");
  if (error) throw error;
  const result: ExerciseLog[] = [];
  for (const exercise of exercises ?? []) {
    const { data: sets, error: setsError } = await supabase.from("set_logs").select("id, set_number, target_reps_min, target_reps_max, actual_reps, load_kg, rpe, notes, completed").eq("exercise_log_id", exercise.id).order("set_number");
    if (setsError) throw setsError;
    const currentSets = (sets ?? []) as SetLog[];
    const template = catalog.find((item) => item.key === exercise.exercise_key)
      ?? getWorkoutTemplate(session.workout_label).find((item) => item.key === exercise.exercise_key)
      ?? { repsMin: currentSets[0]?.target_reps_min ?? 8, repsMax: currentSets[0]?.target_reps_max ?? 12 };
    const recommendation = await getRecommendation((await supabase.auth.getUser()).data.user?.id ?? "", exercise.exercise_key, template.repsMin, template.repsMax);
    result.push({ ...exercise, recommendation, sets: currentSets });
  }
  return { ...session, exercises: result };
}

export async function loadExistingWorkout(userId: string, date: string): Promise<WorkoutSession | null> {
  const { data, error } = await getSupabaseClient().from("workout_sessions")
    .select("id, training_date, workout_label, status, notes, profile_id, profile_name, applied_restrictions")
    .eq("user_id", userId).eq("training_date", date).neq("status", "cancelled").maybeSingle();
  if (error) throw error;
  return data ? loadDetails(data as Omit<WorkoutSession, "exercises">) : null;
}

export async function previewAutomaticWorkout(userId: string, date: string, label: string) {
  const profile = await loadActiveProfileContext(userId, date);
  return loadWorkoutTemplate(label, profile.restrictions);
}

const workoutLoads = new Map<string, Promise<WorkoutSession>>();

async function startOrLoadWorkoutOnce(userId: string, date: string, label: string): Promise<WorkoutSession> {
  const supabase = getSupabaseClient();
  const { data: existing, error: existingError } = await supabase.from("workout_sessions").select("id, training_date, workout_label, status, notes, profile_id, profile_name, applied_restrictions").eq("user_id", userId).eq("training_date", date).neq("status", "cancelled").maybeSingle();
  if (existingError) throw existingError;
  if (existing) return loadDetails(existing as Omit<WorkoutSession, "exercises">);

  const profile = await loadActiveProfileContext(userId, date);
  const templates = await loadWorkoutTemplate(label, profile.restrictions);
  return createWorkoutFromTemplates(userId, date, label, templates, profile);
}

async function createWorkoutFromTemplates(
  userId: string,
  date: string,
  label: string,
  templates: WorkoutExerciseTemplate[],
  profile: ActiveProfileContext,
): Promise<WorkoutSession> {
  const supabase = getSupabaseClient();
  const { data: session, error } = await supabase.from("workout_sessions").insert({ user_id: userId, training_date: date, workout_label: label, profile_id: profile.profileId, profile_name: profile.profileName, applied_restrictions: restrictionSnapshot(profile) }).select("id, training_date, workout_label, status, notes, profile_id, profile_name, applied_restrictions").single();
  if (error) throw error;
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

export async function createManualWorkout(userId: string, date: string, label: string, templates: WorkoutExerciseTemplate[]) {
  const name = label.trim();
  if (!name || name.length > 120) throw new Error("INVALID_WORKOUT_NAME");
  if (!templates.length || templates.length > 12) throw new Error("INVALID_EXERCISE_COUNT");
  if (new Set(templates.map((item) => item.key)).size !== templates.length) throw new Error("DUPLICATE_EXERCISE");
  const supabase = getSupabaseClient();
  const { data: existing, error } = await supabase.from("workout_sessions").select("id").eq("user_id", userId).eq("training_date", date).neq("status", "cancelled").maybeSingle();
  if (error) throw error;
  if (existing) throw new Error("WORKOUT_ALREADY_EXISTS");
  const profile = await loadActiveProfileContext(userId, date);
  if (templates.some((item) => exerciseConflictsWithRestrictions(item, profile.restrictions))) throw new Error("EXERCISE_CONFLICTS_WITH_PROFILE");
  return createWorkoutFromTemplates(userId, date, name, templates, profile);
}

export async function replaceUnstartedWorkout(userId: string, date: string, sessionId: string, label: string, templates: WorkoutExerciseTemplate[]) {
  const name = label.trim();
  if (!name || name.length > 120) throw new Error("INVALID_WORKOUT_NAME");
  if (!templates.length || templates.length > 12) throw new Error("INVALID_EXERCISE_COUNT");
  if (new Set(templates.map((item) => item.key)).size !== templates.length) throw new Error("DUPLICATE_EXERCISE");
  const profile = await loadActiveProfileContext(userId, date);
  if (templates.some((item) => exerciseConflictsWithRestrictions(item, profile.restrictions))) throw new Error("EXERCISE_CONFLICTS_WITH_PROFILE");
  const { error } = await getSupabaseClient().rpc("replace_unstarted_workout", {
    p_session_id: sessionId,
    p_workout_label: name,
    p_exercise_keys: templates.map((item) => item.key),
  });
  if (error) {
    if (error.message.includes("WORKOUT_ALREADY_STARTED")) throw new Error("WORKOUT_ALREADY_STARTED");
    throw error;
  }
  return loadExistingWorkout(userId, date);
}

export async function cancelStartedWorkout(sessionId: string) {
  const { error } = await getSupabaseClient().rpc("cancel_started_workout", {
    p_session_id: sessionId,
  });
  if (error) {
    if (error.message.includes("WORKOUT_NOT_CANCELLABLE")) throw new Error("WORKOUT_NOT_CANCELLABLE");
    if (error.message.includes("WORKOUT_NOT_STARTED")) throw new Error("WORKOUT_NOT_STARTED");
    throw error;
  }
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

export async function substituteExercise(exercise: ExerciseLog, replacement: WorkoutExerciseTemplate, reason: string) {
  if (exercise.sets.some((set) => set.completed)) throw new Error("EXERCISE_ALREADY_STARTED");
  const supabase = getSupabaseClient();
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("AUTH_REQUIRED");
  const originalKey = exercise.original_exercise_key ?? exercise.exercise_key;
  const { error } = await supabase.from("exercise_logs").update({ exercise_key: replacement.key, exercise_name: replacement.name, original_exercise_key: originalKey, substitution_reason: reason }).eq("id", exercise.id);
  if (error) throw error;
  const { error: deleteError } = await supabase.from("set_logs").delete().eq("exercise_log_id", exercise.id);
  if (deleteError) throw deleteError;
  const rows = Array.from({ length: replacement.sets }, (_, index) => ({ exercise_log_id: exercise.id, user_id: userId, set_number: index + 1, target_reps_min: replacement.repsMin, target_reps_max: replacement.repsMax }));
  const { data: sets, error: insertError } = await supabase.from("set_logs").insert(rows).select("id, set_number, target_reps_min, target_reps_max, actual_reps, load_kg, rpe, notes, completed").order("set_number");
  if (insertError) throw insertError;
  const recommendation = await getRecommendation(userId, replacement.key, replacement.repsMin, replacement.repsMax);
  return { ...exercise, exercise_key: replacement.key, exercise_name: replacement.name, original_exercise_key: originalKey, substitution_reason: reason, recommendation, sets: (sets ?? []) as SetLog[] };
}
