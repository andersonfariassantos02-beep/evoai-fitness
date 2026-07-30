import { getSupabaseClient } from "../lib/supabase";

export interface BodyMeasurement {
  id: string;
  measuredOn: string;
  weightKg: number | null;
  bodyFatPercentage: number | null;
  waistCm: number | null;
  chestCm: number | null;
  hipsCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  notes: string;
}

export interface BodyMeasurementInput {
  measuredOn: string;
  weightKg: string;
  bodyFatPercentage: string;
  waistCm: string;
  chestCm: string;
  hipsCm: string;
  armCm: string;
  thighCm: string;
  notes: string;
}

interface BodyMeasurementRow {
  id: string;
  measured_on: string;
  weight_kg: number | null;
  body_fat_percentage: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  hips_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  notes: string | null;
}

const columns = "id,measured_on,weight_kg,body_fat_percentage,waist_cm,chest_cm,hips_cm,arm_cm,thigh_cm,notes";

const ranges = {
  weightKg: [20, 400],
  bodyFatPercentage: [2, 70],
  waistCm: [30, 300],
  chestCm: [30, 300],
  hipsCm: [30, 300],
  armCm: [10, 100],
  thighCm: [20, 150],
} as const;

function optionalNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function validateBodyMeasurement(input: BodyMeasurementInput) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.measuredOn)) return "Informe a data da medição.";
  const values = Object.entries(ranges).map(([field, [minimum, maximum]]) => {
    const value = optionalNumber(input[field as keyof typeof ranges]);
    return { field, value, minimum, maximum };
  });
  if (values.every(({ value }) => value === null)) return "Informe pelo menos uma medida.";
  if (values.some(({ value, minimum, maximum }) => value !== null && (!Number.isFinite(value) || value < minimum || value > maximum))) {
    return "Revise os valores informados; há uma medida fora da faixa esperada.";
  }
  if (input.notes.trim().length > 500) return "Use no máximo 500 caracteres nas observações.";
  return "";
}

function fromRow(row: BodyMeasurementRow): BodyMeasurement {
  return {
    id: row.id,
    measuredOn: row.measured_on,
    weightKg: row.weight_kg,
    bodyFatPercentage: row.body_fat_percentage,
    waistCm: row.waist_cm,
    chestCm: row.chest_cm,
    hipsCm: row.hips_cm,
    armCm: row.arm_cm,
    thighCm: row.thigh_cm,
    notes: row.notes ?? "",
  };
}

export async function loadBodyMeasurements(userId: string): Promise<BodyMeasurement[]> {
  const { data, error } = await getSupabaseClient().from("body_measurements")
    .select(columns)
    .eq("user_id", userId)
    .order("measured_on", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as BodyMeasurementRow[]).map(fromRow);
}

export async function saveBodyMeasurement(userId: string, input: BodyMeasurementInput): Promise<void> {
  const validation = validateBodyMeasurement(input);
  if (validation) throw new Error(validation);
  const payload = {
    user_id: userId,
    measured_on: input.measuredOn,
    weight_kg: optionalNumber(input.weightKg),
    body_fat_percentage: optionalNumber(input.bodyFatPercentage),
    waist_cm: optionalNumber(input.waistCm),
    chest_cm: optionalNumber(input.chestCm),
    hips_cm: optionalNumber(input.hipsCm),
    arm_cm: optionalNumber(input.armCm),
    thigh_cm: optionalNumber(input.thighCm),
    notes: input.notes.trim() || null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await getSupabaseClient().from("body_measurements")
    .upsert(payload, { onConflict: "user_id,measured_on" });
  if (error) throw error;
}

export async function deleteBodyMeasurement(userId: string, measurementId: string): Promise<void> {
  const { error } = await getSupabaseClient().from("body_measurements")
    .delete()
    .eq("id", measurementId)
    .eq("user_id", userId);
  if (error) throw error;
}
