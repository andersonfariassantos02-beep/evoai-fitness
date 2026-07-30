import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { queueCalendarMutation } from "../services/trainingCalendarService";
import { loadExerciseGuidance, loadSubstitutionCandidates, type ExerciseGuidance } from "../services/exerciseCatalogService";
import { restrictionText, type ProfileRestriction } from "../services/profileRestrictionService";
import { addExtraSet, addWarmupSets, finishWorkoutWithPending, removeExtraSet, removeWarmupSets, saveSet, startOrLoadWorkout, substituteExercise, updateSession, type ExerciseLog, type SetLog, type WorkoutCheckout, type WorkoutSession } from "../services/workoutSessionService";
import { findNextPendingIndex, formatRestTime, getRemainingSeconds, getRestPrescription, restoreRestTimer, type RestKind } from "../lib/restTimer";
import { playRestFinishedSound, unlockRestAudio } from "../lib/restAudio";
import { repsInReserveFromRpe, rpeFromRepsInReserve } from "../lib/workoutEffort";
import { evaluatePersonalRecord } from "../lib/personalRecord";
import { clearCachedWorkoutSession, loadCachedWorkoutSession, saveCachedWorkoutSession } from "../lib/workoutSessionCache";

interface ActiveRest {
  sourceExerciseId: string;
  sourceSetId: string;
  nextSetId: string;
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

function restStorageKey(sessionId: string) {
  return `evoai:active-rest:${sessionId}`;
}

function persistRestTimer(sessionId: string, rest: ActiveRest | null) {
  try {
    const key = restStorageKey(sessionId);
    if (rest) localStorage.setItem(key, JSON.stringify(rest));
    else localStorage.removeItem(key);
  } catch {
    // O treino continua utilizável mesmo se o navegador bloquear o armazenamento.
  }
}

function loadPersistedRest(session: WorkoutSession): ActiveRest | null {
  try {
    const raw = localStorage.getItem(restStorageKey(session.id));
    if (raw) {
      const validExercises = new Set(session.exercises.map((exercise) => exercise.id));
      const validSets = new Set(session.exercises.flatMap((exercise) => exercise.sets.map((set) => set.id)));
      const restored = restoreRestTimer(JSON.parse(raw), validSets, validExercises);
      if (restored) return restored;
      localStorage.removeItem(restStorageKey(session.id));
    }
  } catch {
    localStorage.removeItem(restStorageKey(session.id));
  }

  const orderedSets = session.exercises.flatMap((exercise) => exercise.sets.map((set) => ({ exercise, set })));
  const sourceIndex = orderedSets.findLastIndex(({ set }) =>
    set.completed
    && Boolean(set.completed_at)
    && Number(set.target_rest_seconds ?? 0) > 0
    && set.actual_rest_seconds === null);
  if (sourceIndex < 0) return null;

  const source = orderedSets[sourceIndex];
  const next = orderedSets.slice(sourceIndex + 1).find(({ set }) => !set.completed && !set.skipped_at);
  const startedAtMs = Date.parse(source.set.completed_at ?? "");
  const targetSeconds = Number(source.set.target_rest_seconds ?? 0);
  if (!next || !Number.isFinite(startedAtMs) || targetSeconds <= 0) return null;

  const changesExercise = next.exercise.id !== source.exercise.id;
  const remainingSeconds = getRemainingSeconds(startedAtMs + targetSeconds * 1000);
  const recovered: ActiveRest = {
    sourceExerciseId: source.exercise.id,
    sourceSetId: source.set.id,
    nextSetId: next.set.id,
    kind: changesExercise ? "between_exercises" : "between_sets",
    label: changesExercise ? "Descanso entre exercícios" : "Descanso entre séries",
    nextLabel: `${next.exercise.exercise_name} · ${next.set.is_warmup ? `aquecimento ${next.set.set_number}` : `série ${next.set.set_number}`}`,
    targetSeconds,
    startedAtMs,
    endsAtMs: startedAtMs + targetSeconds * 1000,
    remainingSeconds,
    paused: session.status === "paused",
    ready: remainingSeconds === 0,
  };
  persistRestTimer(session.id, recovered);
  return recovered;
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
  const [validationMessage, setValidationMessage] = useState("");
  const completing = useRef(false);

  useEffect(() => {
    setLoadKg(set.load_kg?.toString() ?? "");
  }, [set.load_kg]);

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

  async function completeDraft() {
    const nextDraft = draft();
    if (nextDraft.actual_reps === null || nextDraft.actual_reps < 1) {
      setValidationMessage("Informe as repetições realizadas.");
      return;
    }
    if (nextDraft.load_kg === null || nextDraft.load_kg < 0) {
      setValidationMessage("Informe a carga. Para peso corporal, digite 0 kg.");
      return;
    }
    setValidationMessage("");
    unlockRestAudio();
    await onComplete(nextDraft);
  }

  return <div id={`workout-set-${set.id}`} className={`set-row ${set.is_warmup ? "set-row--warmup" : ""} ${set.completed ? "set-row--done" : ""} ${set.skipped_at ? "set-row--skipped" : ""}`}>
    <div className="set-row__header">
      <strong>{set.is_warmup ? `Aquecimento ${set.set_number}` : `Série ${set.set_number}`}{set.is_extra && <small>extra</small>}{set.is_warmup && <small>preparatória</small>}{set.skipped_at && <small>não realizada</small>}</strong>
      <div>
        {set.is_extra && !set.completed && !set.skipped_at && <button className="set-row__remove" type="button" onClick={() => void onRemove(set)}>Excluir</button>}
        <button type="button" disabled={Boolean(set.skipped_at)} onPointerDown={() => { completing.current = true; }} onClick={async () => {
          await completeDraft();
          completing.current = false;
        }}>{set.completed ? "✓ Feita" : set.skipped_at ? "Não realizada" : "Concluir"}</button>
      </div>
    </div>
    <div className="set-row__fields">
      <label>Reps<input aria-label={`Repetições da série ${set.set_number}`} aria-invalid={validationMessage.includes("repetições")} disabled={Boolean(set.skipped_at)} min="1" inputMode="numeric" type="number" value={actualReps} onChange={(event) => { setActualReps(event.target.value); setValidationMessage(""); }} onBlur={() => void saveDraft()} /></label>
      <label>Kg<input aria-label={`Carga da série ${set.set_number}`} aria-invalid={validationMessage.includes("carga")} disabled={Boolean(set.skipped_at)} min="0" inputMode="decimal" type="number" step="0.5" value={loadKg} onChange={(event) => { setLoadKg(event.target.value); setValidationMessage(""); }} onBlur={() => void saveDraft()} /></label>
      {!set.is_warmup && <label>RPE automático<select aria-label={`Esforço da série ${set.set_number}`} disabled={Boolean(set.skipped_at)} value={repsInReserve} onChange={(event) => setRepsInReserve(event.target.value)} onBlur={() => void saveDraft()}>
        <option value="">Esforço</option>
        <option value="4">4+ sobrariam · RPE 6</option>
        <option value="3">3 sobrariam · RPE 7</option>
        <option value="2">2 sobrariam · RPE 8</option>
        <option value="1">1 sobraria · RPE 9</option>
        <option value="0">Nenhuma · RPE 10</option>
      </select></label>}
    </div>
    {set.previous_performance && <p className="set-row__previous">
      <span>ÚLTIMO TREINO</span>
      <strong>{set.previous_performance.loadKg.toLocaleString("pt-BR")} kg × {set.previous_performance.reps} repetições{set.previous_performance.rpe === null ? "" : ` · RPE ${set.previous_performance.rpe.toLocaleString("pt-BR")}`}</strong>
      <small>{new Date(`${set.previous_performance.date}T12:00:00`).toLocaleDateString("pt-BR")}</small>
    </p>}
    {validationMessage && <p className="set-row__validation" role="alert">{validationMessage}</p>}
  </div>;
}

export default function WorkoutSessionPage() {
  const { date = "" } = useParams();
  const [search] = useSearchParams();
  const label = search.get("label") || "Treino planejado";
  const completedWasPlanned = search.get("planned") === "1";
  const testMode = search.get("test") === "1";
  const sessionKind = testMode ? "test" : "real";
  const { user } = useAuth();
  const navigate = useNavigate();
  const cachedSession = useRef(user && date ? loadCachedWorkoutSession(user.id, date, sessionKind) : null);
  const [session, setSession] = useState<WorkoutSession | null>(cachedSession.current);
  const [message, setMessage] = useState(cachedSession.current ? "Sincronizando treino em segundo plano…" : "Carregando treino…");
  const [profileRestrictions, setProfileRestrictions] = useState<ProfileRestriction[]>(cachedSession.current?.applied_restrictions ?? []);
  const [guidanceByKey, setGuidanceByKey] = useState<Record<string, ExerciseGuidance>>({});
  const [activeRest, setActiveRest] = useState<ActiveRest | null>(() => cachedSession.current ? loadPersistedRest(cachedSession.current) : null);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem("evoai-rest-sound") !== "off");
  const [addingExerciseId, setAddingExerciseId] = useState<string | null>(null);
  const [changingWarmup, setChangingWarmup] = useState(false);
  const [showFinishConfirmation, setShowFinishConfirmation] = useState(false);
  const [skipReason, setSkipReason] = useState("Treino encerrado antes do planejado");
  const [finishing, setFinishing] = useState(false);
  const [checkout, setCheckout] = useState<WorkoutCheckout>({
    sessionRpe: cachedSession.current?.session_rpe ?? 8,
    sessionQuality: cachedSession.current?.session_quality ?? 4,
    discomfort: Boolean(cachedSession.current?.post_workout_discomfort),
  });
  const restWasFinalized = useRef(false);
  const hydratedRestSessionId = useRef<string | null>(cachedSession.current?.id ?? null);

