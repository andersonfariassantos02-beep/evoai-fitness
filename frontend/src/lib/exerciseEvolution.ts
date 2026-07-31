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

export type ExerciseTrendStatus = "insufficient" | "progressing" | "stable" | "declining";

export interface ExerciseTrend {
  status: ExerciseTrendStatus;
  title: string;
  recommendation: string;
  latestChange: number | null;
  sessionsSinceBest: number;
  best: ExerciseEvolutionPoint | null;
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

export function latestEvolutionChange(points: ExerciseEvolutionPoint[], metric: keyof Omit<ExerciseEvolutionPoint, "date">) {
  if (points.length < 2) return null;
  const previous = points[points.length - 2][metric];
  const latest = points[points.length - 1][metric];
  if (!previous) return null;
  return Math.round(((latest - previous) / previous) * 1000) / 10;
}

export function analyzeExerciseTrend(
  points: ExerciseEvolutionPoint[],
  metric: keyof Omit<ExerciseEvolutionPoint, "date"> = "estimated1Rm",
): ExerciseTrend {
  if (!points.length) {
    return {
      status: "insufficient",
      title: "Sem histórico válido",
      recommendation: "Conclua uma série com carga e repetições para criar sua referência.",
      latestChange: null,
      sessionsSinceBest: 0,
      best: null,
    };
  }

  const bestIndex = points.reduce((currentBest, point, index) =>
    point[metric] >= points[currentBest][metric] ? index : currentBest, 0);
  const best = points[bestIndex];
  const sessionsSinceBest = points.length - 1 - bestIndex;
  const latestChange = latestEvolutionChange(points, metric);
  if (points.length < 2) {
    return {
      status: "insufficient",
      title: "Referência inicial criada",
      recommendation: "Repita o exercício para que o EvoAI consiga identificar uma tendência.",
      latestChange,
      sessionsSinceBest,
      best,
    };
  }

  if ((latestChange ?? 0) <= -2) {
    return {
      status: "declining",
      title: "Desempenho em queda",
      recommendation: "Mantenha ou reduza a carga e priorize técnica e recuperação antes de progredir.",
      latestChange,
      sessionsSinceBest,
      best,
    };
  }

  if ((latestChange ?? 0) >= 1) {
    return {
      status: "progressing",
      title: "Progressão confirmada",
      recommendation: "Mantenha a estratégia atual e só aumente a carga quando repetir o topo da faixa com RPE controlado.",
      latestChange,
      sessionsSinceBest,
      best,
    };
  }

  const recent = points.slice(-3);
  const stagnant = recent.length === 3
    && recent.every((point) => Math.abs((point[metric] - recent[0][metric]) / Math.max(recent[0][metric], 1)) < .02);
  return {
    status: "stable",
    title: stagnant ? "Estagnação detectada" : "Desempenho estável",
    recommendation: stagnant
      ? "Há três sessões sem avanço relevante. Revise recuperação, execução e faixa de repetições antes de aumentar o peso."
      : "Consolide as repetições e o RPE atual antes de aumentar a carga.",
    latestChange,
    sessionsSinceBest,
    best,
  };
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
