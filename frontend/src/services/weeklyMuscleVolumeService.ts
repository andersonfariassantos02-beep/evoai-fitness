import { summarizePerformedMuscleVolume, type MuscleVolumeSummary } from "../lib/trainingVolume";
import { loadExerciseCatalog } from "./exerciseCatalogService";
import { loadWorkoutReport } from "./reportService";

export async function loadWeeklyMuscleVolume(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<MuscleVolumeSummary[]> {
  const [report, catalog] = await Promise.all([
    loadWorkoutReport(userId, startDate, endDate),
    loadExerciseCatalog(),
  ]);
  return summarizePerformedMuscleVolume(
    report.workouts.flatMap((workout) => workout.exercises.map((exercise) => ({
      key: exercise.key,
      completedSets: exercise.sets.filter((set) => !set.skipped && set.reps > 0).length,
    }))),
    catalog,
  );
}
