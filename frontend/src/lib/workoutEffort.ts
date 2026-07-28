export function rpeFromRepsInReserve(repsInReserve: number): number {
  if (repsInReserve <= 0) return 10;
  if (repsInReserve === 1) return 9;
  if (repsInReserve === 2) return 8;
  if (repsInReserve === 3) return 7;
  return 6;
}

export function repsInReserveFromRpe(rpe: number | null): string {
  if (rpe == null) return "";
  if (rpe >= 10) return "0";
  if (rpe >= 9) return "1";
  if (rpe >= 8) return "2";
  if (rpe >= 7) return "3";
  return "4";
}
