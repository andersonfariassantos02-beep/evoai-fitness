import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { queueCalendarMutation } from "../services/trainingCalendarService";
import { loadExerciseGuidance, loadSubstitutionCandidates, type ExerciseGuidance } from "../services/exerciseCatalogService";
import { restrictionText, type ProfileRestriction } from "../services/profileRestrictionService";
import { addExtraSet, removeExtraSet, saveSet, startOrLoadWorkout, substituteExercise, updateSession, type ExerciseLog, type SetLog, type WorkoutSession } from "../services/workoutSessionService";
import { findNextPendingIndex, formatRestTime, getRemainingSeconds, getRestPrescription, type RestKind } from "../lib/restTimer";
import { playRestFinishedSound, unlockRestAudio } from "../lib/restAudio";
import { repsInReserveFromRpe, rpeFromRepsInReserve } from "../lib/workoutEffort";

interface ActiveRest {
  sourceExerciseId: string;
  sourceSetId: string;
  kind: RestKind;
  label: string;
  nextLabel: string;
  targetSeconds: number;
  startedAtMs: number;
  endsAtMs: number;
  remainingSeconds: number;
  paused: boolean;
  ready: boolean;
}

interface SetEntryRowProps {
  set: SetLog;
  onSave: (set: SetLog) => Promise<void>;
  onComplete: (set: SetLog) => Promise<void>;
  onRemove: (set: SetLog) => Promise<void>;
}

function SetEntryRow({ set, onSave, onComplete, onRemove }: SetEntryRowProps) {
  const [actualReps, setActualReps] = useState(set.actual_reps?.toString() ?? "");
  const [loadKg, setLoadKg] = useState(set.load_kg?.toString() ?? "");
  const [repsInReserve, setRepsInReserve] = useState(repsInReserveFromRpe(set.rpe));
  const completing = useRef(false);

  function draft() {
    return {
      ...set,
      actual_reps: actualReps === "" ? null : Number(actualReps),
      load_kg: loadKg === "" ? null : Number(loadKg),
      rpe: repsInReserve === "" ? null : rpeFromRepsInReserve(Number(repsInReserve)),
    };
  }

  async function saveDraft() {
    if (completing.current) return;
    await onSave(draft());
  }

  return <div className={`set-row ${set.completed ? "set-row--done" : ""}`}>
    <div className="set-row__header">
      <strong>Série {set.set_number}{set.is_extra && <small>extra</small>}</strong>
      <div>
        {set.is_extra && !set.completed && <button className="set-row__remove" type="button" onClick={() => void onRemove(set)}>Excluir</button>}
        <button type="button" onPointerDown={() => { completing.current = true; }} onClick={async () => {
          unlockRestAudio();
          await onComplete(draft());
          completing.current = false;
        }}>{set.completed ? "✓ Feita" : "Concluir"}</button>
      </div>
    </div>
    <div className="set-row__fields">
      <label>Reps<input aria-label={`Repetições da série ${set.set_number}`} inputMode="numeric" type="number" value={actualReps} onChange={(event) => setActualReps(event.target.value)} onBlur={() => void saveDraft()} /></label>
      <label>Kg<input aria-label={`Carga da série ${set.set_number}`} inputMode="decimal" type="number" step="0.5" value={loadKg} onChange={(event) => setLoadKg(event.target.value)} onBlur={() => void saveDraft()} /></label>
      <label>RPE automático<select aria-label={`Esforço da série ${set.set_number}`} value={repsInReserve} onChange={(event) => setRepsInReserve(event.target.value)} onBlur={() => void saveDraft()}>
        <option value="">Esforço</option>
        <option value="4">4+ sobrariam · RPE 6</option>
        <option value="3">3 sobrariam · RPE 7</option>
        <option value="2">2 sobrariam · RPE 8</option>
        <option value="1">1 sobraria · RPE 9</option>
        <option value="0">Nenhuma · RPE 10</option>
      </select></label>
    </div>
  </div>;
}

