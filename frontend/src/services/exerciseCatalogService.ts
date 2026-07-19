import { getSupabaseClient } from "../lib/supabase";
import { exerciseCatalog, type MuscleGroup, type MovementPattern, type WorkoutExerciseTemplate } from "../lib/workoutTemplates";
import { exerciseConflictsWithRestrictions, type ProfileRestriction } from "./profileRestrictionService";

interface ExerciseCatalogRow {
  key: string;
  name: string;
  default_sets: number;
  reps_min: number;
  reps_max: number;
  muscle: string;
  movement: string;
  equipment: string;
  avoid_when: string[] | null;
  instructions?: string | null;
  cautions?: string[] | null;
  media_url?: string | null;
  equipment_variants?: string[] | null;
  active?: boolean;
}

export interface ExerciseGuidance {
  key: string;
  instructions: string;
  cautions: string[];
  mediaUrl: string | null;
  equipmentVariants: string[];
}

export type ExerciseCatalogAdminItem = Required<Omit<ExerciseCatalogRow, "avoid_when" | "instructions" | "cautions" | "media_url" | "equipment_variants">> & {
  avoid_when: string[];
  instructions: string;
  cautions: string[];
  media_url: string | null;
  equipment_variants: string[];
};

export async function isExerciseCatalogAdmin(userId: string): Promise<boolean> {
  const { data, error } = await getSupabaseClient().from("app_admins").select("user_id").eq("user_id", userId).maybeSingle();
  return !error && Boolean(data);
}

export async function loadExerciseCatalogAdmin(): Promise<ExerciseCatalogAdminItem[]> {
  const { data, error } = await getSupabaseClient().from("exercise_catalog")
    .select("key, name, default_sets, reps_min, reps_max, muscle, movement, equipment, avoid_when, instructions, cautions, media_url, equipment_variants, active").order("name");
  if (error) throw error;
  return (data ?? []) as ExerciseCatalogAdminItem[];
}

export async function saveExerciseCatalogItem(item: ExerciseCatalogAdminItem): Promise<void> {
  if (!/^[a-z0-9-]+$/.test(item.key) || item.name.trim().length < 2 || item.default_sets < 1
    || item.reps_min < 1 || item.reps_max < item.reps_min) throw new Error("Revise a chave, o nome, as séries e as repetições.");
  const mediaUrl = item.media_url?.trim() || null;
  if (mediaUrl && !mediaUrl.startsWith("https://")) throw new Error("Use uma URL HTTPS para a mídia.");
  const payload = { ...item, media_url: mediaUrl, instructions: item.instructions.trim(), cautions: item.cautions.filter(Boolean), equipment_variants: item.equipment_variants.filter(Boolean) };
  const { error } = await getSupabaseClient().from("exercise_catalog").upsert(payload, { onConflict: "key" });
  if (error) throw error;
  resetExerciseCatalogCache();
}

export function mapExerciseGuidanceRow(row: ExerciseCatalogRow): ExerciseGuidance {
  return { key: row.key, instructions: row.instructions?.trim() ?? "", cautions: row.cautions ?? [], mediaUrl: row.media_url?.trim() || null, equipmentVariants: row.equipment_variants ?? [] };
}

export async function loadExerciseGuidance(keys: string[]): Promise<Record<string, ExerciseGuidance>> {
  if (!keys.length) return {};
  const { data, error } = await getSupabaseClient().from("exercise_catalog")
    .select("key, instructions, cautions, media_url, equipment_variants").in("key", [...new Set(keys)]);
  if (error) return {};
  return Object.fromEntries(((data ?? []) as ExerciseCatalogRow[]).map(mapExerciseGuidanceRow).map(item => [item.key, item]));
}

export async function setExerciseCatalogItemActive(key: string, active: boolean): Promise<void> {
  const { error } = await getSupabaseClient().from("exercise_catalog").update({ active }).eq("key", key);
  if (error) throw error;
  resetExerciseCatalogCache();
}

export function mapExerciseCatalogRow(row: ExerciseCatalogRow): WorkoutExerciseTemplate {
  return {
    key: row.key,
    name: row.name,
    sets: row.default_sets,
    repsMin: row.reps_min,
    repsMax: row.reps_max,
    muscle: row.muscle as MuscleGroup,
    movement: row.movement as MovementPattern,
    equipment: row.equipment,
    avoidWhen: row.avoid_when ?? [],
  };
}

let cachedCatalog: WorkoutExerciseTemplate[] | null = null;

export async function loadExerciseCatalog(): Promise<WorkoutExerciseTemplate[]> {
  if (cachedCatalog) return cachedCatalog;
  const { data, error } = await getSupabaseClient()
    .from("exercise_catalog")
    .select("key, name, default_sets, reps_min, reps_max, muscle, movement, equipment, avoid_when")
    .eq("active", true)
    .order("name");

  if (error || !data?.length) return exerciseCatalog;
  cachedCatalog = (data as ExerciseCatalogRow[]).map(mapExerciseCatalogRow);
  return cachedCatalog;
}

export async function loadWorkoutTemplate(label: string, restrictions: ProfileRestriction[] = []) {
  const catalog = await loadExerciseCatalog();
  const byKey = (key: string) => {
    const item = catalog.find((exercise) => exercise.key === key) ?? exerciseCatalog.find((exercise) => exercise.key === key);
    if (!item) throw new Error(`Exercício ausente: ${key}`);
    return item;
  };
  const normalized = label.toLowerCase();
  const planned = normalized.includes("inferior") || normalized.includes("legs") || normalized.includes("lower")
    ? [byKey("squat-pattern"), byKey("leg-press"), byKey("leg-curl"), byKey("calf-raise")]
    : normalized.includes("pull")
      ? [byKey("row"), byKey("pulldown"), byKey("biceps")]
      : normalized.includes("push")
        ? [byKey("chest-press"), byKey("shoulder-press"), byKey("triceps")]
        : [byKey("chest-press"), byKey("row"), byKey("squat-pattern"), byKey("leg-press")];
  return planned.map((exercise) => {
    if (!exerciseConflictsWithRestrictions(exercise, restrictions)) return exercise;
    const replacement = catalog.find((candidate) =>
      candidate.key !== exercise.key
      && candidate.muscle === exercise.muscle
      && candidate.movement === exercise.movement
      && !exerciseConflictsWithRestrictions(candidate, restrictions));
    if (!replacement) throw new Error(`PROFILE_RESTRICTION_BLOCKS_PLAN:${exercise.name}`);
    return replacement;
  });
}

export async function loadSubstitutionCandidates(key: string, restriction = "", profileRestrictions: ProfileRestriction[] = []) {
  const catalog = await loadExerciseCatalog();
  const source = catalog.find((item) => item.key === key) ?? exerciseCatalog.find((item) => item.key === key);
  if (!source) return [];
  const normalized = restriction.toLowerCase();
  return catalog
    .filter((item) => item.key !== key && item.muscle === source.muscle && item.movement === source.movement)
    .filter((item) => !(item.avoidWhen ?? []).some((term) => normalized.includes(term)))
    .filter((item) => !exerciseConflictsWithRestrictions(item, profileRestrictions))
    .sort((a, b) => Number(b.equipment === source.equipment) - Number(a.equipment === source.equipment));
}

export function resetExerciseCatalogCache() { cachedCatalog = null; }
