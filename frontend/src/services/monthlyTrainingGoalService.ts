import { getSupabaseClient } from "../lib/supabase";

export async function loadMonthlyCompletedWorkoutDates(userId: string, startDate: string, endDate: string): Promise<string[]> {
  const { data, error } = await getSupabaseClient().from("workout_sessions")
    .select("training_date")
    .eq("user_id", userId)
    .eq("session_kind", "real")
    .eq("status", "completed")
    .gte("training_date", startDate)
    .lte("training_date", endDate)
    .order("training_date");
  if (error) throw error;
  return [...new Set((data ?? []).map((row) => String(row.training_date)))];
}
