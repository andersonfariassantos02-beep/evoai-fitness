import { getSupabaseClient } from "../lib/supabase";

export interface TestWorkoutSummary {
  id: string;
  trainingDate: string;
  workoutLabel: string;
  status: "active" | "paused" | "completed";
  createdAt: string;
  completedAt: string | null;
}

interface TestWorkoutRow {
  id: string;
  training_date: string;
  workout_label: string;
  status: TestWorkoutSummary["status"];
  created_at: string;
  completed_at: string | null;
}

export async function listTestWorkouts(userId: string): Promise<TestWorkoutSummary[]> {
  const { data, error } = await getSupabaseClient()
    .from("workout_sessions")
    .select("id, training_date, workout_label, status, created_at, completed_at")
    .eq("user_id", userId)
    .eq("session_kind", "test")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as TestWorkoutRow[]).map((row) => ({
    id: row.id,
    trainingDate: row.training_date,
    workoutLabel: row.workout_label,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  }));
}

export async function confirmPasswordAndDeleteTest(sessionId: string, password: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  const email = userResult.user?.email;
  if (userError || !email) throw new Error("AUTH_REQUIRED");

  const { error: passwordError } = await supabase.auth.signInWithPassword({ email, password });
  if (passwordError) throw new Error("INVALID_PASSWORD");

  const { error } = await supabase.rpc("delete_test_workout", { p_session_id: sessionId });
  if (error) throw error;
}
