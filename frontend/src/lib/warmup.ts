export interface WarmupPrescription {
  setNumber: number;
  reps: number;
  loadKg: number;
}

function roundToHalf(value: number) {
  return Math.max(0, Math.round(value * 2) / 2);
}

export function buildWarmupPrescription(workingLoadKg: number): WarmupPrescription[] {
  if (!Number.isFinite(workingLoadKg) || workingLoadKg <= 0) return [];
  return [
    { setNumber: 1, reps: 10, loadKg: roundToHalf(workingLoadKg * 0.5) },
    { setNumber: 2, reps: 5, loadKg: roundToHalf(workingLoadKg * 0.7) },
  ];
}
