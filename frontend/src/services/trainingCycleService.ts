import { getSupabaseClient } from "../lib/supabase";
import type { TrainingFocus, TrainingGoal } from "./profileRestrictionService";

export interface TrainingCycle {
  id: string;
  userId: string;
  name: string;
  goal: TrainingGoal;
  trainingFocus: TrainingFocus[];
  startsOn: string;
  durationWeeks: number;
  targetSessionsPerWeek: number;
  status: "active" | "completed" | "cancelled";
}

interface TrainingCycleRow {
  id: string;
  user_id: string;
  name: string;
  goal: TrainingGoal;
  training_focus: TrainingFocus[];
  starts_on: string;
  duration_weeks: number;
  target_sessions_per_week: number;
  status: TrainingCycle["status"];
}

const columns = "id,user_id,name,goal,training_focus,starts_on,duration_weeks,target_sessions_per_week,status";

function fromRow(row: TrainingCycleRow): TrainingCycle {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    goal: row.goal,
    trainingFocus: row.training_focus,
    startsOn: row.starts_on,
    durationWeeks: row.duration_weeks,
    targetSessionsPerWeek: row.target_sessions_per_week,
    status: row.status,
  };
}

export async function loadActiveTrainingCycle(userId: string): Promise<TrainingCycle | null> {
  const { data, error } = await getSupabaseClient().from("training_cycles")
    .select(columns).eq("user_id", userId).eq("status", "active").maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as TrainingCycleRow) : null;
}

export async function createTrainingCycle(input: Omit<TrainingCycle, "id" | "status">): Promise<TrainingCycle> {
  const { data, error } = await getSupabaseClient().from("training_cycles").insert({
    user_id: input.userId,
    name: input.name.trim(),
    goal: input.goal,
    training_focus: input.trainingFocus,
    starts_on: input.startsOn,
    duration_weeks: input.durationWeeks,
    target_sessions_per_week: input.targetSessionsPerWeek,
  }).select(columns).single();
  if (error) throw error;
  return fromRow(data as TrainingCycleRow);
}

export async function endTrainingCycle(userId: string, cycleId: string): Promise<void> {
  const { error } = await getSupabaseClient().from("training_cycles")
    .update({ status: "completed", ended_at: new Date().toISOString() })
    .eq("id", cycleId).eq("user_id", userId);
  if (error) throw error;
}
