import { getSupabaseClient } from "../lib/supabase";
import { getWorkoutTemplate, type WorkoutExerciseTemplate } from "../lib/workoutTemplates";
import { loadExerciseCatalog, loadWorkoutTemplate } from "./exerciseCatalogService";
import { recommendProgression, type ProgressionRecommendation } from "../lib/progression";
import { loadActiveProfileContext, restrictionSnapshot, type ProfileRestriction } from "./profileRestrictionService";

export interface SetLog { id: string; set_number: number; target_reps_min: number; target_reps_max: number; actual_reps: number | null; load_kg: number | null; rpe: number | null; notes: string; completed: boolean; target_rest_seconds: number | null; actual_rest_seconds: number | null; is_extra: boolean; skipped_at: string | null; skip_reason: string | null; }
export interface ExerciseLog { id: string; exercise_key: string; exercise_name: string; original_exercise_key: string | null; substitution_reason: string | null; position: number; rest_seconds: number; transition_rest_seconds: number; recommendation: ProgressionRecommendation; sets: SetLog[]; }
export type WorkoutSessionKind = "real" | "test";
export interface WorkoutSession { id: string; training_date: string; workout_label: string; session_kind: WorkoutSessionKind; status: "active" | "paused" | "completed"; notes: string; profile_id: string | null; profile_name: string | null; applied_restrictions: ProfileRestriction[]; exercises: ExerciseLog[]; }

function buildSetRows(template: WorkoutExerciseTemplate, exerciseLogId: string, userId: string) {
  return Array.from({ length: template.sets }, (_, index) => {
    const range = template.setRepRanges?.[index];
    return {
      exercise_log_id: exerciseLogId,
      user_id: userId,
      set_number: index + 1,
      target_reps_min: range?.min ?? template.repsMin,
      target_reps_max: range?.max ?? template.repsMax,
    };
  });
}

async function getRecommendation(userId: string, exerciseKey: string, repsMin: number, repsMax: number) {
  const { data: history } = await getSupabaseClient().from("set_logs").select("actual_reps, load_kg, rpe, notes, exercise_logs!inner(exercise_key, workout_sessions!inner(status, training_date, session_kind))").eq("user_id", userId).eq("exercise_logs.exercise_key", exerciseKey).eq("exercise_logs.workout_sessions.status", "completed").eq("exercise_logs.workout_sessions.session_kind", "real").not("completed_at", "is", null).order("completed_at", { ascending: false }).limit(1).maybeSingle();
  return recommendProgression(history ? { loadKg: Number(history.load_kg ?? 0), reps: Number(history.actual_reps ?? 0), rpe: Number(history.rpe ?? 0), failed: String(history.notes ?? "").toLowerCase().includes("falha") } : null, repsMin, repsMax);
}

async function loadDetails(session: Omit<WorkoutSession, "exercises">): Promise<WorkoutSession> {
  const supabase = getSupabaseClient();
  const catalog = await loadExerciseCatalog();
  const { data: exercises, error } = await supabase.from("exercise_logs").select("id, exercise_key, exercise_name, original_exercise_key, substitution_reason, position, rest_seconds, transition_rest_seconds").eq("session_id", session.id).order("position");
  if (error) throw error;
  const result: ExerciseLog[] = [];
  for (const exercise of exercises ?? []) {
    const { data: sets, error: setsError } = await supabase.from("set_logs").select("id, set_number, target_reps_min, target_reps_max, actual_reps, load_kg, rpe, notes, completed, target_rest_seconds, actual_rest_seconds, is_extra, skipped_at, skip_reason").eq("exercise_log_id", exercise.id).order("set_number");
    if (setsError) throw setsError;
    const currentSets = (sets ?? []) as SetLog[];
    const template = catalog.find((item) => item.key === exercise.exercise_key)
      ?? getWorkoutTemplate(session.workout_label).find((item) => item.key === exercise.exercise_key)
      ?? { repsMin: currentSets[0]?.target_reps_min ?? 8, repsMax: currentSets[0]?.target_reps_max ?? 12 };
    const recommendation = await getRecommendation((await supabase.auth.getUser()).data.user?.id ?? "", exercise.exercise_key, template.repsMin, template.repsMax);
    result.push({ ...exercise, rest_seconds: Number(exercise.rest_seconds ?? 120), transition_rest_seconds: Number(exercise.transition_rest_seconds ?? 180), recommendation, sets: currentSets });
  }
  return { ...session, exercises: result };
}

const workoutLoads = new Map<string, Promise<WorkoutSession>>();

