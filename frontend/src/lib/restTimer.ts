export type RestKind = "between_sets" | "between_exercises";

export interface RestPrescription {
  kind: RestKind;
  seconds: number;
  label: string;
}

export function getRestPrescription(
  restSeconds: number,
  transitionRestSeconds: number,
  changesExercise: boolean,
): RestPrescription {
  const fallback = changesExercise ? 180 : 120;
  const prescribed = changesExercise ? transitionRestSeconds : restSeconds;
  return {
    kind: changesExercise ? "between_exercises" : "between_sets",
    seconds: Math.max(30, Math.min(600, Math.round(prescribed || fallback))),
    label: changesExercise ? "Descanso entre exercícios" : "Descanso entre séries",
  };
}

export function getRemainingSeconds(endsAtMs: number, nowMs = Date.now()) {
  return Math.max(0, Math.ceil((endsAtMs - nowMs) / 1000));
}

export function formatRestTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function findNextPendingIndex(completed: boolean[], currentIndex: number) {
  if (!completed.length) return -1;
  for (let offset = 1; offset <= completed.length; offset += 1) {
    const index = (currentIndex + offset) % completed.length;
    if (!completed[index]) return index;
  }
  return -1;
}