  useEffect(() => {
    if (!user || !date) return;
    void startOrLoadWorkout(user.id, date, label, sessionKind)
      .then((data) => {
        const restoredRest = loadPersistedRest(data);
        hydratedRestSessionId.current = data.id;
        saveCachedWorkoutSession(user.id, date, sessionKind, data);
        setSession(data);
        setActiveRest(restoredRest);
        setProfileRestrictions(data.applied_restrictions);
        setCheckout({
          sessionRpe: data.session_rpe ?? 8,
          sessionQuality: data.session_quality ?? 4,
          discomfort: Boolean(data.post_workout_discomfort),
        });
        setMessage("");
      })
      .catch((error) => setMessage(session
        ? "Treino restaurado neste aparelho. A sincronização será retomada quando a conexão responder."
        : error instanceof Error && error.message.startsWith("PROFILE_RESTRICTION_BLOCKS_PLAN")
        ? "As restrições do perfil bloqueiam um exercício sem substituto seguro. Revise o perfil antes de iniciar."
        : error instanceof Error && error.message === "MULTIPLE_ACTIVE_LINKED_PROFILES"
          ? "Há mais de um perfil ativo ligado à sua conta. Selecione ou desative um perfil antes de planejar o treino."
          : "Não foi possível abrir o treino. Verifique a conexão e a migração do banco."));
  }, [date, label, sessionKind, user]);