async function startOrLoadWorkoutOnce(userId: string, date: string, label: string, sessionKind: WorkoutSessionKind): Promise<WorkoutSession> {
  const supabase = getSupabaseClient();
  const projection = "id, training_date, workout_label, session_kind, status, notes, profile_id, profile_name, applied_restrictions";
  const { data: existing, error: existingError } = await supabase.from("workout_sessions").select(projection).eq("user_id", userId).eq("training_date", date).eq("session_kind", sessionKind).maybeSingle();
  if (existingError) throw existingError;
  if (existing) return loadDetails(existing as Omit<WorkoutSession, "exercises">);

  const profile = await loadActiveProfileContext(userId, date);
  const templates = await loadWorkoutTemplate(label, profile.restrictions);
  const { data: session, error } = await supabase.from("workout_sessions").insert({ user_id: userId, training_date: date, workout_label: label, session_kind: sessionKind, profile_id: profile.profileId, profile_name: profile.profileName, applied_restrictions: restrictionSnapshot(profile) }).select(projection).single();
  if (error) throw error;
  const { data: exercises, error: exerciseError } = await supabase.from("exercise_logs").insert(templates.map((item, index) => ({
    session_id: session.id, user_id: userId, exercise_key: item.key, exercise_name: item.name, position: index + 1,
    rest_seconds: item.restSeconds ?? 120, transition_rest_seconds: item.transitionRestSeconds ?? 180,
  }))).select("id, position");
  if (exerciseError) throw exerciseError;
  const setRows = (exercises ?? []).flatMap((exercise) => {
    const template = templates[exercise.position - 1];
    return buildSetRows(template, exercise.id, userId);
  });
  const { error: setError } = await supabase.from("set_logs").insert(setRows);
  if (setError) throw setError;
  return loadDetails(session as Omit<WorkoutSession, "exercises">);
}

export function startOrLoadWorkout(userId: string, date: string, label: string, sessionKind: WorkoutSessionKind = "real"): Promise<WorkoutSession> {
  const key = `${userId}:${date}:${sessionKind}`;
  const pending = workoutLoads.get(key);
  if (pending) return pending;

  const request = startOrLoadWorkoutOnce(userId, date, label, sessionKind).finally(() => workoutLoads.delete(key));
  workoutLoads.set(key, request);
  return request;
}

export async function loadExistingWorkout(userId: string, date: string, sessionKind: WorkoutSessionKind = "real"): Promise<WorkoutSession | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("workout_sessions").select("id, training_date, workout_label, session_kind, status, notes, profile_id, profile_name, applied_restrictions").eq("user_id", userId).eq("training_date", date).eq("session_kind", sessionKind).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return loadDetails(data as Omit<WorkoutSession, "exercises">);
}

export async function previewAutomaticWorkout(userId: string, date: string, label: string): Promise<WorkoutExerciseTemplate[]> {
  const profile = await loadActiveProfileContext(userId, date);
  return loadWorkoutTemplate(label, profile.restrictions);
}

export async function createManualWorkout(userId: string, date: string, label: string, templates: WorkoutExerciseTemplate[], sessionKind: WorkoutSessionKind = "real"): Promise<WorkoutSession> {
  const supabase = getSupabaseClient();
  const profile = await loadActiveProfileContext(userId, date);
  const { data: session, error } = await supabase.from("workout_sessions").insert({ user_id: userId, training_date: date, workout_label: label, session_kind: sessionKind, profile_id: profile.profileId, profile_name: profile.profileName, applied_restrictions: restrictionSnapshot(profile) }).select("id, training_date, workout_label, session_kind, status, notes, profile_id, profile_name, applied_restrictions").single();
  if (error) throw error;
  const { data: exercises, error: exerciseError } = await supabase.from("exercise_logs").insert(templates.map((item, index) => ({
    session_id: session.id, user_id: userId, exercise_key: item.key, exercise_name: item.name, position: index + 1,
    rest_seconds: item.restSeconds ?? 120, transition_rest_seconds: item.transitionRestSeconds ?? 180,
  }))).select("id, position");
  if (exerciseError) throw exerciseError;
  const setRows = (exercises ?? []).flatMap((exercise) => {
    const template = templates[exercise.position - 1];
    return buildSetRows(template, exercise.id, userId);
  });
  const { error: setError } = await supabase.from("set_logs").insert(setRows);
  if (setError) throw setError;
  return loadDetails(session as Omit<WorkoutSession, "exercises">);
}

