import { getSupabaseClient } from "../lib/supabase";
import type { WorkoutExerciseTemplate } from "../lib/workoutTemplates";

export interface ProfileRestriction {
  id: string;
  category: "medical" | "injury" | "equipment" | "preference" | "other";
  severity: "info" | "avoid" | "contraindication";
  description: string;
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
