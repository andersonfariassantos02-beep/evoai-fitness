import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { calculateTrainingCycleProgress } from "../lib/trainingCycle";
import { toDateKey } from "../lib/trainingCalendar";
import { loadPlanningProfile, type TrainingGoal } from "../services/profileRestrictionService";
import { loadWorkoutReport } from "../services/reportService";
import { createTrainingCycle, endTrainingCycle, loadActiveTrainingCycle, type TrainingCycle } from "../services/trainingCycleService";

const GOAL_LABELS: Record<TrainingGoal, string> = {
  general_fitness: "Condicionamento geral",
  weight_loss: "Emagrecimento",
  hypertrophy: "Hipertrofia",
  strength: "Força",
  conditioning: "Condicionamento",
};

const FOCUS_LABELS: Record<string, string> = {
  full_body: "Corpo inteiro", glutes: "Glúteos", legs: "Pernas", chest: "Peito",
  back: "Costas", shoulders: "Ombros", arms: "Braços", core: "Core",
};

export default function TrainingCyclePage() {
  const { user } = useAuth();
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const [cycle, setCycle] = useState<TrainingCycle | null>(null);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [goal, setGoal] = useState<TrainingGoal>("hypertrophy");
  const [focus, setFocus] = useState<string[]>(["full_body"]);
  const [name, setName] = useState("Meu ciclo de treino");
  const [durationWeeks, setDurationWeeks] = useState(6);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    void Promise.all([loadActiveTrainingCycle(user.id), loadPlanningProfile(user.id)])
      .then(async ([current, profile]) => {
        if (!active) return;
        setCycle(current);
        setGoal(profile.goal);
        setFocus(profile.trainingFocus);
        if (current) {
          const preview = calculateTrainingCycleProgress(current, 0, today);
          const report = await loadWorkoutReport(user.id, current.startsOn, preview.endsOn);
          if (active) setCompletedSessions(report.completedSessions);
        }
      })
      .catch(() => { if (active) setMessage("Não foi possível carregar o ciclo agora."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [today, user]);

  const progress = cycle ? calculateTrainingCycleProgress(cycle, completedSessions, today) : null;

  async function createCycle() {
    if (!user || !name.trim()) return;
    setBusy(true); setMessage("");
    try {
      const created = await createTrainingCycle({
        userId: user.id, name, goal, trainingFocus: focus as TrainingCycle["trainingFocus"],
        startsOn: todayKey, durationWeeks, targetSessionsPerWeek: sessionsPerWeek,
      });
      setCycle(created);
      setCompletedSessions(0);
      setMessage("Ciclo iniciado. Treinos já criados ou realizados foram preservados.");
    } catch {
      setMessage("Não foi possível iniciar o ciclo. Verifique se já existe outro ciclo ativo.");
    } finally {
      setBusy(false);
    }
  }

  async function finishCycle() {
    if (!user || !cycle) return;
    setBusy(true); setMessage("");
    try {
      await endTrainingCycle(user.id, cycle.id);
      setCycle(null);
      setConfirmEnd(false);
      setMessage("Ciclo encerrado e preservado no histórico.");
    } catch {
      setMessage("Não foi possível encerrar o ciclo agora.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="cycle-page">
    <header><span className="eyebrow">PLANEJAMENTO EM BLOCOS</span><h1>Ciclo de treino</h1><p>Organize 4–6 semanas com objetivo claro, consistência e ajustes baseados no que você realmente executa.</p></header>
    {message && <p className="profile-message" role="status">{message}</p>}
    {loading && <section className="cycle-card"><h2>Carregando seu ciclo…</h2></section>}

    {!loading && cycle && progress && <section className="cycle-card cycle-card--active">
      <div className="cycle-card__heading"><div><span className="setup-status setup-status--ready">CICLO ATIVO</span><h2>{cycle.name}</h2><p>{GOAL_LABELS[cycle.goal]} · {cycle.trainingFocus.map((item) => FOCUS_LABELS[item] ?? item).join(", ")}</p></div><strong>Semana {progress.currentWeek} de {cycle.durationWeeks}</strong></div>
      <div className="cycle-metrics">
        <article><span>Treinos concluídos</span><strong>{progress.completedSessions}</strong><small>meta total de {progress.totalTargetSessions}</small></article>
        <article><span>Ritmo semanal</span><strong>{cycle.targetSessionsPerWeek}</strong><small>sessões por semana</small></article>
        <article><span>Encerramento previsto</span><strong>{new Intl.DateTimeFormat("pt-BR").format(new Date(`${progress.endsOn}T12:00:00`))}</strong><small>o histórico não será apagado</small></article>
      </div>
      <div className="cycle-progress"><div><i style={{ width: `${progress.progressPercent}%` }} /></div><span>{progress.progressPercent}% da meta de sessões</span></div>
      <p className="cycle-card__note">{progress.currentWeek === cycle.durationWeeks ? "Semana final: avalie a recuperação e considere o deload sugerido pelo painel." : "O ciclo acompanha treinos reais. Faltas não são compensadas com volume excessivo."}</p>
      <button className="danger-link" type="button" onClick={() => setConfirmEnd(true)}>Encerrar ciclo</button>
    </section>}

    {!loading && !cycle && <section className="cycle-card">
      <div><span className="setup-status">NOVO CICLO</span><h2>Defina a próxima etapa</h2><p>As preferências vieram do seu perfil e podem ser revisadas antes da confirmação.</p></div>
      <div className="cycle-form">
        <label>Nome do ciclo<input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} /></label>
        <label>Objetivo<select value={goal} onChange={(event) => setGoal(event.target.value as TrainingGoal)}>{Object.entries(GOAL_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label>Duração<select value={durationWeeks} onChange={(event) => setDurationWeeks(Number(event.target.value))}><option value="4">4 semanas</option><option value="5">5 semanas</option><option value="6">6 semanas</option></select></label>
        <label>Treinos por semana<select value={sessionsPerWeek} onChange={(event) => setSessionsPerWeek(Number(event.target.value))}>{[1,2,3,4,5,6].map((value) => <option value={value} key={value}>{value} treino{value > 1 ? "s" : ""}</option>)}</select></label>
      </div>
      <div className="cycle-confirmation"><strong>Antes de iniciar</strong><ul><li>o calendário continuará respeitando somente os dias disponíveis;</li><li>treinos já iniciados ou concluídos não serão alterados;</li><li>a progressão e o deload continuarão explicáveis e confirmáveis.</li></ul></div>
      <button className="primary-action" type="button" disabled={busy || !name.trim()} onClick={() => void createCycle()}>{busy ? "Iniciando…" : "Iniciar ciclo"}</button>
    </section>}

    {confirmEnd && cycle && <div className="confirmation-backdrop"><section className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="end-cycle-title"><span className="setup-status setup-status--locked">CONFIRMAÇÃO</span><h2 id="end-cycle-title">Encerrar o ciclo atual?</h2><p>Os treinos e resultados permanecerão no histórico. O planejamento deixará de considerar este ciclo.</p><div className="deload-dialog__actions"><button type="button" disabled={busy} onClick={() => setConfirmEnd(false)}>Voltar</button><button className="danger-action" type="button" disabled={busy} onClick={() => void finishCycle()}>{busy ? "Encerrando…" : "Encerrar ciclo"}</button></div></section></div>}
  </main>;
}
