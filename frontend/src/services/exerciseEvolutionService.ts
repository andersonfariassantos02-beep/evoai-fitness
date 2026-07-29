import { buildExerciseEvolution, type ExerciseEvolution } from "../lib/exerciseEvolution";
import { addDays, fromDateKey, toDateKey } from "../lib/trainingCalendar";
import { loadWorkoutReport } from "./reportService";

export async function loadExerciseEvolution(
  userId: string,
  endDate: string,
  lookbackDays = 90,
): Promise<ExerciseEvolution[]> {
  const end = fromDateKey(endDate);
  const startDate = toDateKey(addDays(end, -(lookbackDays - 1)));
  const report = await loadWorkoutReport(userId, startDate, endDate);
  return buildExerciseEvolution(report.workouts);
}
