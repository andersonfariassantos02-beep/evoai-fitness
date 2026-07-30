import { getSupabaseClient } from "../lib/supabase";
import { exerciseCatalog, getWorkoutTemplate, type MuscleGroup, type MovementPattern, type WorkoutExerciseTemplate } from "../lib/workoutTemplates";
import {
  calculateDynamicRest,
  calculateTransitionRest,
  MUSCLE_GROUPS,
  type DemandLevel,
  type ExerciseLaterality,
  type ExerciseMechanics,
  type ResistanceProfile,
} from "../lib/exerciseTaxonomy";
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
  stimulus?: string | null;
  avoid_when: string[] | null;
  instructions?: string | null;
  cautions?: string[] | null;
  media_url?: string | null;
  equipment_variants?: string[] | null;
  active?: boolean;
  set_rep_ranges?: Array<{ min: number; max: number }> | null;
  muscle_region?: string | null;
  secondary_muscles?: string[] | null;
  mechanics?: string | null;
  laterality?: string | null;
  resistance_profile?: string | null;
  movement_vector?: string | null;
  systemic_demand?: string | null;
  stability_demand?: string | null;
  technical_complexity?: string | null;
  exercise_family?: string | null;
}

export interface ExerciseGuidance {
  key: string;
  instructions: string;
  cautions: string[];
  mediaUrl: string | null;
  equipmentVariants: string[];
}

export type ExerciseCatalogAdminItem = Required<Omit<ExerciseCatalogRow,
  "avoid_when" | "instructions" | "cautions" | "media_url" | "equipment_variants" |
  "set_rep_ranges" | "stimulus" | "muscle_region" | "secondary_muscles" | "mechanics" |
  "laterality" | "resistance_profile" | "movement_vector" | "systemic_demand" |
  "stability_demand" | "technical_complexity" | "exercise_family">> & {
  avoid_when: string[];
  instructions: string;
  cautions: string[];
  media_url: string | null;
  equipment_variants: string[];
  muscle_region: string;
  secondary_muscles: string[];
  mechanics: ExerciseMechanics;
  laterality: ExerciseLaterality;
  resistance_profile: ResistanceProfile;
  movement_vector: string;
  systemic_demand: DemandLevel;
  stability_demand: DemandLevel;
  technical_complexity: DemandLevel;
  exercise_family: string;
};

const MUSCLE_ORDER: string[] = [...MUSCLE_GROUPS];
const MUSCLE_LABELS: Record<string, string> = {
  peito: "Peito", costas: "Costas", ombros: "Ombros", quadriceps: "Quadríceps",
  posteriores: "Posteriores de coxa", gluteos: "Glúteos", panturrilhas: "Panturrilhas",
  biceps: "Bíceps", triceps: "Tríceps", core: "Core",
};

function muscleLabel(muscle: string) {
  return MUSCLE_LABELS[muscle] ?? muscle.charAt(0).toUpperCase() + muscle.slice(1);
}

export function groupExerciseCatalogByMuscle(items: ExerciseCatalogAdminItem[]) {
  const groups = new Map<string, ExerciseCatalogAdminItem[]>();
  items.forEach((item) => groups.set(item.muscle, [...(groups.get(item.muscle) ?? []), item]));
  return [...groups.entries()]
    .sort(([left], [right]) => {
      const leftIndex = MUSCLE_ORDER.indexOf(left);
      const rightIndex = MUSCLE_ORDER.indexOf(right);
      if (leftIndex >= 0 || rightIndex >= 0) return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
      return muscleLabel(left).localeCompare(muscleLabel(right), "pt-BR");
    })
    .map(([muscle, groupItems]) => ({ muscle, label: muscleLabel(muscle), items: groupItems }));
}

export async function isExerciseCatalogAdmin(userId: string): Promise<boolean> {
  const { data, error } = await getSupabaseClient().from("app_admins").select("user_id").eq("user_id", userId).maybeSingle();
  return !error && Boolean(data);
}

export async function loadExerciseCatalogAdmin(): Promise<ExerciseCatalogAdminItem[]> {
  const { data, error } = await getSupabaseClient().from("exercise_catalog")
    .select("key, name, default_sets, reps_min, reps_max, muscle, movement, equipment, avoid_when, instructions, cautions, media_url, equipment_variants, active, muscle_region, secondary_muscles, mechanics, laterality, resistance_profile, movement_vector, systemic_demand, stability_demand, technical_complexity, exercise_family").order("name");
  if (error) throw error;
  return (data ?? []) as ExerciseCatalogAdminItem[];
}

export async function saveExerciseCatalogItem(item: ExerciseCatalogAdminItem): Promise<void> {
  if (!/^[a-z0-9-]+$/.test(item.key) || item.name.trim().length < 2
    || !item.muscle || !item.movement || !item.equipment || !item.mechanics) {
    throw new Error("Revise o nome e os dados biomecânicos obrigatórios.");
  }
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
  const restSeconds = calculateDynamicRest({
    mechanics: row.mechanics as ExerciseMechanics | undefined,
    systemicDemand: row.systemic_demand as DemandLevel | undefined,
    stabilityDemand: row.stability_demand as DemandLevel | undefined,
    repsMax: row.reps_max,
  });
  return {
    key: row.key,
    name: row.name,
    sets: row.default_sets,
    repsMin: row.reps_min,
    repsMax: row.reps_max,
    muscle: row.muscle as MuscleGroup,
    movement: row.movement as MovementPattern,
    equipment: row.equipment,
    stimulus: row.stimulus ?? undefined,
    setRepRanges: row.set_rep_ranges ?? undefined,
    avoidWhen: row.avoid_when ?? [],
    muscleRegion: row.muscle_region ?? undefined,
    secondaryMuscles: (row.secondary_muscles ?? []) as MuscleGroup[],
    mechanics: row.mechanics as ExerciseMechanics | undefined,
    laterality: row.laterality as ExerciseLaterality | undefined,
    resistanceProfile: row.resistance_profile as ResistanceProfile | undefined,
    movementVector: row.movement_vector ?? undefined,
    systemicDemand: row.systemic_demand as DemandLevel | undefined,
    stabilityDemand: row.stability_demand as DemandLevel | undefined,
    technicalComplexity: row.technical_complexity as DemandLevel | undefined,
    exerciseFamily: row.exercise_family ?? undefined,
    restSeconds,
    transitionRestSeconds: calculateTransitionRest(restSeconds),
  };
}

