import type { MuscleGroup } from "./workoutTemplates";

export type MuscleRecoveryStatus = "recovering" | "attention" | "ready";

export interface MuscleStimulus {
  muscle: MuscleGroup;
  completedAt: string;
  completedSets: number;
  averageRpe: number | null;
}

export interface MuscleRecovery {
  muscle: MuscleGroup;
  status: MuscleRecoveryStatus;
  lastStimulusAt: string | null;
  recoveryHours: number;
  remainingHours: number;
  completedSets: number;
}

function recoveryWindow(stimulus: MuscleStimulus) {
  if (stimulus.completedSets >= 10 || (stimulus.averageRpe ?? 0) >= 9) return 72;
  if (stimulus.completedSets >= 6 || (stimulus.averageRpe ?? 0) >= 8) return 60;
  return 48;
}

export function calculateMuscleRecovery(
  muscles: MuscleGroup[],
  stimuli: MuscleStimulus[],
  now = new Date(),
): MuscleRecovery[] {
  return muscles.map((muscle) => {
    const latest = stimuli
      .filter((item) => item.muscle === muscle)
      .sort((left, right) => right.completedAt.localeCompare(left.completedAt))[0];
    if (!latest) return { muscle, status: "ready", lastStimulusAt: null, recoveryHours: 0, remainingHours: 0, completedSets: 0 };
    const recoveryHours = recoveryWindow(latest);
    const elapsedHours = Math.max(0, (now.getTime() - new Date(latest.completedAt).getTime()) / 3_600_000);
    const remainingHours = Math.max(0, Math.ceil(recoveryHours - elapsedHours));
    const status: MuscleRecoveryStatus = remainingHours === 0 ? "ready" : remainingHours <= 12 ? "attention" : "recovering";
    return { muscle, status, lastStimulusAt: latest.completedAt, recoveryHours, remainingHours, completedSets: latest.completedSets };
  });
}