export default function WorkoutSessionPage() {
  const { date = "" } = useParams();
  const [search] = useSearchParams();
  const label = search.get("label") || "Treino planejado";
  const completedWasPlanned = search.get("planned") === "1";
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [message, setMessage] = useState("Carregando treino…");
  const [profileRestrictions, setProfileRestrictions] = useState<ProfileRestriction[]>([]);
  const [guidanceByKey, setGuidanceByKey] = useState<Record<string, ExerciseGuidance>>({});
  const [activeRest, setActiveRest] = useState<ActiveRest | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem("evoai-rest-sound") !== "off");
  const [addingExerciseId, setAddingExerciseId] = useState<string | null>(null);
  const restWasFinalized = useRef(false);

  useEffect(() => {
    if (!user || !date) return;
    void startOrLoadWorkout(user.id, date, label)
      .then((data) => { setSession(data); setProfileRestrictions(data.applied_restrictions); setMessage(""); })
      .catch((error) => setMessage(error instanceof Error && error.message.startsWith("PROFILE_RESTRICTION_BLOCKS_PLAN")
        ? "As restrições do perfil bloqueiam um exercício sem substituto seguro. Revise o perfil antes de iniciar."
        : error instanceof Error && error.message === "MULTIPLE_ACTIVE_LINKED_PROFILES"
          ? "Há mais de um perfil ativo ligado à sua conta. Selecione ou desative um perfil antes de planejar o treino."
          : "Não foi possível abrir o treino. Verifique a conexão e a migração do banco."));
  }, [date, label, user]);

  const exerciseKeys = useMemo(() => (session?.exercises ?? []).filter(Boolean).map((exercise) => exercise.exercise_key).join("|"), [session]);
  useEffect(() => {
    const keys = exerciseKeys.split("|").filter(Boolean);
    if (!keys.length) { setGuidanceByKey({}); return; }
    void loadExerciseGuidance(keys)
      .then(setGuidanceByKey)
      .catch(() => setGuidanceByKey({}));
  }, [exerciseKeys]);

  const allSets = useMemo(() => (session?.exercises ?? []).filter(Boolean).flatMap((exercise) => exercise.sets.map((set) => ({ exercise, set }))) ?? [], [session]);
  const next = allSets.find((item) => !item.set.completed);
  const completed = allSets.filter((item) => item.set.completed).length;

  useEffect(() => {
    if (!activeRest || activeRest.paused || activeRest.ready) return;
    const tick = () => {
      const remainingSeconds = getRemainingSeconds(activeRest.endsAtMs);
      if (remainingSeconds > 0) {
        setActiveRest((current) => current ? { ...current, remainingSeconds } : current);
        return;
      }
      setActiveRest((current) => current ? { ...current, remainingSeconds: 0, ready: true } : current);
      if (!restWasFinalized.current) {
        restWasFinalized.current = true;
        void recordActualRest(activeRest.targetSeconds);
        signalRestFinished();
      }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [activeRest?.endsAtMs, activeRest?.paused, activeRest?.ready, soundEnabled]);

  function changeSet(exerciseId: string, setId: string, patch: Partial<SetLog>) {
    setSession((current) => current ? { ...current, exercises: current.exercises.map((exercise) => exercise.id === exerciseId ? { ...exercise, sets: exercise.sets.map((set) => set.id === setId ? { ...set, ...patch } : set) } : exercise) } : current);
  }

  async function persistSet(set: SetLog) {
    try { await saveSet(set); setMessage("Série salva"); } catch { setMessage("Série preservada na tela; sincronização pendente"); }
  }

  function signalRestFinished() {
    setMessage("Descanso concluído. Pode iniciar a próxima série.");
    if ("vibrate" in navigator) navigator.vibrate([180, 100, 180]);
    if (soundEnabled) playRestFinishedSound();
  }

  async function recordActualRest(actualSeconds: number) {
    if (!activeRest || !session) return;
    const sourceExercise = session.exercises.find((exercise) => exercise.id === activeRest.sourceExerciseId);
    const sourceSet = sourceExercise?.sets.find((set) => set.id === activeRest.sourceSetId);
    if (!sourceExercise || !sourceSet) return;
    const updated = { ...sourceSet, actual_rest_seconds: Math.max(0, Math.round(actualSeconds)) };
    changeSet(sourceExercise.id, sourceSet.id, updated);
    await persistSet(updated);
  }

  function startRestAfter(exercise: ExerciseLog, set: SetLog) {
    if (!session) return;
    const currentIndex = allSets.findIndex((item) => item.set.id === set.id);
    const completedState = allSets.map((item) => item.set.id === set.id ? true : item.set.completed);
    const nextIndex = findNextPendingIndex(completedState, currentIndex);
    if (nextIndex < 0) {
      setActiveRest(null);
      return;
    }
    const nextItem = allSets[nextIndex];
    const changesExercise = nextItem.exercise.id !== exercise.id;
    const prescription = getRestPrescription(exercise.rest_seconds, exercise.transition_rest_seconds, changesExercise);
    const startedAtMs = Date.now();
    restWasFinalized.current = false;
    setActiveRest({
      sourceExerciseId: exercise.id,
      sourceSetId: set.id,
      kind: prescription.kind,
      label: prescription.label,
      nextLabel: `${nextItem.exercise.exercise_name} · série ${nextItem.set.set_number}`,
      targetSeconds: prescription.seconds,
      startedAtMs,
      endsAtMs: startedAtMs + prescription.seconds * 1000,
      remainingSeconds: prescription.seconds,
      paused: false,
      ready: false,
    });
    return prescription.seconds;
  }

  function adjustRest(deltaSeconds: number) {
    setActiveRest((current) => {
      if (!current || current.ready) return current;
      const targetSeconds = Math.max(30, Math.min(600, current.targetSeconds + deltaSeconds));
      return {
        ...current,
        targetSeconds,
        endsAtMs: current.endsAtMs + (targetSeconds - current.targetSeconds) * 1000,
        remainingSeconds: Math.max(0, current.remainingSeconds + (targetSeconds - current.targetSeconds)),
      };
    });
  }

  async function skipRest() {
    if (!activeRest) return;
    const actualSeconds = Math.max(0, Math.round((Date.now() - activeRest.startedAtMs) / 1000));
    restWasFinalized.current = true;
    await recordActualRest(actualSeconds);
    setActiveRest(null);
    setMessage("Descanso encerrado. Próxima série liberada.");
  }

  async function togglePause() {
    if (!session) return;
    const status = session.status === "paused" ? "active" : "paused";
    await updateSession(session.id, status, session.notes);
    setSession({ ...session, status });
    setActiveRest((current) => {
      if (!current) return current;
      if (status === "paused") return { ...current, paused: true, remainingSeconds: getRemainingSeconds(current.endsAtMs) };
      return { ...current, paused: false, endsAtMs: Date.now() + current.remainingSeconds * 1000 };
    });
  }

  async function replaceExercise(exercise: ExerciseLog) {
    const reason = window.prompt("Motivo da substituição: indisponibilidade, desconforto ou restrição?", "indisponibilidade")?.trim();
    if (!reason) return;
    const excludedKeys = (session?.exercises ?? []).filter(Boolean).map((item) => item.exercise_key);
    const candidates = await loadSubstitutionCandidates(exercise.exercise_key, reason, profileRestrictions, excludedKeys);
    if (!candidates.length) { setMessage("Nenhum substituto equivalente atende ao motivo informado."); return; }
    const options = candidates.map((item, index) => `${index + 1}. ${item.name} — ${item.equipment}`).join("\n");
    const selected = Number(window.prompt(`Escolha uma opção equivalente para o mesmo estímulo muscular:\n${options}`, "1")) - 1;
    const replacement = candidates[selected];
    if (!replacement) return;
    try {
      const updated = await substituteExercise(exercise, replacement, reason);
      setSession((current) => current ? { ...current, exercises: current.exercises.map((item) => item.id === exercise.id ? updated : item) } : current);
      setMessage(`Substituído por ${replacement.name}. A prescrição foi ajustada para ${replacement.sets} séries de ${replacement.repsMin}–${replacement.repsMax} repetições.`);
    } catch (error) { setMessage(error instanceof Error && error.message === "EXERCISE_ALREADY_STARTED" ? "Substitua somente exercícios ainda não iniciados, para preservar o histórico registrado." : "Não foi possível salvar a substituição."); }
  }

  async function appendExtraSet(exercise: ExerciseLog) {
    setAddingExerciseId(exercise.id);
    try {
      const extraSet = await addExtraSet(exercise);
      setSession((current) => current ? {
        ...current,
        exercises: current.exercises.map((item) => item.id === exercise.id ? { ...item, sets: [...item.sets, extraSet] } : item),
      } : current);
      setMessage(`Série extra adicionada em ${exercise.exercise_name}.`);
    } catch {
      setMessage("Não foi possível adicionar a série extra.");
    } finally {
      setAddingExerciseId(null);
    }
  }

  async function deleteExtraSet(exerciseId: string, set: SetLog) {
    try {
      await removeExtraSet(set);
      setSession((current) => current ? {
        ...current,
        exercises: current.exercises.map((exercise) => exercise.id === exerciseId
          ? { ...exercise, sets: exercise.sets.filter((item) => item.id !== set.id) }
          : exercise),
      } : current);
      setMessage("Série extra removida.");
    } catch {
      setMessage("Somente séries extras ainda não concluídas podem ser removidas.");
    }
  }

  async function finish() {
    if (!session || !user || next) { setMessage("Conclua todas as séries antes de finalizar."); return; }
    await updateSession(session.id, "completed", session.notes);
    await queueCalendarMutation(user.id, date, {
      date, available: completedWasPlanned, completed: true, completedWasPlanned,
      completedLabel: session.workout_label,
    });
    navigate("/app");
  }

  if (!session) return <main className="centered-screen"><span className="spinner" /><p>{message}</p></main>;

  return <div className="workout-shell">
    <header className="workout-header"><button onClick={() => navigate("/app")}>← Calendário</button><div><small>{date}</small><h1>{session.workout_label}</h1></div><button onClick={togglePause}>{session.status === "paused" ? "Retomar" : "Pausar"}</button></header>
    <div className="workout-progress"><strong>{completed}/{allSets.length} séries</strong><span><i style={{ width: `${allSets.length ? completed / allSets.length * 100 : 0}%` }} /></span></div>
    <div className="workout-tools">
      <button type="button" onClick={() => {
        const enabled = !soundEnabled;
        setSoundEnabled(enabled);
        localStorage.setItem("evoai-rest-sound", enabled ? "on" : "off");
        if (enabled) { unlockRestAudio(); playRestFinishedSound(); }
      }}>{soundEnabled ? "🔊 Som ligado" : "🔇 Som desligado"}</button>
      <button type="button" disabled={!soundEnabled} onClick={() => { unlockRestAudio(); playRestFinishedSound(); }}>Testar som</button>
    </div>
    {activeRest && <aside className={`rest-timer ${activeRest.ready ? "rest-timer--ready" : ""}`} aria-live="assertive">
      <div><span>{activeRest.ready ? "DESCANSO CONCLUÍDO" : activeRest.label.toUpperCase()}</span><strong>{activeRest.ready ? "Pode iniciar" : formatRestTime(activeRest.remainingSeconds)}</strong><small>Próxima: {activeRest.nextLabel}</small></div>
      {!activeRest.ready && <div className="rest-timer__actions">
        <button onClick={() => adjustRest(-30)} disabled={activeRest.paused}>−30 s</button>
        <button onClick={() => adjustRest(30)} disabled={activeRest.paused}>+30 s</button>
        <button onClick={() => void skipRest()}>Pular</button>
      </div>}
      {activeRest.ready && <button className="rest-timer__continue" onClick={() => setActiveRest(null)}>Continuar</button>}
      {activeRest.paused && <em>Relógio pausado junto com o treino</em>}
    </aside>}
    {next && !activeRest && <aside className="next-set"><span>PRÓXIMA SÉRIE</span><strong>{next.exercise.exercise_name} · série {next.set.set_number}</strong><small>{next.set.target_reps_min}–{next.set.target_reps_max} repetições</small></aside>}
    <main className="exercise-list">
      {session.profile_name && <p className="profile-context"><strong>Perfil: {session.profile_name}</strong><span>{session.applied_restrictions.length ? `Restrições aplicadas: ${restrictionText(session.applied_restrictions) || "somente informativas"}` : "Nenhuma restrição ativa"}</span></p>}
      <p className="template-notice">Recomendações determinísticas: o mesmo histórico sempre produz a mesma orientação, com justificativa visível.</p>
      {(session.exercises ?? []).filter(Boolean).map((exercise) => {
        const guidance = guidanceByKey[exercise.exercise_key ?? ""];
        const hasGuidance = Boolean(guidance && (guidance.instructions || guidance.cautions.length || guidance.equipmentVariants.length || guidance.mediaUrl));
        return <section className="exercise-card" key={exercise.id}><div className="exercise-title"><h2>{exercise.position}. {exercise.exercise_name}</h2><button onClick={() => void replaceExercise(exercise)}>Substituir</button></div>
        {exercise.original_exercise_key && <p className="substitution-note">Substituição registrada · motivo: {exercise.substitution_reason}</p>}
        {hasGuidance && <details className="exercise-guidance"><summary>Como executar com segurança</summary>
          {guidance.instructions && <p>{guidance.instructions}</p>}
          {guidance.cautions.length > 0 && <div><strong>Pontos de atenção</strong><ul>{guidance.cautions.map((caution) => <li key={caution}>{caution}</li>)}</ul></div>}
          {guidance.equipmentVariants.length > 0 && <p><strong>Variações de equipamento:</strong> {guidance.equipmentVariants.join(", ")}</p>}
          {guidance.mediaUrl && <a href={guidance.mediaUrl} target="_blank" rel="noreferrer">Abrir demonstração técnica ↗</a>}
        </details>}
        <p className={`progression progression--${exercise.recommendation.action}`}><strong>{exercise.recommendation.loadKg > 0 ? `${exercise.recommendation.loadKg} kg sugeridos` : "Defina a carga inicial"}</strong><span>{exercise.recommendation.reason}</span></p>
        {exercise.sets.map((set) => <SetEntryRow key={set.id} set={set}
          onSave={async (draft) => { changeSet(exercise.id, set.id, draft); await persistSet(draft); }}
          onRemove={(draft) => deleteExtraSet(exercise.id, draft)}
          onComplete={async (draft) => {
            const completedNow = !set.completed;
            const targetRestSeconds = completedNow ? startRestAfter(exercise, draft) ?? null : null;
            const updated = { ...draft, completed: completedNow, target_rest_seconds: targetRestSeconds, actual_rest_seconds: completedNow ? set.actual_rest_seconds : null };
            if (!completedNow && activeRest?.sourceSetId === set.id) setActiveRest(null);
            changeSet(exercise.id, set.id, updated);
            await persistSet(updated);
          }}
        />)}
        <button className="add-extra-set" type="button" disabled={addingExerciseId === exercise.id} onClick={() => void appendExtraSet(exercise)}>
          {addingExerciseId === exercise.id ? "Adicionando…" : "+ Adicionar série"}
        </button>
      </section>;
      })}
      <label className="session-notes">Observações do treino<textarea value={session.notes} onChange={(event) => setSession({ ...session, notes: event.target.value })} /></label>
      {message && <p className="workout-message">{message}</p>}
      <button className="finish-workout" onClick={finish}>Finalizar treino</button>
    </main>
  </div>;
}
