import { addDays, fromDateKey, toDateKey } from "../lib/trainingCalendar";
import { DEFAULT_DELOAD_REDUCTION_PERCENT } from "../lib/deload";
import { getSupabaseClient } from "../lib/supabase";

export interface DeloadPeriod {
  id: string;
  userId: string;
  startsOn: string;
  endsOn: string;
  status: "active" | "completed" | "cancelled";
  volumeReductionPercent: number;
  targetRpeMin: number;
  targetRpeMax: number;
  reason: string;
}

interface DeloadRow {
  id: string;
  user_id: string;
  starts_on: string;
  ends_on: string;
  status: DeloadPeriod["status"];
  volume_reduction_percent: number;
  target_rpe_min: number | string;
  target_rpe_max: number | string;
  reason: string;
}

const columns = "id,user_id,starts_on,ends_on,status,volume_reduction_percent,target_rpe_min,target_rpe_max,reason";

function fromRow(row: DeloadRow): DeloadPeriod {
  return {
    id: row.id,
    userId: row.user_id,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    status: row.status,
    volumeReductionPercent: row.volume_reduction_percent,
    targetRpeMin: Number(row.target_rpe_min),
    targetRpeMax: Number(row.target_rpe_max),
    reason: row.reason,
  };
}

export async function loadActiveDeload(userId: string, date: string): Promise<DeloadPeriod | null> {
  const { data, error } = await getSupabaseClient()
    .from("training_deload_periods")
    .select(columns)
    .eq("user_id", userId)
    .eq("status", "active")
    .lte("starts_on", date)
    .gte("ends_on", date)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as DeloadRow) : null;
}

export async function startDeload(
  userId: string,
  startsOn: string,
  reason: string,
  volumeReductionPercent = DEFAULT_DELOAD_REDUCTION_PERCENT,
): Promise<DeloadPeriod> {
  const existing = await loadActiveDeload(userId, startsOn);
  if (existing) return existing;
  const endsOn = toDateKey(addDays(fromDateKey(startsOn), 6));
  const { data, error } = await getSupabaseClient()
    .from("training_deload_periods")
    .insert({
      user_id: userId,
      starts_on: startsOn,
      ends_on: endsOn,
      volume_reduction_percent: volumeReductionPercent,
      target_rpe_min: 6,
      target_rpe_max: 7,
      reason,
    })
    .select(columns)
    .single();
  if (error) throw error;
  return fromRow(data as DeloadRow);
}

export async function endDeload(userId: string, periodId: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .from("training_deload_periods")
    .update({ status: "completed", ended_at: new Date().toISOString() })
    .eq("id", periodId)
    .eq("user_id", userId);
  if (error) throw error;
}