  useEffect(() => {
    if (!session || !user || !date) return;
    saveCachedWorkoutSession(user.id, date, sessionKind, session);
  }, [date, session, sessionKind, user]);

  useEffect(() => {
    if (!session || hydratedRestSessionId.current !== session.id) return;
    persistRestTimer(session.id, activeRest);
  }, [
    session?.id,
    activeRest?.endsAtMs,
    activeRest?.paused,
    activeRest?.ready,
    activeRest?.sourceSetId,
  ]);

  const exerciseKeys = useMemo(() => (session?.exercises ?? []).filter(Boolean).map((exercise) => exercise.exercise_key).join("|"), [session]);
  useEffect(() => {
    const keys = exerciseKeys.split("|").filter(Boolean);
    if (!keys.length) { setGuidanceByKey({}); return; }
    void loadExerciseGuidance(keys)
      .then(setGuidanceByKey)
      .catch(() => setGuidanceByKey({}));
  }, [exerciseKeys]);

  const allSets = useMemo(() => (session?.exercises ?? []).filter(Boolean).flatMap((exercise) => exercise.sets.map((set) => ({ exercise, set }))) ?? [], [session]);
  const workingSets = allSets.filter((item) => !item.set.is_warmup);
  const pendingSets = workingSets.filter((item) => !item.set.completed && !item.set.skipped_at);
  const next = allSets.find((item) => !item.set.completed && !item.set.skipped_at);
  const completed = workingSets.filter((item) => item.set.completed).length;
  const pendingExercises = useMemo(() => (session?.exercises ?? []).filter(Boolean).map((exercise) => ({
    exercise,
    sets: exercise.sets.filter((set) => !set.is_warmup && !set.completed && !set.skipped_at),
  })).filter((item) => item.sets.length > 0), [session]);

