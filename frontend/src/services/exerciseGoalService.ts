import { getSupabaseClient } from "../lib/supabase";

export type ExerciseGoalMetric = "load" | "estimated_1rm";

export interface ExerciseGoal {
  id: string;
  exerciseKey: string;
  exerciseName: string;
  metric: ExerciseGoalMetric;
  targetValue: number;
  targetDate: string | null;
}

export interface ExerciseGoalInput {
  exerciseKey: string;
  exerciseName: string;
  metric: ExerciseGoalMetric;
  targetValue: string;
  targetDate: string;
}

interface ExerciseGoalRow {
  id: string;
  exercise_key: string;
  exercise_name: string;
  metric: ExerciseGoalMetric;
  target_value: number;
  target_date: string | null;
}

const columns = "id,exercise_key,exercise_name,metric,target_value,target_date";

export function validateExerciseGoal(input: ExerciseGoalInput) {
  if (!input.exerciseKey.trim() || !input.exerciseName.trim()) return "Selecione um exercício válido.";
  if (!["load", "estimated_1rm"].includes(input.metric)) return "Selecione o tipo da meta.";
  const value = Number(input.targetValue.replace(",", "."));
  if (!Number.isFinite(value) || value <= 0 || value > 2000) return "Informe uma meta entre 0,1 e 2.000 kg.";
  if (input.targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.targetDate)) return "Informe uma data válida.";
  return "";
}

function fromRow(row: ExerciseGoalRow): ExerciseGoal {
  return {
    id: row.id,
    exerciseKey: row.exercise_key,
    exerciseName: row.exercise_name,
    metric: row.metric,
    targetValue: Number(row.target_value),
    targetDate: row.target_date,
  };
}

export async function loadExerciseGoals(userId: string): Promise<ExerciseGoal[]> {
  const { data, error } = await getSupabaseClient().from("exercise_performance_goals")
    .select(columns)
    .eq("user_id", userId)
    .order("exercise_name", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as ExerciseGoalRow[]).map(fromRow);
}

export async function saveExerciseGoal(userId: string, input: ExerciseGoalInput): Promise<void> {
  const validation = validateExerciseGoal(input);
  if (validation) throw new Error(validation);
  const { error } = await getSupabaseClient().from("exercise_performance_goals").upsert({
    user_id: userId,
    exercise_key: input.exerciseKey,
    exercise_name: input.exerciseName,
    metric: input.metric,
    target_value: Number(input.targetValue.replace(",", ".")),
    target_date: input.targetDate || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,exercise_key" });
  if (error) throw error;
}

export async function deleteExerciseGoal(userId: string, goalId: string): Promise<void> {
  const { error } = await getSupabaseClient().from("exercise_performance_goals")
    .delete()
    .eq("id", goalId)
    .eq("user_id", userId);
  if (error) throw error;
}
