import { assessTrainingFatigue, type FatigueAssessment } from "../lib/fatigueAssessment";
import { addDays, toDateKey } from "../lib/trainingCalendar";
import { loadWorkoutReport } from "./reportService";
import { loadReadinessRange } from "./readinessService";

export async function loadFatigueAssessment(userId: string, referenceDate = new Date()): Promise<FatigueAssessment> {
  const recentEnd = toDateKey(referenceDate);
  const recentStart = toDateKey(addDays(referenceDate, -6));
  const previousEnd = toDateKey(addDays(referenceDate, -7));
  const previousStart = toDateKey(addDays(referenceDate, -13));
  const [recent, previous, readiness] = await Promise.all([
    loadWorkoutReport(userId, recentStart, recentEnd),
    loadWorkoutReport(userId, previousStart, previousEnd),
    loadReadinessRange(userId, recentStart, recentEnd),
  ]);
  return assessTrainingFatigue(recent.workouts, previous.workouts, readiness);
}