  useEffect(() => {
    if (!activeRest || activeRest.paused || activeRest.ready) return;
    const tick = () => {
      const remainingSeconds = getRemainingSeconds(activeRest.endsAtMs);
      if (remainingSeconds > 0) {
        setActiveRest((current) => {
          if (!current) return current;
          const updated = { ...current, remainingSeconds };
          if (session) persistRestTimer(session.id, updated);
          return updated;
        });
        return;
      }
      setActiveRest((current) => {
        if (!current) return current;
        const updated = { ...current, remainingSeconds: 0, ready: true };
        if (session) persistRestTimer(session.id, updated);
        return updated;
      });
      if (!restWasFinalized.current) {
        restWasFinalized.current = true;
        void recordActualRest(activeRest.targetSeconds);
        signalRestFinished();
      }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [activeRest?.endsAtMs, activeRest?.paused, activeRest?.ready, session?.id, soundEnabled]);

  useEffect(() => {
    const refreshAfterResume = () => {
      if (document.visibilityState === "hidden") return;
      setActiveRest((current) => {
        if (!current || current.paused) return current;
        const remainingSeconds = getRemainingSeconds(current.endsAtMs);
        const updated = { ...current, remainingSeconds, ready: remainingSeconds === 0 };
        if (session) persistRestTimer(session.id, updated);
        return updated;
      });
    };
    document.addEventListener("visibilitychange", refreshAfterResume);
    window.addEventListener("pageshow", refreshAfterResume);
    return () => {
      document.removeEventListener("visibilitychange", refreshAfterResume);
      window.removeEventListener("pageshow", refreshAfterResume);
    };
  }, [session?.id]);

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

  function goToSet(setId: string) {
    if (session) persistRestTimer(session.id, null);
    setActiveRest(null);
    const target = document.getElementById(`workout-set-${setId}`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.querySelector<HTMLInputElement | HTMLSelectElement>("input:not(:disabled), select:not(:disabled)")?.focus({ preventScroll: true });
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
    const nextRest: ActiveRest = {
      sourceExerciseId: exercise.id,
      sourceSetId: set.id,
      nextSetId: nextItem.set.id,
      kind: prescription.kind,
      label: prescription.label,
      nextLabel: `${nextItem.exercise.exercise_name} · ${nextItem.set.is_warmup ? `aquecimento ${nextItem.set.set_number}` : `série ${nextItem.set.set_number}`}`,
      targetSeconds: prescription.seconds,
      startedAtMs,
      endsAtMs: startedAtMs + prescription.seconds * 1000,
      remainingSeconds: prescription.seconds,
      paused: false,
      ready: false,
    };
    persistRestTimer(session.id, nextRest);
    setActiveRest(nextRest);
    return prescription.seconds;
  }

  function adjustRest(deltaSeconds: number) {
    setActiveRest((current) => {
      if (!current || current.ready) return current;
      const targetSeconds = Math.max(30, Math.min(600, current.targetSeconds + deltaSeconds));
      const updated = {
        ...current,
        targetSeconds,
        endsAtMs: current.endsAtMs + (targetSeconds - current.targetSeconds) * 1000,
        remainingSeconds: Math.max(0, current.remainingSeconds + (targetSeconds - current.targetSeconds)),
      };
      if (session) persistRestTimer(session.id, updated);
      return updated;
    });
  }

  async function skipRest() {
    if (!activeRest) return;
    const actualSeconds = Math.max(0, Math.round((Date.now() - activeRest.startedAtMs) / 1000));
    restWasFinalized.current = true;
    await recordActualRest(actualSeconds);
    if (session) persistRestTimer(session.id, null);
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
      const updated = status === "paused"
        ? { ...current, paused: true, remainingSeconds: getRemainingSeconds(current.endsAtMs) }
        : { ...current, paused: false, endsAtMs: Date.now() + current.remainingSeconds * 1000 };
      persistRestTimer(session.id, updated);
      return updated;
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

  async function toggleWarmup(exercise: ExerciseLog) {
    const existing = exercise.sets.filter((set) => set.is_warmup);
    setChangingWarmup(true);
    try {
      if (existing.length) {
        await removeWarmupSets(exercise);
        setSession((current) => current ? {
          ...current,
          exercises: current.exercises.map((item) => item.id === exercise.id
            ? { ...item, sets: item.sets.filter((set) => !set.is_warmup) }
            : item),
        } : current);
        setMessage("Aquecimento removido.");
        return;
      }
      let workingLoad = exercise.recommendation.loadKg;
      if (workingLoad <= 0) {
        const answer = window.prompt("Qual carga de trabalho você pretende usar neste exercício (kg)?", "");
        workingLoad = Number(answer?.replace(",", ".") ?? 0);
      }
      const warmups = await addWarmupSets(exercise, workingLoad);
      setSession((current) => current ? {
        ...current,
        exercises: current.exercises.map((item) => item.id === exercise.id
          ? { ...item, sets: [...warmups, ...item.sets] }
          : item),
      } : current);
      setMessage(`Aquecimento criado com 50% e 70% da carga de trabalho de ${workingLoad.toLocaleString("pt-BR")} kg.`);
    } catch (error) {
      setMessage(error instanceof Error && error.message === "WORKING_LOAD_REQUIRED"
        ? "Informe uma carga de trabalho maior que zero para gerar o aquecimento."
        : error instanceof Error && error.message === "WARMUP_ALREADY_STARTED"
          ? "O aquecimento iniciado não pode ser removido."
          : "Não foi possível alterar o aquecimento.");
    } finally {
      setChangingWarmup(false);
    }
  }

  async function applyRecommendedLoad(exercise: ExerciseLog) {
    const suggestedLoad = exercise.recommendation.loadKg;
    if (suggestedLoad <= 0) return;
    const applicableSets = exercise.sets.filter((set) =>
      set.load_kg === null && !set.completed && !set.skipped_at
    );
    if (!applicableSets.length) {
      setMessage("As séries deste exercício já possuem carga. Nenhum valor foi sobrescrito.");
      return;
    }
    const updatedSets = applicableSets.map((set) => ({ ...set, load_kg: suggestedLoad }));
    setSession((current) => current ? {
      ...current,
      exercises: current.exercises.map((item) => item.id === exercise.id
        ? { ...item, sets: item.sets.map((set) => updatedSets.find((updated) => updated.id === set.id) ?? set) }
        : item),
    } : current);
    const results = await Promise.allSettled(updatedSets.map(persistSet));
    const failed = results.filter((result) => result.status === "rejected").length;
    setMessage(failed
      ? "A sugestão foi preenchida na tela, mas parte da sincronização ficou pendente."
      : `${suggestedLoad.toLocaleString("pt-BR")} kg aplicados somente às séries vazias de ${exercise.exercise_name}.`);
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

  async function completeNavigation() {
    if (!session || !user) return;
    persistRestTimer(session.id, null);
    clearCachedWorkoutSession(user.id, date, sessionKind);
    setActiveRest(null);
    if (testMode) {
      navigate("/admin/testes");
      return;
    }
    await queueCalendarMutation(user.id, date, {
      date, available: completedWasPlanned, completed: true, completedWasPlanned,
      completedLabel: session.workout_label,
    });
    navigate("/app");
  }

  async function finish() {
    if (!session || !user) return;
    if (pendingSets.length > 0) {
      if (completed === 0) {
        setMessage("Nenhuma série foi realizada. Registre ao menos uma série ou volte ao calendário para cancelar o treino.");
        return;
      }
      setShowFinishConfirmation(true);
      return;
    }
    setFinishing(true);
    setMessage("");
    try {
      await updateSession(session.id, "completed", session.notes, checkout);
      await completeNavigation();
    } catch {
      setMessage("Não foi possível finalizar o treino.");
    } finally {
      setFinishing(false);
    }
  }

  async function confirmFinishWithPending() {
    if (!session) return;
    setFinishing(true);
    setMessage("");
    try {
      const skippedCount = await finishWorkoutWithPending(session.id, session.notes, skipReason, checkout);
      setShowFinishConfirmation(false);
      setMessage(`${skippedCount} série${skippedCount === 1 ? "" : "s"} registrada${skippedCount === 1 ? "" : "s"} como não realizada${skippedCount === 1 ? "" : "s"}.`);
      await completeNavigation();
    } catch {
      setMessage("Não foi possível finalizar com pendências. O treino continua aberto.");
      setShowFinishConfirmation(false);
    } finally {
      setFinishing(false);
    }
  }

  if (!session) return <main className="centered-screen"><span className="spinner" /><p>{message}</p></main>;

  return <div className="workout-shell">
    <header className="workout-header"><button onClick={() => navigate(testMode ? "/admin/testes" : "/app")}>← {testMode ? "Laboratório" : "Calendário"}</button><div><small>{testMode ? "SIMULAÇÃO · sem impacto no histórico real" : date}</small><h1>{session.workout_label}</h1></div><button onClick={togglePause}>{session.status === "paused" ? "Retomar" : "Pausar"}</button></header>
    <div className="workout-progress"><strong>{completed}/{workingSets.length} séries válidas</strong><span><i style={{ width: `${workingSets.length ? completed / workingSets.length * 100 : 0}%` }} /></span></div>
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
      {activeRest.ready && <button className="rest-timer__continue" onClick={() => goToSet(activeRest.nextSetId)}>Ir para próxima série</button>}
      {activeRest.paused && <em>Relógio pausado junto com o treino</em>}
    </aside>}
    {next && !activeRest && <aside className="next-set">
      <div><span>PRÓXIMA SÉRIE</span><strong>{next.exercise.exercise_name} · {next.set.is_warmup ? `aquecimento ${next.set.set_number}` : `série ${next.set.set_number}`}</strong><small>{next.set.target_reps_min}–{next.set.target_reps_max} repetições</small></div>
      <button type="button" onClick={() => goToSet(next.set.id)}>Ir para série</button>
    </aside>}
    <main className="exercise-list">
      {session.profile_name && <p className="profile-context"><strong>Perfil: {session.profile_name}</strong><span>{session.applied_restrictions.length ? `Restrições aplicadas: ${restrictionText(session.applied_restrictions) || "somente informativas"}` : "Nenhuma restrição ativa"}</span></p>}
      <p className="template-notice">Recomendações determinísticas: o mesmo histórico sempre produz a mesma orientação, com justificativa visível.</p>
      {(session.exercises ?? []).filter(Boolean).map((exercise) => {
        const guidance = guidanceByKey[exercise.exercise_key ?? ""];
        const hasGuidance = Boolean(guidance && (guidance.instructions || guidance.cautions.length || guidance.equipmentVariants.length || guidance.mediaUrl));
        const personalRecord = session.session_kind === "real" ? evaluatePersonalRecord(exercise.personalBest, exercise.sets) : null;
        const isWarmupExercise = exercise.position === 1;
        const hasWarmup = exercise.sets.some((set) => set.is_warmup);
        return <section className="exercise-card" key={exercise.id}><div className="exercise-title"><h2>{exercise.position}. {exercise.exercise_name}</h2><button onClick={() => void replaceExercise(exercise)}>Substituir</button></div>
        {exercise.original_exercise_key && <p className="substitution-note">Substituição registrada · motivo: {exercise.substitution_reason}</p>}
        {hasGuidance && <details className="exercise-guidance"><summary>Como executar com segurança</summary>
          {guidance.instructions && <p>{guidance.instructions}</p>}
          {guidance.cautions.length > 0 && <div><strong>Pontos de atenção</strong><ul>{guidance.cautions.map((caution) => <li key={caution}>{caution}</li>)}</ul></div>}
          {guidance.equipmentVariants.length > 0 && <p><strong>Variações de equipamento:</strong> {guidance.equipmentVariants.join(", ")}</p>}
          {guidance.mediaUrl && <a href={guidance.mediaUrl} target="_blank" rel="noreferrer">Abrir demonstração técnica ↗</a>}
        </details>}
        <div className={`progression progression--${exercise.recommendation.action}`}>
          <div>
            <small>{exercise.recommendation.action === "increase" ? "AUMENTAR CARGA" : exercise.recommendation.action === "reduce" ? "REDUZIR CARGA" : "MANTER CARGA"}</small>
            <strong>{exercise.recommendation.loadKg > 0 ? `${exercise.recommendation.loadKg.toLocaleString("pt-BR")} kg sugeridos` : "Defina a carga inicial"}</strong>
            <span>{exercise.recommendation.reason}</span>
            {exercise.recommendation.evidence?.length ? <ul>{exercise.recommendation.evidence.map((item) => <li key={item}>{item}</li>)}</ul> : null}
          </div>
          {exercise.recommendation.loadKg > 0 && <button type="button" onClick={() => void applyRecommendedLoad(exercise)}>Aplicar às séries vazias</button>}
        </div>
        {personalRecord?.achieved && <div className="personal-record-banner" role="status">
          <span>RECORDE PESSOAL</span>
          <strong>{personalRecord.title}</strong>
          <small>{personalRecord.message}</small>
        </div>}
        {isWarmupExercise && <div className="warmup-control">
          <div><small>AQUECIMENTO ESTRUTURADO</small><strong>{hasWarmup ? "Séries preparatórias incluídas" : "Prepare o movimento antes das séries válidas"}</strong><span>50% × 10 e 70% × 5 da carga de trabalho. Não entram no volume nem nos recordes.</span></div>
          <button type="button" disabled={changingWarmup || exercise.sets.some((set) => Boolean(set.is_warmup && set.completed))} onClick={() => void toggleWarmup(exercise)}>
            {changingWarmup ? "Aguarde…" : hasWarmup ? "Remover aquecimento" : "+ Adicionar aquecimento"}
          </button>
        </div>}
        {exercise.sets.map((set) => <SetEntryRow key={set.id} set={set}
          onSave={async (draft) => { changeSet(exercise.id, set.id, draft); await persistSet(draft); }}
          onRemove={(draft) => deleteExtraSet(exercise.id, draft)}
          onComplete={async (draft) => {
            const completedNow = !set.completed;
            const targetRestSeconds = completedNow ? startRestAfter(exercise, draft) ?? null : null;
            const updated = { ...draft, completed: completedNow, target_rest_seconds: targetRestSeconds, actual_rest_seconds: completedNow ? set.actual_rest_seconds : null };
            if (!completedNow && activeRest?.sourceSetId === set.id) {
              persistRestTimer(session.id, null);
              setActiveRest(null);
            }
            changeSet(exercise.id, set.id, updated);
            await persistSet(updated);
          }}
        />)}
        <button className="add-extra-set" type="button" disabled={addingExerciseId === exercise.id} onClick={() => void appendExtraSet(exercise)}>
          {addingExerciseId === exercise.id ? "Adicionando…" : "+ Adicionar série"}
        </button>
      </section>;
      })}
      <section className="workout-checkout" aria-labelledby="workout-checkout-title">
        <div><small>CHECK-OUT DA SESSÃO</small><h2 id="workout-checkout-title">Como foi o treino?</h2><p>Leva poucos segundos e melhora a leitura de recuperação dos próximos dias.</p></div>
        <div className="workout-checkout__fields">
          <label>Esforço geral<select aria-label="Esforço geral do treino" value={checkout.sessionRpe} onChange={(event) => setCheckout((current) => ({ ...current, sessionRpe: Number(event.target.value) }))}>
            <option value="6">RPE 6 · Leve</option><option value="7">RPE 7 · Moderado</option><option value="8">RPE 8 · Desafiador</option><option value="9">RPE 9 · Muito difícil</option><option value="10">RPE 10 · Máximo</option>
          </select></label>
          <label>Qualidade da sessão<select aria-label="Qualidade da sessão" value={checkout.sessionQuality} onChange={(event) => setCheckout((current) => ({ ...current, sessionQuality: Number(event.target.value) }))}>
            <option value="1">1 · Muito ruim</option><option value="2">2 · Ruim</option><option value="3">3 · Regular</option><option value="4">4 · Boa</option><option value="5">5 · Excelente</option>
          </select></label>
          <label className="workout-checkout__check"><input type="checkbox" checked={checkout.discomfort} onChange={(event) => setCheckout((current) => ({ ...current, discomfort: event.target.checked }))} /> Senti desconforto incomum</label>
        </div>
      </section>
      <label className="session-notes">Observações do treino<textarea value={session.notes} onChange={(event) => setSession({ ...session, notes: event.target.value })} /></label>
      {message && <p className="workout-message">{message}</p>}
      <button className="finish-workout" disabled={finishing} onClick={finish}>{finishing ? "Finalizando…" : testMode ? "Finalizar teste" : "Finalizar treino"}</button>
    </main>
    {showFinishConfirmation && <div className="confirmation-backdrop" role="presentation">
      <section className="confirmation-dialog finish-pending-dialog" role="dialog" aria-modal="true" aria-labelledby="finish-pending-title">
        <span className="setup-status setup-status--locked">EXISTEM SÉRIES PENDENTES</span>
        <h2 id="finish-pending-title">Finalizar mesmo assim?</h2>
        <p>Você concluiu <strong>{completed}</strong> de <strong>{workingSets.length}</strong> séries válidas. As demais serão registradas como não realizadas.</p>
        <ul>{pendingExercises.map(({ exercise, sets }) => <li key={exercise.id}><strong>{exercise.exercise_name}</strong><span>Séries {sets.map((set) => set.set_number).join(", ")}</span></li>)}</ul>
        <label>Motivo<select value={skipReason} onChange={(event) => setSkipReason(event.target.value)}>
          <option>Treino encerrado antes do planejado</option>
          <option>Falta de tempo</option>
          <option>Aparelho indisponível</option>
          <option>Desconforto durante o treino</option>
          <option>Outro motivo</option>
        </select></label>
        <div className="finish-pending-dialog__actions">
          <button type="button" disabled={finishing} onClick={() => setShowFinishConfirmation(false)}>Voltar e continuar</button>
          <button className="danger-action" type="button" disabled={finishing} onClick={() => void confirmFinishWithPending()}>{finishing ? "Finalizando…" : "Finalizar com pendências"}</button>
        </div>
      </section>
    </div>}
  </div>;
}