function withDynamicRest(item: WorkoutExerciseTemplate): WorkoutExerciseTemplate {
  const isolated = [
    "aducao-horizontal", "abducao-horizontal", "flexao-ombro", "abducao-ombro",
    "elevacao-escapular", "extensao-ombro", "flexionar-joelho", "estender-joelho",
    "abduzir-quadril", "flexao-plantar", "flexionar-cotovelo", "estender-cotovelo",
    "panturrilha", "isolar-braco",
  ].includes(item.movement);
  const mechanics = item.mechanics ?? (isolated ? "isolado" : "composto");
  const freeWeight = /barra|halter|peso livre/i.test(item.equipment);
  const highSystemic = ["agachar", "estender-quadril"].includes(item.movement);
  const restSeconds = calculateDynamicRest({
    mechanics,
    systemicDemand: item.systemicDemand ?? (highSystemic ? "alta" : mechanics === "composto" ? "moderada" : "baixa"),
    stabilityDemand: item.stabilityDemand ?? (freeWeight && mechanics === "composto" ? "alta" : "baixa"),
    repsMax: item.repsMax,
    targetRpe: item.targetRpe,
  });
  return {
    ...item,
    mechanics,
    restSeconds: item.restSeconds ?? restSeconds,
    transitionRestSeconds: item.transitionRestSeconds ?? calculateTransitionRest(item.restSeconds ?? restSeconds),
  };
}

let cachedCatalog: WorkoutExerciseTemplate[] | null = null;

export async function loadExerciseCatalog(): Promise<WorkoutExerciseTemplate[]> {
  if (cachedCatalog) return cachedCatalog;
  const { data, error } = await getSupabaseClient()
    .from("exercise_catalog")
    .select("key, name, default_sets, reps_min, reps_max, muscle, movement, equipment, stimulus, avoid_when, set_rep_ranges, muscle_region, secondary_muscles, mechanics, laterality, resistance_profile, movement_vector, systemic_demand, stability_demand, technical_complexity, exercise_family")
    .eq("active", true)
    .order("name");

  if (error || !data?.length) return exerciseCatalog.map(withDynamicRest);
  cachedCatalog = (data as ExerciseCatalogRow[]).map(mapExerciseCatalogRow);
  return cachedCatalog;
}

export async function loadWorkoutTemplate(label: string, restrictions: ProfileRestriction[] = []) {
  const catalog = await loadExerciseCatalog();
  const planned = getWorkoutTemplate(label).map((prescription) => {
    const definition = catalog.find((exercise) => exercise.key === prescription.key) ?? prescription;
    return withDynamicRest({
      ...prescription,
      ...definition,
      sets: prescription.sets,
      repsMin: prescription.repsMin,
      repsMax: prescription.repsMax,
      setRepRanges: prescription.setRepRanges,
      targetRpe: prescription.targetRpe,
      restSeconds: prescription.restSeconds ?? definition.restSeconds,
      transitionRestSeconds: prescription.transitionRestSeconds ?? definition.transitionRestSeconds,
    });
  });
  const reservedKeys = new Set(planned.map((exercise) => exercise.key));
  return planned.map((exercise) => {
    if (!exerciseConflictsWithRestrictions(exercise, restrictions)) return exercise;
    const replacement = catalog.find((candidate) =>
      candidate.key !== exercise.key
      && !reservedKeys.has(candidate.key)
      && candidate.muscle === exercise.muscle
      && (exercise.stimulus ? candidate.stimulus === exercise.stimulus : candidate.movement === exercise.movement)
      && !exerciseConflictsWithRestrictions(candidate, restrictions));
    if (!replacement) throw new Error(`PROFILE_RESTRICTION_BLOCKS_PLAN:${exercise.name}`);
    reservedKeys.add(replacement.key);
    return withDynamicRest({
      ...replacement,
      sets: exercise.sets,
      repsMin: exercise.repsMin,
      repsMax: exercise.repsMax,
      setRepRanges: exercise.setRepRanges,
      targetRpe: exercise.targetRpe,
    });
  });
}

export async function loadSubstitutionCandidates(key: string, restriction = "", profileRestrictions: ProfileRestriction[] = [], excludedKeys: string[] = []) {
  const catalog = await loadExerciseCatalog();
  const source = catalog.find((item) => item.key === key) ?? exerciseCatalog.find((item) => item.key === key);
  if (!source) return [];
  const normalized = restriction.toLowerCase();
  const excluded = new Set([key, ...excludedKeys]);
  return catalog
    .filter((item) => !excluded.has(item.key) && item.muscle === source.muscle
      && (source.stimulus ? item.stimulus === source.stimulus : item.movement === source.movement))
    .filter((item) => !(item.avoidWhen ?? []).some((term) => normalized.includes(term)))
    .filter((item) => !exerciseConflictsWithRestrictions(item, profileRestrictions))
    .sort((a, b) => Number(b.equipment === source.equipment) - Number(a.equipment === source.equipment));
}

export function resetExerciseCatalogCache() { cachedCatalog = null; }
