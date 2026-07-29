import { assessTrainingFatigue, type FatigueAssessment } from "../lib/fatigueAssessment";
import { addDays, toDateKey } from "../lib/trainingCalendar";
import { loadWorkoutReport } from "./reportService";

export async function loadFatigueAssessment(userId: string, referenceDate = new Date()): Promise<FatigueAssessment> {
  const recentEnd = toDateKey(referenceDate);
  const recentStart = toDateKey(addDays(referenceDate, -6));
  const previousEnd = toDateKey(addDays(referenceDate, -7));
  const previousStart = toDateKey(addDays(referenceDate, -13));
  const [recent, previous] = await Promise.all([
    loadWorkoutReport(userId, recentStart, recentEnd),
    loadWorkoutReport(userId, previousStart, previousEnd),
  ]);
  return assessTrainingFatigue(recent.workouts, previous.workouts);
}
