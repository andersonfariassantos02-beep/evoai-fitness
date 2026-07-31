import { useEffect, useMemo, useState } from "react";
import { analyzeExerciseTrend, chartCoordinates, latestEvolutionChange, type ExerciseEvolution } from "../lib/exerciseEvolution";

type Metric = "loadKg" | "reps" | "volume" | "estimated1Rm";

const METRICS: Array<{ key: Metric; label: string; unit: string }> = [
  { key: "loadKg", label: "Melhor carga", unit: "kg" },
  { key: "reps", label: "Repetições", unit: "reps" },
  { key: "volume", label: "Volume", unit: "kg" },
  { key: "estimated1Rm", label: "1RM estimada", unit: "kg" },
];

function shortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(`${value}T12:00:00`));
}

export default function ExerciseEvolutionPanel({
  exercises,
  selectedExerciseKey,
  onSelectExercise,
  periodLabel = "Últimos 90 dias",
}: {
  exercises: ExerciseEvolution[];
  selectedExerciseKey?: string;
  onSelectExercise?: (key: string) => void;
  periodLabel?: string;
}) {
  const [internalExerciseKey, setInternalExerciseKey] = useState(exercises[0]?.key ?? "");
  const [metric, setMetric] = useState<Metric>("loadKg");
  const exerciseKey = selectedExerciseKey ?? internalExerciseKey;
  const selectExercise = (key: string) => {
    if (selectedExerciseKey === undefined) setInternalExerciseKey(key);
    onSelectExercise?.(key);
  };
  useEffect(() => {
    if (!exercises.some((exercise) => exercise.key === exerciseKey)) selectExercise(exercises[0]?.key ?? "");
  }, [exerciseKey, exercises]);
  const exercise = exercises.find((item) => item.key === exerciseKey) ?? exercises[0];
  const definition = METRICS.find((item) => item.key === metric) ?? METRICS[0];
  const values = exercise?.points.map((point) => point[metric]) ?? [];
  const coordinates = useMemo(() => chartCoordinates(values), [values]);
  const path = coordinates.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  const variation = exercise ? latestEvolutionChange(exercise.points, metric) : null;
  const trend = exercise ? analyzeExerciseTrend(exercise.points, metric) : null;
  const latest = values.at(-1);
  const previous = values.at(-2);

  return <section className="exercise-evolution" aria-labelledby="exercise-evolution-title">
    <header>
      <div><span className="eyebrow">EVOLUÇÃO POR EXERCÍCIO</span><h2 id="exercise-evolution-title">{periodLabel}</h2><p>Somente treinos reais concluídos entram nesta tendência.</p></div>
      {exercises.length > 0 && <label>Exercício<select aria-label="Exercício do gráfico" value={exercise?.key ?? ""} onChange={(event) => selectExercise(event.target.value)}>
        {exercises.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}
      </select></label>}
    </header>
    {!exercise && <div className="report-empty">Conclua pelo menos um treino real com carga e repetições para iniciar o gráfico.</div>}
    {exercise && <>
      <div className="evolution-metrics" role="tablist" aria-label="Métrica do gráfico">
        {METRICS.map((item) => <button type="button" role="tab" aria-selected={metric === item.key} className={metric === item.key ? "active" : ""} key={item.key} onClick={() => setMetric(item.key)}>{item.label}</button>)}
      </div>
      <div className="evolution-summary">
        <div><span>Valor mais recente</span><strong>{latest?.toLocaleString("pt-BR")} <small>{definition.unit}</small></strong></div>
        <div><span>Sessão anterior</span><strong>{previous === undefined ? "Sem referência" : `${previous.toLocaleString("pt-BR")} ${definition.unit}`}</strong></div>
        <div><span>Comparação com a anterior</span><strong className={(variation ?? 0) >= 0 ? "positive" : "negative"}>{variation === null ? "Referência inicial" : `${variation > 0 ? "+" : ""}${variation.toLocaleString("pt-BR")}%`}</strong></div>
        <div><span>Melhor marca do período</span><strong>{trend?.best ? `${trend.best[metric].toLocaleString("pt-BR")} ${definition.unit}` : "—"}</strong></div>
      </div>
      {trend && <aside className={`evolution-insight evolution-insight--${trend.status}`}>
        <div><span>LEITURA DO EVOAI</span><strong>{trend.title}</strong><p>{trend.recommendation}</p></div>
        <small>{trend.sessionsSinceBest === 0 ? "Melhor marca na sessão mais recente" : `${trend.sessionsSinceBest} sessão(ões) desde a melhor marca`}</small>
      </aside>}
      <div className="evolution-chart">
        <svg viewBox="0 0 640 220" role="img" aria-label={`${definition.label} de ${exercise.name} ao longo de ${exercise.points.length} sessões`}>
          <line x1="28" y1="192" x2="612" y2="192" />
          <line x1="28" y1="28" x2="28" y2="192" />
          {coordinates.length > 1 && <path d={path} />}
          {coordinates.map((point, index) => <g key={exercise.points[index].date}>
            <circle cx={point.x} cy={point.y} r="5" />
            <text x={point.x} y={Math.max(18, point.y - 12)} textAnchor="middle">{values[index].toLocaleString("pt-BR")}</text>
            <text className="date" x={point.x} y="211" textAnchor="middle">{shortDate(exercise.points[index].date)}</text>
          </g>)}
        </svg>
      </div>
      {exercise.points.length < 2 && <p className="evolution-note">Este é o ponto de referência. A tendência aparecerá após outra execução válida do exercício.</p>}
    </>}
  </section>;
}
