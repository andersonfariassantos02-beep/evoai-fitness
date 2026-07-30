import { addDays, fromDateKey, toDateKey } from "./trainingCalendar";

export interface TrainingCycleSnapshot {
  startsOn: string;
  durationWeeks: number;
  targetSessionsPerWeek: number;
}

export interface TrainingCycleProgress {
  endsOn: string;
  currentWeek: number;
  totalTargetSessions: number;
  completedSessions: number;
  progressPercent: number;
  completed: boolean;
}

export function calculateTrainingCycleProgress(
  cycle: TrainingCycleSnapshot,
  completedSessions: number,
  referenceDate = new Date(),
): TrainingCycleProgress {
  const start = fromDateKey(cycle.startsOn);
  const endsOn = toDateKey(addDays(start, cycle.durationWeeks * 7 - 1));
  const elapsedDays = Math.floor((referenceDate.getTime() - start.getTime()) / 86_400_000);
  const currentWeek = Math.min(cycle.durationWeeks, Math.max(1, Math.floor(elapsedDays / 7) + 1));
  const totalTargetSessions = cycle.durationWeeks * cycle.targetSessionsPerWeek;
  return {
    endsOn,
    currentWeek,
    totalTargetSessions,
    completedSessions,
    progressPercent: totalTargetSessions ? Math.min(100, Math.round(completedSessions / totalTargetSessions * 100)) : 0,
    completed: toDateKey(referenceDate) > endsOn,
  };
}
