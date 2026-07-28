import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { previousReportRange, reportRange, type ReportPeriod } from "../lib/reportPeriod";
import { saveReportPdf, shareReportPdf } from "../lib/reportPdf";
import {
  loadUnfinishedWorkouts,
  loadWorkoutReport,
  type UnfinishedWorkout,
  type WorkoutReport,
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

export default function ReportsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<ReportPeriod>("weekly");
  const [anchor, setAnchor] = useState(todayKey);
  const [report, setReport] = useState<WorkoutReport | null>(null);
  const [previous, setPrevious] = useState<WorkoutReport | null>(null);
  const [unfinished, setUnfinished] = useState<UnfinishedWorkout[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");
  const currentRange = useMemo(() => reportRange(period, anchor), [anchor, period]);
  const athleteName = String(user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Atleta");

  async function generate() {
    if (!user) return;
    setLoading(true);
    setMessage("");
    try {
      const previousRange = previousReportRange(period, currentRange.startDate);
      const [currentReport, previousReport, unfinishedWorkouts] = await Promise.all([
        loadWorkoutReport(user.id, currentRange.startDate, currentRange.endDate),
        loadWorkoutReport(user.id, previousRange.startDate, previousRange.endDate),
        loadUnfinishedWorkouts(user.id, currentRange.startDate, currentRange.endDate),
      ]);
      setReport(currentReport);
      setPrevious(previousReport);
      setUnfinished(unfinishedWorkouts);
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

  return (
    <main className="reports-page">
      <header className="reports-header">
        <div><span className="eyebrow">EVOLUÇÃO E HISTÓRICO</span><h1>Relatórios</h1><p>Analise seus treinos reais, cargas e consistência ao longo do tempo.</p></div>
      </header>

      <section className="report-controls" aria-label="Configurar relatório">
        <div className="report-period-toggle" role="tablist" aria-label="Período do relatório">
          <button type="button" role="tab" aria-selected={period === "weekly"} className={period === "weekly" ? "active" : ""} onClick={() => { setPeriod("weekly"); setReport(null); setUnfinished([]); }}>Semanal</button>
          <button type="button" role="tab" aria-selected={period === "monthly"} className={period === "monthly" ? "active" : ""} onClick={() => { setPeriod("monthly"); setReport(null); setUnfinished([]); }}>Mensal</button>
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
                    <Link to={`/preparar-treino/${workout.date}?label=${encodeURIComponent(workout.label)}&planned=0`}>
                      Continuar e finalizar
                    </Link>
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

          <section className="report-detail">
            <div className="report-detail__header">
              <div><span className="eyebrow">DETALHAMENTO</span><h2>Treinos do período</h2></div>
              <div className="report-actions">
                <button type="button" disabled={exporting || !report.completedSessions} onClick={() => void exportPdf(false)}>Salvar PDF</button>
                <button className="report-share" type="button" disabled={exporting || !report.completedSessions} onClick={() => void exportPdf(true)}>Compartilhar</button>
              </div>
            </div>

            {!report.workouts.length && <div className="report-empty">Conclua um treino real para visualizar o detalhamento e gerar o PDF.</div>}
            <div className="report-workouts">
              {report.workouts.map((workout) => (
                <article className="report-workout" key={workout.id}>
                  <header><div><small>{formatDate(workout.date)}</small><h3>{workout.label}</h3></div><div><strong>{workout.volume.toLocaleString("pt-BR")} kg</strong><small>{workout.completedSets} séries · RPE {workout.averageRpe ?? "-"}</small></div></header>
                  <div className="report-exercises">
                    {workout.exercises.map((exercise) => (
                      <section key={`${workout.id}-${exercise.key}`}>
                        <div><strong>{exercise.name}</strong><small>{exercise.volume.toLocaleString("pt-BR")} kg de volume</small></div>
                        {exercise.originalKey && <em>Substituição · {exercise.substitutionReason ?? "motivo não informado"}</em>}
                        <div className="report-sets">
                          {exercise.sets.map((set) => <span className={set.skipped ? "report-set--skipped" : ""} key={set.setNumber}>
                            S{set.setNumber}{set.isExtra ? " extra" : ""}: {set.skipped ? "não realizada" : `${set.loadKg} kg × ${set.reps}${set.rpe === null ? "" : ` · RPE ${set.rpe}`}`}
                          </span>)}
                        </div>
                      </section>
                    ))}
                  </div>
                  {workout.notes && <p><strong>Observações:</strong> {workout.notes}</p>}
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
