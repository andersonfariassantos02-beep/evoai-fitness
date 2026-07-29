import { getSupabaseClient } from "../lib/supabase";
import type { ReadinessCheckIn } from "../lib/readiness";

export interface DailyReadinessRecord extends ReadinessCheckIn {
  id: string;
  date: string;
}

interface ReadinessRow {
  id: string;
  checkin_date: string;
  sleep_hours: number | string;
  energy: number;
  soreness: number;
  fatigue: number;
  joint_discomfort: boolean;
  available_minutes: number;
}

function fromRow(row: ReadinessRow): DailyReadinessRecord {
  return {
    id: row.id,
    date: row.checkin_date,
    sleepHours: Number(row.sleep_hours),
    energy: row.energy,
    soreness: row.soreness,
    fatigue: row.fatigue,
    jointDiscomfort: row.joint_discomfort,
    availableMinutes: row.available_minutes,
  };
}

export async function loadDailyReadiness(userId: string, date: string): Promise<DailyReadinessRecord | null> {
  const { data, error } = await getSupabaseClient()
    .from("daily_readiness_checkins")
    .select("id,checkin_date,sleep_hours,energy,soreness,fatigue,joint_discomfort,available_minutes")
    .eq("user_id", userId)
    .eq("checkin_date", date)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as ReadinessRow) : null;
}

export async function loadReadinessRange(userId: string, startDate: string, endDate: string): Promise<DailyReadinessRecord[]> {
  const { data, error } = await getSupabaseClient()
    .from("daily_readiness_checkins")
    .select("id,checkin_date,sleep_hours,energy,soreness,fatigue,joint_discomfort,available_minutes")
    .eq("user_id", userId)
    .gte("checkin_date", startDate)
    .lte("checkin_date", endDate)
    .order("checkin_date", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as ReadinessRow[]).map(fromRow);
}

export async function saveDailyReadiness(userId: string, date: string, checkIn: ReadinessCheckIn): Promise<void> {
  const { error } = await getSupabaseClient()
    .from("daily_readiness_checkins")
    .upsert({
      user_id: userId,
      checkin_date: date,
      sleep_hours: checkIn.sleepHours,
      energy: checkIn.energy,
      soreness: checkIn.soreness,
      fatigue: checkIn.fatigue,
      joint_discomfort: checkIn.jointDiscomfort,
      available_minutes: checkIn.availableMinutes,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,checkin_date" });
  if (error) throw error;
}
