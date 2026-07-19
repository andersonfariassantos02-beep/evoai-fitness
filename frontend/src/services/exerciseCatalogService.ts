import { getSupabaseClient } from "../lib/supabase";
import { exerciseCatalog, type MuscleGroup, type MovementPattern, type WorkoutExerciseTemplate } from "../lib/workoutTemplates";

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

export async function loadWorkoutTemplate(label: string) {
  const catalog = await loadExerciseCatalog();
  const byKey = (key: string) => {
    const item = catalog.find((exercise) => exercise.key === key) ?? exerciseCatalog.find((exercise) => exercise.key === key);
    if (!item) throw new Error(`Exercício ausente: ${key}`);
    return item;
  };
  const normalized = label.toLowerCase();
  if (normalized.includes("inferior") || normalized.includes("legs") || normalized.includes("lower")) return [byKey("squat-pattern"), byKey("leg-press"), byKey("leg-curl"), byKey("calf-raise")];
  if (normalized.includes("pull")) return [byKey("row"), byKey("pulldown"), byKey("biceps")];
  if (normalized.includes("push")) return [byKey("chest-press"), byKey("shoulder-press"), byKey("triceps")];
  return [byKey("chest-press"), byKey("row"), byKey("squat-pattern"), byKey("leg-press")];
}

export async function loadSubstitutionCandidates(key: string, restriction = "") {
  const catalog = await loadExerciseCatalog();
  const source = catalog.find((item) => item.key === key) ?? exerciseCatalog.find((item) => item.key === key);
  if (!source) return [];
  const normalized = restriction.toLowerCase();
  return catalog
    .filter((item) => item.key !== key && item.muscle === source.muscle && item.movement === source.movement)
    .filter((item) => !(item.avoidWhen ?? []).some((term) => normalized.includes(term)))
    .sort((a, b) => Number(b.equipment === source.equipment) - Number(a.equipment === source.equipment));
}

export function resetExerciseCatalogCache() { cachedCatalog = null; }

