import type { ReportWorkout } from "../services/reportService";

export interface ExerciseEvolutionPoint {
  date: string;
  loadKg: number;
  reps: number;
  volume: number;
  estimated1Rm: number;
}

export interface ExerciseEvolution {
  key: string;
  name: string;
  points: ExerciseEvolutionPoint[];
}

export function buildExerciseEvolution(workouts: ReportWorkout[]): ExerciseEvolution[] {
  const grouped = new Map<string, ExerciseEvolution>();
  [...workouts]
    .sort((left, right) => left.date.localeCompare(right.date))
    .forEach((workout) => workout.exercises.forEach((exercise) => {
      if (!exercise.bestSet || exercise.estimated1Rm === null) return;
      const current = grouped.get(exercise.key) ?? { key: exercise.key, name: exercise.name, points: [] };
      current.name = exercise.name;
      current.points.push({
        date: workout.date,
        loadKg: exercise.bestSet.loadKg,
        reps: exercise.bestSet.reps,
        volume: exercise.volume,
        estimated1Rm: exercise.estimated1Rm,
      });
      grouped.set(exercise.key, current);
    }));
  return [...grouped.values()]
    .filter((exercise) => exercise.points.length > 0)
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}

export function evolutionChange(points: ExerciseEvolutionPoint[], metric: keyof Omit<ExerciseEvolutionPoint, "date">) {
  if (points.length < 2) return null;
  const first = points[0][metric];
  const last = points[points.length - 1][metric];
  if (!first) return null;
  return Math.round(((last - first) / first) * 1000) / 10;
}

export function chartCoordinates(values: number[], width = 640, height = 220, padding = 28) {
  if (!values.length) return [];
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum || 1;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  return values.map((value, index) => ({
    x: padding + (values.length === 1 ? usableWidth / 2 : index / (values.length - 1) * usableWidth),
    y: padding + (maximum - value) / range * usableHeight,
  }));
}
