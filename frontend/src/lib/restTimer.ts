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

export interface PersistedRestTimer {
  sourceExerciseId: string;
  sourceSetId: string;
  nextSetId: string;
  kind: RestKind;
  label: string;
  nextLabel: string;
  targetSeconds: number;
  startedAtMs: number;
  endsAtMs: number;
  remainingSeconds: number;
  paused: boolean;
  ready: boolean;
}

export function restoreRestTimer(
  value: unknown,
  validSetIds: Set<string>,
  validExerciseIds: Set<string>,
  nowMs = Date.now(),
): PersistedRestTimer | null {
  if (!value || typeof value !== "object") return null;
  const timer = value as Partial<PersistedRestTimer>;
  if (
    typeof timer.sourceExerciseId !== "string"
    || typeof timer.sourceSetId !== "string"
    || typeof timer.nextSetId !== "string"
    || !validExerciseIds.has(timer.sourceExerciseId)
    || !validSetIds.has(timer.sourceSetId)
    || !validSetIds.has(timer.nextSetId)
    || typeof timer.startedAtMs !== "number"
    || typeof timer.endsAtMs !== "number"
    || typeof timer.targetSeconds !== "number"
    || typeof timer.label !== "string"
    || typeof timer.nextLabel !== "string"
    || (timer.kind !== "between_sets" && timer.kind !== "between_exercises")
  ) return null;
  const remainingSeconds = timer.paused
    ? Math.max(0, Math.round(Number(timer.remainingSeconds ?? 0)))
    : getRemainingSeconds(timer.endsAtMs, nowMs);
  return {
    sourceExerciseId: timer.sourceExerciseId,
    sourceSetId: timer.sourceSetId,
    nextSetId: timer.nextSetId,
    kind: timer.kind,
    label: timer.label,
    nextLabel: timer.nextLabel,
    targetSeconds: Math.max(0, Math.round(timer.targetSeconds)),
    startedAtMs: timer.startedAtMs,
    endsAtMs: timer.endsAtMs,
    remainingSeconds,
    paused: Boolean(timer.paused),
    ready: remainingSeconds === 0 || Boolean(timer.ready),
  };
}
