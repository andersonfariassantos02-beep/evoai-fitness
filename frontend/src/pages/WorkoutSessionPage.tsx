import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { queueCalendarMutation } from "../services/trainingCalendarService";
import { saveSet, startOrLoadWorkout, updateSession, type SetLog, type WorkoutSession } from "../services/workoutSessionService";

export default function WorkoutSessionPage() {
  const { date = "" } = useParams();
  const [search] = useSearchParams();
  const label = search.get("label") || "Treino planejado";
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [message, setMessage] = useState("Carregando treino…");

  useEffect(() => {
    if (!user || !date) return;
    void startOrLoadWorkout(user.id, date, label).then((data) => { setSession(data); setMessage(""); }).catch(() => setMessage("Não foi possível abrir o treino. Verifique a conexão e a migração do banco."));
  }, [date, label, user]);

  const allSets = useMemo(() => session?.exercises.flatMap((exercise) => exercise.sets.map((set) => ({ exercise: exercise.exercise_name, set }))) ?? [], [session]);
  const next = allSets.find((item) => !item.set.completed);
  const completed = allSets.filter((item) => item.set.completed).length;

  function changeSet(exerciseId: string, setId: string, patch: Partial<SetLog>) {
    setSession((current) => current ? { ...current, exercises: current.exercises.map((exercise) => exercise.id === exerciseId ? { ...exercise, sets: exercise.sets.map((set) => set.id === setId ? { ...set, ...patch } : set) } : exercise) } : current);
  }

  async function persistSet(set: SetLog) {
    try { await saveSet(set); setMessage("Série salva"); } catch { setMessage("Série preservada na tela; sincronização pendente"); }
  }

  async function togglePause() {
    if (!session) return;
    const status = session.status === "paused" ? "active" : "paused";
    await updateSession(session.id, status, session.notes);
    setSession({ ...session, status });
  }

  async function finish() {
    if (!session || !user || next) { setMessage("Conclua todas as séries antes de finalizar."); return; }
    await updateSession(session.id, "completed", session.notes);
    await queueCalendarMutation(user.id, date, { date, available: true, completed: true, completedWasPlanned: true });
    navigate("/app");
  }

  if (!session) return <main className="centered-screen"><span className="spinner" /><p>{message}</p></main>;

  return <div className="workout-shell">
    <header className="workout-header"><button onClick={() => navigate("/app")}>← Calendário</button><div><small>{date}</small><h1>{session.workout_label}</h1></div><button onClick={togglePause}>{session.status === "paused" ? "Retomar" : "Pausar"}</button></header>
    <div className="workout-progress"><strong>{completed}/{allSets.length} séries</strong><span><i style={{ width: `${allSets.length ? completed / allSets.length * 100 : 0}%` }} /></span></div>
    {next && <aside className="next-set"><span>PRÓXIMA SÉRIE</span><strong>{next.exercise} · série {next.set.set_number}</strong><small>{next.set.target_reps_min}–{next.set.target_reps_max} repetições</small></aside>}
    <main className="exercise-list">
      <p className="template-notice">Modelo determinístico inicial. Os exercícios serão conectados ao Banco Mestre na próxima etapa.</p>
      {session.exercises.map((exercise) => <section className="exercise-card" key={exercise.id}><h2>{exercise.position}. {exercise.exercise_name}</h2>
        {exercise.sets.map((set) => <div className={`set-row ${set.completed ? "set-row--done" : ""}`} key={set.id}>
          <strong>Série {set.set_number}</strong><label>Reps<input type="number" value={set.actual_reps ?? ""} onChange={(event) => changeSet(exercise.id, set.id, { actual_reps: event.target.value ? Number(event.target.value) : null })} /></label>
          <label>Kg<input type="number" step="0.5" value={set.load_kg ?? ""} onChange={(event) => changeSet(exercise.id, set.id, { load_kg: event.target.value ? Number(event.target.value) : null })} /></label>
          <label>RPE<input type="number" min="1" max="10" step="0.5" value={set.rpe ?? ""} onChange={(event) => changeSet(exercise.id, set.id, { rpe: event.target.value ? Number(event.target.value) : null })} /></label>
          <button onClick={() => { const updated = { ...set, completed: !set.completed }; changeSet(exercise.id, set.id, updated); void persistSet(updated); }}>{set.completed ? "✓ Feita" : "Concluir"}</button>
        </div>)}
      </section>)}
      <label className="session-notes">Observações do treino<textarea value={session.notes} onChange={(event) => setSession({ ...session, notes: event.target.value })} /></label>
      {message && <p className="workout-message">{message}</p>}
      <button className="finish-workout" onClick={finish}>Finalizar treino</button>
    </main>
  </div>;
}

