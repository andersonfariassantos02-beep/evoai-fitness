import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { previousReportRange, reportRange, type ReportPeriod } from "../lib/reportPeriod";
import { saveReportPdf, shareReportPdf } from "../lib/reportPdf";
import { loadProfileDisplayName } from "../services/profileRestrictionService";
import ExerciseEvolutionPanel from "../components/ExerciseEvolutionPanel";
import { loadExerciseEvolution } from "../services/exerciseEvolutionService";
import type { ExerciseEvolution } from "../lib/exerciseEvolution";
import {
  confirmPasswordAndDeleteUnfinishedWorkout,
  loadUnfinishedWorkouts,
  loadWorkoutReport,
  type UnfinishedWorkout,
  type WorkoutReport,
  type BodyProgressMetric,
} from "../services/reportService";

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(`${value}T12:00:00`));
}

function change(current: number, previous: number) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function ChangeBadge({ value }: { value: number | null }) {
  if (value === null) return <small>Sem período anterior</small>;
  return <small className={value >= 0 ? "report-change report-change--up" : "report-change report-change--down"}>
    {value > 0 ? "+" : ""}{value}% vs. período anterior
  </small>;
}

function BodyMetric({
  label,
  metric,
  unit,
}: {
  label: string;
  metric: BodyProgressMetric | null;
  unit: string;
}) {
  if (!metric) return null;
  const changeLabel = `${metric.change > 0 ? "+" : ""}${metric.change.toLocaleString("pt-BR")} ${unit}`;
  return (
    <article>
      <span>{label}</span>
      <strong>{metric.initial.toLocaleString("pt-BR")} → {metric.final.toLocaleString("pt-BR")} <i>{unit}</i></strong>
      <small className={metric.change === 0 ? "" : metric.change < 0 ? "report-change report-change--down" : "report-change report-change--up"}>
        Variação: {changeLabel}
      </small>
    </article>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<ReportPeriod>("weekly");
  const [anchor, setAnchor] = useState(todayKey);
  const [report, setReport] = useState<WorkoutReport | null>(null);
  const [previous, setPrevious] = useState<WorkoutReport | null>(null);
  const [unfinished, setUnfinished] = useState<UnfinishedWorkout[]>([]);
  const [evolution, setEvolution] = useState<ExerciseEvolution[]>([]);
  const [deleting, setDeleting] = useState<UnfinishedWorkout | null>(null);
  const [password, setPassword] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");
  const fallbackAthleteName = String(user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Atleta");
  const [athleteName, setAthleteName] = useState(fallbackAthleteName);
  const currentRange = useMemo(() => reportRange(period, anchor), [anchor, period]);

  useEffect(() => {
    if (!user) return;
    setAthleteName(fallbackAthleteName);
    void loadProfileDisplayName(user.id)
      .then((name) => { if (name) setAthleteName(name); })
      .catch(() => undefined);
  }, [fallbackAthleteName, user]);

  async function generate() {
    if (!user) return;
    setLoading(true);
    setMessage("");
    try {
      const previousRange = previousReportRange(period, currentRange.startDate);
      const [currentReport, previousReport, unfinishedWorkouts, exerciseEvolution] = await Promise.all([
        loadWorkoutReport(user.id, currentRange.startDate, currentRange.endDate),
        loadWorkoutReport(user.id, previousRange.startDate, previousRange.endDate),
        loadUnfinishedWorkouts(user.id, currentRange.startDate, currentRange.endDate),
        loadExerciseEvolution(user.id, currentRange.endDate).catch(() => []),
      ]);
      setReport(currentReport);
      setPrevious(previousReport);
      setUnfinished(unfinishedWorkouts);
      setEvolution(exerciseEvolution);
      if (!currentReport.completedSessions) setMessage("Nenhum treino real concluído neste período.");
    } catch {
      setMessage("Não foi possível carregar o relatório. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function exportPdf(share: boolean) {
    if (!report) return;
    setExporting(true);
    setMessage("");
    try {
      if (share) {
        const shared = await shareReportPdf(report, previous, athleteName);
        if (!shared) setMessage("O compartilhamento direto não está disponível neste aparelho. O PDF foi salvo para você enviar manualmente.");
      } else {
        await saveReportPdf(report, previous, athleteName);
        setMessage("PDF gerado com sucesso.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("Não foi possível gerar o PDF.");
    } finally {
      setExporting(false);
    }
  }

  async function deleteUnfinishedWorkout(event: FormEvent) {
    event.preventDefault();
    if (!user || !deleting) return;
    setDeleteBusy(true);
    setMessage("");
    try {
      await confirmPasswordAndDeleteUnfinishedWorkout(user.id, deleting.id, password);
      setUnfinished((current) => current.filter((workout) => workout.id !== deleting.id));
      setDeleting(null);
      setPassword("");
      setMessage("Treino de teste excluído definitivamente.");
    } catch (error) {
      setMessage(error instanceof Error && error.message === "INVALID_PASSWORD"
        ? "Senha incorreta. O treino não foi excluído."
        : "Não foi possível excluir o treino. Atualize a página e tente novamente.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <main className="reports-page">
      <header className="reports-header">
        <div><span className="eyebrow">EVOLUÇÃO E HISTÓRICO</span><h1>Relatórios</h1><p>Analise seus treinos reais, cargas e consistência ao longo do tempo.</p></div>
      </header>

      <section className="report-controls" aria-label="Configurar relatório">
        <div className="report-period-toggle" role="tablist" aria-label="Período do relatório">
          <button type="button" role="tab" aria-selected={period === "weekly"} className={period === "weekly" ? "active" : ""} onClick={() => { setPeriod("weekly"); setReport(null); setUnfinished([]); setEvolution([]); }}>Semanal</button>
          <button type="button" role="tab" aria-selected={period === "monthly"} className={period === "monthly" ? "active" : ""} onClick={() => { setPeriod("monthly"); setReport(null); setUnfinished([]); setEvolution([]); }}>Mensal</button>
        </div>
        <label>{period === "weekly" ? "Escolha uma data da semana" : "Escolha o mês"}
          <input
            type={period === "weekly" ? "date" : "month"}
            value={period === "weekly" ? anchor : anchor.slice(0, 7)}
            onChange={(event) => setAnchor(period === "weekly" ? event.target.value : `${event.target.value}-01`)}
          />
        </label>
        <div className="report-range"><span>Período analisado</span><strong>{formatDate(currentRange.startDate)} a {formatDate(currentRange.endDate)}</strong></div>
        <button className="report-generate" type="button" disabled={loading} onClick={() => void generate()}>{loading ? "Gerando…" : "Gerar relatório"}</button>
      </section>

      {message && <p className="report-message" role="status">{message}</p>}

      {report && (
        <>
          {unfinished.length > 0 && (
            <section className="report-unfinished" aria-labelledby="unfinished-workouts-title">
              <header>
                <div>
                  <span className="eyebrow">AÇÃO NECESSÁRIA</span>
                  <h2 id="unfinished-workouts-title">Treinos aguardando finalização</h2>
                  <p>Estes treinos ainda não entram no relatório. Continue a sessão e finalize-a para incluir os dados.</p>
                </div>
                <strong>{unfinished.length}</strong>
              </header>
              <div className="report-unfinished__list">
                {unfinished.map((workout) => (
                  <article key={workout.id}>
                    <div>
                      <small>{formatDate(workout.date)} · {workout.status === "paused" ? "Pausado" : "Em andamento"}</small>
                      <h3>{workout.label}</h3>
                      <span>{workout.completedSets} de {workout.totalSets} séries registradas</span>
                    </div>
                    <div className="report-unfinished__actions">
                      <Link to={`/preparar-treino/${workout.date}?label=${encodeURIComponent(workout.label)}&planned=0`}>
                        Continuar e finalizar
                      </Link>
                      <button type="button" onClick={() => { setDeleting(workout); setPassword(""); setMessage(""); }}>
                        Excluir registro
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="report-summary" aria-label="Resumo do relatório">
            <article><span>Treinos realizados</span><strong>{report.completedSessions}</strong><ChangeBadge value={change(report.completedSessions, previous?.completedSessions ?? 0)} /></article>
            <article><span>Adesão</span><strong>{report.adherence}%</strong><small>{report.plannedSessions} dia(s) disponível(is)</small></article>
            <article><span>Volume total</span><strong>{report.totalVolume.toLocaleString("pt-BR")} <i>kg</i></strong><ChangeBadge value={change(report.totalVolume, previous?.totalVolume ?? 0)} /></article>
            <article><span>RPE médio</span><strong>{report.averageRpe ?? "-"}</strong><small>{report.completedSets} séries realizadas</small></article>
          </section>

          {report.bodyProgress && (
            <section className="report-body-progress" aria-labelledby="body-progress-title">
              <header>
                <div>
                  <span className="eyebrow">EVOLUÇÃO CORPORAL</span>
                  <h2 id="body-progress-title">Medidas do período</h2>
                  <p>{report.bodyProgress.entries.length} registro(s) entre {formatDate(report.startDate)} e {formatDate(report.endDate)}.</p>
                </div>
                <Link to="/evolucao">Ver histórico completo</Link>
              </header>
              <div className="report-body-progress__metrics">
                <BodyMetric label="Peso" metric={report.bodyProgress.weightKg} unit="kg" />
                <BodyMetric label="Gordura corporal" metric={report.bodyProgress.bodyFatPercentage} unit="%" />
                <BodyMetric label="Cintura" metric={report.bodyProgress.waistCm} unit="cm" />
                <BodyMetric label="Peitoral" metric={report.bodyProgress.chestCm} unit="cm" />
                <BodyMetric label="Quadril" metric={report.bodyProgress.hipsCm} unit="cm" />
                <BodyMetric label="Braço" metric={report.bodyProgress.armCm} unit="cm" />
                <BodyMetric label="Coxa" metric={report.bodyProgress.thighCm} unit="cm" />
              </div>
            </section>
          )}

          <ExerciseEvolutionPanel exercises={evolution} />

          <section className="report-detail">
            <div className="report-detail__header">
              <div><span className="eyebrow">DETALHAMENTO</span><h2>Treinos do período</h2></div>
              <div className="report-actions">
                <button type="button" disabled={exporting || (!report.completedSessions && !report.bodyProgress)} onClick={() => void exportPdf(false)}>Salvar PDF</button>
                <button className="report-share" type="button" disabled={exporting || (!report.completedSessions && !report.bodyProgress)} onClick={() => void exportPdf(true)}>Compartilhar</button>
              </div>
            </div>

            {!report.workouts.length && <div className="report-empty">
              {report.bodyProgress
                ? "Nenhum treino real concluído no período. O PDF incluirá a evolução corporal registrada."
                : "Conclua um treino real ou registre medidas corporais para gerar o PDF."}
            </div>}
            <div className="report-workouts">
              {report.workouts.map((workout) => (
                <article className="report-workout" key={workout.id}>
                  <header><div><small>{formatDate(workout.date)}</small><h3>{workout.label}</h3></div><div><strong>{workout.volume.toLocaleString("pt-BR")} kg</strong><small>{workout.completedSets} séries · RPE {workout.averageRpe ?? "-"}</small></div></header>
                  <div className="report-exercises">
                    {workout.exercises.map((exercise) => (
                      <section key={`${workout.id}-${exercise.key}`}>
                        <div>
                          <strong>{exercise.name}</strong>
                          <small>
                            {exercise.bestSet
                              ? `Melhor série: ${exercise.bestSet.loadKg} kg × ${exercise.bestSet.reps} · 1RM estimada ${exercise.estimated1Rm} kg`
                              : "Sem série válida para estimativa"}
                          </small>
                        </div>
                        {exercise.originalKey && <em>Substituição · {exercise.substitutionReason ?? "motivo não informado"}</em>}
                        <div className="report-sets">
                          {exercise.sets.map((set) => <span className={set.skipped ? "report-set--skipped" : ""} key={set.setNumber}>
                            S{set.setNumber}{set.isExtra ? " extra" : ""}: {set.skipped ? "não realizada" : `${set.loadKg} kg × ${set.reps}${set.rpe === null ? "" : ` · RPE ${set.rpe}`}`}
                          </span>)}
                        </div>
                      </section>
                    ))}
                  </div>
                  {(workout.sessionRpe || workout.sessionQuality || workout.postWorkoutDiscomfort) && <p className="report-checkout"><strong>Check-out:</strong> RPE geral {workout.sessionRpe ?? "—"} · qualidade {workout.sessionQuality ?? "—"}/5{workout.postWorkoutDiscomfort ? " · desconforto informado" : ""}</p>}
                  {workout.notes && <p><strong>Observações:</strong> {workout.notes}</p>}
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {deleting && (
        <div className="confirmation-backdrop" role="presentation">
          <section className="confirmation-dialog report-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-workout-title">
            <span className="setup-status setup-status--locked">EXCLUSÃO DEFINITIVA</span>
            <h2 id="delete-workout-title">Excluir “{deleting.label}”?</h2>
            <p>
              O treino de {formatDate(deleting.date)} e todas as séries registradas serão removidos permanentemente.
              Esta ação não pode ser desfeita.
            </p>
            <form onSubmit={deleteUnfinishedWorkout}>
              <label>
                Senha atual
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoFocus
                />
              </label>
              <div>
                <button type="button" disabled={deleteBusy} onClick={() => { setDeleting(null); setPassword(""); }}>Cancelar</button>
                <button className="danger-action" type="submit" disabled={deleteBusy || !password}>
                  {deleteBusy ? "Excluindo…" : "Confirmar exclusão"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