export async function replaceUnstartedWorkout(userId: string, date: string, sessionId: string, label: string, templates: WorkoutExerciseTemplate[]): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: session, error: sessionError } = await supabase.from("workout_sessions").select("id").eq("user_id", userId).eq("id", sessionId).eq("training_date", date).maybeSingle();
  if (sessionError) throw sessionError;
  if (!session) throw new Error("WORKOUT_NOT_EDITABLE");
  const exerciseKeys = templates.map((template) => template.key);
  const { error } = await supabase.rpc("replace_unstarted_workout", { p_session_id: sessionId, p_workout_label: label, p_exercise_keys: exerciseKeys });
  if (error) throw error;
}

export async function cancelStartedWorkout(sessionId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("cancel_started_workout", { p_session_id: sessionId });
  if (error) throw error;
}

export async function saveSet(set: SetLog) {
  const { error } = await getSupabaseClient().from("set_logs").update({
    actual_reps: set.actual_reps, load_kg: set.load_kg, rpe: set.rpe, notes: set.notes,
    completed: set.completed, completed_at: set.completed ? new Date().toISOString() : null,
    target_rest_seconds: set.target_rest_seconds, actual_rest_seconds: set.actual_rest_seconds,
  }).eq("id", set.id);
  if (error) throw error;
}

export async function addExtraSet(exercise: ExerciseLog): Promise<SetLog> {
  const supabase = getSupabaseClient();
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("AUTH_REQUIRED");
  const lastSet = [...exercise.sets].sort((a, b) => b.set_number - a.set_number)[0];
  if (!lastSet) throw new Error("SET_TEMPLATE_REQUIRED");
  const { data, error } = await supabase.from("set_logs").insert({
    exercise_log_id: exercise.id,
    user_id: userId,
    set_number: lastSet.set_number + 1,
    target_reps_min: lastSet.target_reps_min,
    target_reps_max: lastSet.target_reps_max,
    is_extra: true,
  }).select("id, set_number, target_reps_min, target_reps_max, actual_reps, load_kg, rpe, notes, completed, target_rest_seconds, actual_rest_seconds, is_extra, skipped_at, skip_reason").single();
  if (error) throw error;
  return data as SetLog;
}

export async function removeExtraSet(set: SetLog): Promise<void> {
  if (!set.is_extra || set.completed) throw new Error("EXTRA_SET_NOT_REMOVABLE");
  const { error } = await getSupabaseClient().from("set_logs").delete().eq("id", set.id).eq("is_extra", true).eq("completed", false);
  if (error) throw error;
}

export async function updateSession(id: string, status: WorkoutSession["status"], notes: string) {
  const now = new Date().toISOString();
  const { error } = await getSupabaseClient().from("workout_sessions").update({ status, notes, paused_at: status === "paused" ? now : null, completed_at: status === "completed" ? now : null }).eq("id", id);
  if (error) throw error;
}

export async function finishWorkoutWithPending(id: string, notes: string, reason: string): Promise<number> {
  const { data, error } = await getSupabaseClient().rpc("finish_workout_with_pending", {
    p_session_id: id,
    p_notes: notes,
    p_skip_reason: reason,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function substituteExercise(exercise: ExerciseLog, replacement: WorkoutExerciseTemplate, reason: string) {
  if (exercise.sets.some((set) => set.completed)) throw new Error("EXERCISE_ALREADY_STARTED");
  const supabase = getSupabaseClient();
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("AUTH_REQUIRED");
  const originalKey = exercise.original_exercise_key ?? exercise.exercise_key;
  const { error } = await supabase.from("exercise_logs").update({
    exercise_key: replacement.key,
    exercise_name: replacement.name,
    original_exercise_key: originalKey,
    substitution_reason: reason,
    rest_seconds: replacement.restSeconds ?? 120,
    transition_rest_seconds: replacement.transitionRestSeconds ?? 180,
  }).eq("id", exercise.id);
  if (error) throw error;
  const { error: deleteError } = await supabase.from("set_logs").delete().eq("exercise_log_id", exercise.id);
  if (deleteError) throw deleteError;
  const rows = buildSetRows(replacement, exercise.id, userId);
  const { data: sets, error: insertError } = await supabase.from("set_logs").insert(rows).select("id, set_number, target_reps_min, target_reps_max, actual_reps, load_kg, rpe, notes, completed, target_rest_seconds, actual_rest_seconds, is_extra, skipped_at, skip_reason").order("set_number");
  if (insertError) throw insertError;
  const recommendation = await getRecommendation(userId, replacement.key, replacement.repsMin, replacement.repsMax);
  return {
    ...exercise, exercise_key: replacement.key, exercise_name: replacement.name,
    original_exercise_key: originalKey, substitution_reason: reason,
    rest_seconds: replacement.restSeconds ?? 120,
    transition_rest_seconds: replacement.transitionRestSeconds ?? 180,
    recommendation, sets: (sets ?? []) as SetLog[],
  };
}
