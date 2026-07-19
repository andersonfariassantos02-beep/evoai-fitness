import { getSupabaseClient } from "../lib/supabase";
import type { WorkoutExerciseTemplate } from "../lib/workoutTemplates";

export interface ProfileRestriction {
  id: string;
  category: "medical" | "injury" | "equipment" | "preference" | "other";
  severity: "info" | "avoid" | "contraindication";
  description: string;
}

export interface ManagedProfileRestriction extends ProfileRestriction {
  starts_on: string | null;
  ends_on: string | null;
  active: boolean;
}

export interface ManagedProfile {
  id: string;
  display_name: string;
  birth_date: string | null;
  active: boolean;
  training_goal: TrainingGoal;
  weekly_target: number;
  restrictions: ManagedProfileRestriction[];
}

export type TrainingGoal = "general_fitness" | "hypertrophy" | "strength" | "conditioning";

export interface PlanningProfile {
  goal: TrainingGoal;
  weeklyTarget: number;
}

export interface RestrictionInput {
  category: ProfileRestriction["category"];
  severity: ProfileRestriction["severity"];
  description: string;
  starts_on: string;
  ends_on: string;
}

export interface ActiveProfileContext {
  profileId: string | null;
  profileName: string | null;
  restrictions: ProfileRestriction[];
}

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function restrictionText(restrictions: ProfileRestriction[]) {
  return restrictions
    .filter((item) => item.severity !== "info")
    .map((item) => item.description.trim())
    .filter(Boolean)
    .join("; ");
}

export function exerciseConflictsWithRestrictions(exercise: WorkoutExerciseTemplate, restrictions: ProfileRestriction[]) {
  const relevant = restrictions.filter((item) => item.severity !== "info");
  if (!relevant.length) return false;
  const descriptions = normalized(relevant.map((item) => item.description).join(" "));
  const bodyConflict = (exercise.avoidWhen ?? []).some((term) => descriptions.includes(normalized(term)));
  const equipmentConflict = relevant
    .filter((item) => item.category === "equipment")
    .some((item) => normalized(item.description).includes(normalized(exercise.equipment)));
  return bodyConflict || equipmentConflict;
}

export function restrictionSnapshot(context: ActiveProfileContext) {
  return context.restrictions.map(({ id, category, severity, description }) => ({ id, category, severity, description }));
}

export function validateRestrictionInput(input: RestrictionInput) {
  const description = input.description.trim();
  if (!description) return "Descreva a restrição.";
  if (description.length > 1000) return "Use no máximo 1000 caracteres.";
  if (input.starts_on && input.ends_on && input.ends_on < input.starts_on) return "A data final não pode ser anterior à inicial.";
  return "";
}

export async function loadManagedProfile(userId: string): Promise<ManagedProfile | null> {
  const supabase = getSupabaseClient();
  const { data: profiles, error } = await supabase.from("profiles")
    .select("id, display_name, birth_date, active, training_goal, weekly_target")
    .eq("linked_user_id", userId)
    .order("created_at")
    .limit(2);
  if (error) throw error;
  if ((profiles ?? []).length > 1) throw new Error("MULTIPLE_LINKED_PROFILES");
  const profile = profiles?.[0];
  if (!profile) return null;
  const { data: restrictions, error: restrictionsError } = await supabase.from("profile_restrictions")
    .select("id, category, severity, description, starts_on, ends_on, active")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false });
  if (restrictionsError) throw restrictionsError;
  return { ...profile, restrictions: (restrictions ?? []) as ManagedProfileRestriction[] } as ManagedProfile;
}

export async function updateManagedProfile(profileId: string, displayName: string, birthDate: string, trainingGoal: TrainingGoal, weeklyTarget: number) {
  const name = displayName.trim();
  if (!name || name.length > 120) throw new Error("INVALID_PROFILE_NAME");
  const supabase = getSupabaseClient();
  if (!Number.isInteger(weeklyTarget) || weeklyTarget < 1 || weeklyTarget > 7) throw new Error("INVALID_WEEKLY_TARGET");
  const { error } = await supabase.from("profiles").update({ display_name: name, birth_date: birthDate || null, training_goal: trainingGoal, weekly_target: weeklyTarget }).eq("id", profileId);
  if (error) throw error;
}

export async function loadPlanningProfile(userId: string): Promise<PlanningProfile> {
  const { data, error } = await getSupabaseClient().from("profiles")
    .select("training_goal, weekly_target")
    .eq("linked_user_id", userId)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return { goal: (data?.training_goal as TrainingGoal | undefined) ?? "general_fitness", weeklyTarget: Number(data?.weekly_target ?? 3) };
}

export async function createProfileRestriction(profileId: string, userId: string, input: RestrictionInput) {
  const validation = validateRestrictionInput(input);
  if (validation) throw new Error(validation);
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("profile_restrictions").insert({
    profile_id: profileId,
    created_by: userId,
    category: input.category,
    severity: input.severity,
    description: input.description.trim(),
    starts_on: input.starts_on || null,
    ends_on: input.ends_on || null,
    active: true,
  });
  if (error) throw error;
}

export async function setProfileRestrictionActive(restrictionId: string, active: boolean) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("profile_restrictions").update({ active }).eq("id", restrictionId);
  if (error) throw error;
}

export async function deleteProfileRestriction(restrictionId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("profile_restrictions").delete().eq("id", restrictionId);
  if (error) throw error;
}

export async function loadActiveProfileContext(userId: string, onDate: string): Promise<ActiveProfileContext> {
  const supabase = getSupabaseClient();
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("linked_user_id", userId)
    .eq("active", true)
    .order("created_at")
    .limit(2);
  if (profileError) throw profileError;
  if ((profiles ?? []).length > 1) throw new Error("MULTIPLE_ACTIVE_LINKED_PROFILES");
  const profile = profiles?.[0];
  if (!profile) return { profileId: null, profileName: null, restrictions: [] };

  const { data, error } = await supabase
    .from("profile_restrictions")
    .select("id, category, severity, description")
    .eq("profile_id", profile.id)
    .eq("active", true)
    .or(`starts_on.is.null,starts_on.lte.${onDate}`)
    .or(`ends_on.is.null,ends_on.gte.${onDate}`)
    .order("severity");
  if (error) throw error;
  return {
    profileId: profile.id,
    profileName: profile.display_name,
    restrictions: (data ?? []) as ProfileRestriction[],
  };
}
